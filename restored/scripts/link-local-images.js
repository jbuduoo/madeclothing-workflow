import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/wits/Documents/程式專區/男人幫/WEB(APP) 後臺示意圖";
const dbPath = path.resolve("restored/backend/data/db.json");
const publicDir = path.resolve("restored/frontend/public/order-images");
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const imageFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) imageFiles.push({ name: entry.name, fullPath });
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/複本\s*\d*/g, "")
    .replace(/客戶|留存|追加|確認|已確認款|製令工單|電腦版|輸出|最終版|打樣|修改字|外框|已確認|款/g, "")
    .replace(/[\s_\-()（）+.,，/\\]/g, "");
}

function compactDate(value) {
  return String(value || "").replaceAll("-", "");
}

function scoreMatch(order, file) {
  const fileName = normalizeText(file.name.replace(/\.[^.]+$/, ""));
  const customer = normalizeText(order.customer);
  const date = compactDate(order.orderDate);
  let score = 0;

  if (date && file.name.includes(date)) score += 80;
  if (customer && fileName.includes(customer)) {
    score += 70;
  } else if (customer.length >= 2) {
    for (let length = Math.min(customer.length, 8); length >= 2; length -= 1) {
      let found = false;
      for (let start = 0; start <= customer.length - length; start += 1) {
        if (fileName.includes(customer.slice(start, start + length))) {
          score += length * 8;
          found = true;
          break;
        }
      }
      if (found) break;
    }
  }

  return score;
}

function bestMatch(order, used) {
  let best = null;
  for (const file of imageFiles) {
    if (used.has(file.fullPath)) continue;
    const score = scoreMatch(order, file);
    if (!best || score > best.score) best = { ...file, score };
  }
  return best;
}

function run({ apply = false } = {}) {
  walk(root);
  fs.mkdirSync(publicDir, { recursive: true });
  const used = new Set();
  const matches = [];

  for (const order of db.orders) {
    const match = bestMatch(order, used);
    if (!match || match.score < 90) continue;
    const ext = path.extname(match.name).toLowerCase() || ".jpg";
    const targetName = `${order.id}${ext}`;
    const targetPath = path.join(publicDir, targetName);
    matches.push({
      id: order.id,
      date: order.orderDate,
      customer: order.customer,
      file: match.name,
      score: match.score,
      image: `/order-images/${targetName}`,
    });
    used.add(match.fullPath);
    if (apply) {
      fs.copyFileSync(match.fullPath, targetPath);
      order.image = `/order-images/${targetName}`;
    }
  }

  if (apply) {
    fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify({
    apply,
    files: imageFiles.length,
    matched: matches.length,
    samples: matches.slice(0, 80),
  }, null, 2));
}

run({ apply: process.argv.includes("--apply") });
