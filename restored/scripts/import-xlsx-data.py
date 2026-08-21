import json
import re
import shutil
import sys
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "backend" / "data" / "db.json"
BACKUP_DIR = ROOT / "backend" / "data" / "backups"
DEFAULT_IMAGE = "/src/assets/order-placeholder.svg"
STEPS = ["叫布", "裁布", "物料", "拆", "車工", "釦子", "整燙", "清點+裝箱", "大陸製作", "發票"]
VENDORS = ["昇華", "轉印", "網版", "繡花", "訂單"]


NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def col_index(cell_ref):
    letters = "".join(ch for ch in cell_ref if ch.isalpha())
    index = 0
    for ch in letters:
        index = index * 26 + ord(ch.upper()) - 64
    return index - 1


def normalize_date(value):
    text = str(value or "").strip()
    if not text:
        return ""
    if re.fullmatch(r"\d+(\.\d+)?([eE][+-]?\d+)?", text) and float(text) > 3000000:
        text = str(int(float(text)))
    if re.fullmatch(r"\d{8}", text):
        return f"{text[:4]}-{text[4:6]}-{text[6:8]}"
    if re.fullmatch(r"\d{4}/\d{1,2}/\d{1,2}.*", text):
        return text.split()[0].replace("/", "-")
    if re.fullmatch(r"\d+(\.\d+)?", text):
        if float(text) > 3000000:
            digits = str(int(float(text)))
            return f"{digits[:4]}-{digits[4:6]}-{digits[6:8]}" if len(digits) >= 8 else ""
        base = datetime(1899, 12, 30)
        return (base + timedelta(days=float(text))).strftime("%Y-%m-%d")
    return text


def normalize_number(value):
    text = str(value or "").strip().replace(",", "")
    if not text:
        return 0
    try:
        return int(float(text))
    except ValueError:
        return 0


def is_done(value):
    return str(value or "").strip().upper() == "Y"


def normalize_image(value):
    text = str(value or "").strip()
    if not text:
        return DEFAULT_IMAGE
    match = re.search(r"drive\.google\.com/file/d/([^/]+)", text)
    if match:
        return f"/images/drive/{match.group(1)}"
    match = re.search(r"[?&]id=([^&]+)", text)
    if "drive.google.com" in text and match:
        return f"/images/drive/{match.group(1)}"
    return text


def cell_value(cell, shared_strings):
    if cell.attrib.get("t") == "inlineStr":
        return "".join(text.text or "" for text in cell.findall(".//a:t", NS))
    node = cell.find("a:v", NS)
    value = "" if node is None else node.text or ""
    if cell.attrib.get("t") == "s" and value:
        return shared_strings[int(value)]
    return value


def read_workbook(path):
    with zipfile.ZipFile(path) as archive:
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        relmap = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels}
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root.findall("a:si", NS):
                shared_strings.append("".join(text.text or "" for text in item.findall(".//a:t", NS)))

        sheets = {}
        for sheet in workbook.findall("a:sheets/a:sheet", NS):
            name = sheet.attrib["name"]
            rel_id = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = relmap[rel_id]
            sheet_path = "xl/" + target if not target.startswith(("xl/", "/")) else target.lstrip("/")
            sheet_root = ET.fromstring(archive.read(sheet_path))
            rows = []
            for row in sheet_root.findall("a:sheetData/a:row", NS):
                values = []
                for cell in row.findall("a:c", NS):
                    idx = col_index(cell.attrib["r"])
                    while len(values) <= idx:
                        values.append("")
                    values[idx] = cell_value(cell, shared_strings)
                rows.append(values)
            sheets[name] = rows
        return sheets


def rows_by_header(rows):
    header = rows[0]
    return [dict(zip(header, row + [""] * (len(header) - len(row)))) for row in rows[1:] if any(row)]


def build_db(sheets):
    accounts = []
    for row in rows_by_header(sheets["Account"]):
        username = str(row.get(" ", "")).strip()
        if not username:
            continue
        password = str(row.get("密碼", "")).strip()
        if password.endswith(".0"):
            password = password[:-2]
        accounts.append({
            "username": username,
            "password": password,
            "displayName": str(row.get("", "") or username).strip(),
        })

    logs_by_order = {}
    for row in rows_by_header(sheets["完成記錄"]):
        order_id = str(row.get("案件編號", "")).strip()
        if not order_id:
            continue
        logs_by_order.setdefault(order_id, []).append({
            "timestamp": str(row.get("時間戳記", "")).strip(),
            "item": str(row.get("項目名稱", "")).strip(),
            "user": str(row.get("處理人員", "")).strip(),
            "feedback": str(row.get("回報事項", "")).strip(),
            "isfinish": str(row.get("是否完成", "")).strip(),
        })

    orders = []
    for row in rows_by_header(sheets["Key單"]):
        order_id = str(row.get(" ", "")).strip()
        customer = str(row.get("客戶名稱", "")).strip()
        if not order_id or not customer:
            continue
        orders.append({
            "id": order_id,
            "customer": customer,
            "orderDate": normalize_date(row.get("下單日")),
            "deliveryDate": normalize_date(row.get("急件")),
            "urgent": bool(str(row.get("急件", "")).strip()),
            "completionTime": str(row.get("完成時間", "")).strip(),
            "image": normalize_image(row.get("列表圖片連結")),
            "steps": [{"name": name, "completed": is_done(row.get(name))} for name in STEPS],
            "vendors": [{"name": name, "active": is_done(row.get(name))} for name in VENDORS],
            "amount": normalize_number(row.get("貨款金額")),
            "tax": normalize_number(row.get("稅金")),
            "balance": normalize_number(row.get("尾款")),
            "historyLogs": logs_by_order.get(order_id, []),
        })
    return {"users": accounts, "orders": orders}


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python restored/scripts/import-xlsx-data.py <xlsx-path>")
    source = Path(sys.argv[1]).resolve()
    sheets = read_workbook(source)
    db = build_db(sheets)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        stamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
        shutil.copy2(DB_PATH, BACKUP_DIR / f"db-before-xlsx-import-{stamp}.json")
    DB_PATH.write_text(json.dumps(db, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {len(db['orders'])} orders and {len(db['users'])} users from {source.name}.")


if __name__ == "__main__":
    main()
