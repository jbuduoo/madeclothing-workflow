const SPREADSHEET_ID = "1STifCM-57krjuGMiN2lGRY_pcw8ivUhMbBuubUXFpNM";
const SHEETS = {
  orders: "Key單",
  accounts: "Account",
  history: "完成記錄",
};

const ORDER_COLUMNS = {
  id: 1,
  image: 2,
  customer: 4,
  orderDate: 5,
  deliveryDate: 6,
  completionTime: 7,
  amount: 8,
  tax: 9,
  balance: 10,
};

const STEP_NAMES = ["叫布", "裁布", "物料", "拆", "車工", "釦子", "整燙", "清點+裝箱", "大陸製作", "發票"];
const VENDOR_NAMES = ["昇華", "轉印", "網版", "繡花", "訂單"];

function doGet() {
  return jsonOutput({ ok: true, service: "MadeClothing Apps Script API" });
}

function doPost(e) {
  try {
    const request = parseRequest(e);
    const result = routeRequest(request.method, request.path, request.body || {});
    return jsonOutput(result);
  } catch (error) {
    return jsonOutput({ success: false, message: error.message || String(error) });
  }
}

function parseRequest(e) {
  const text = e?.postData?.contents || "{}";
  return JSON.parse(text);
}

function jsonOutput(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function sheet(name) {
  const target = ss().getSheetByName(name);
  if (!target) throw new Error(`找不到工作表：${name}`);
  return target;
}

function routeRequest(method, path, body) {
  if (method === "POST" && path === "/login") return login(body);
  if (method === "GET" && path === "/dashboard-data") return dashboardData();
  if (method === "POST" && path === "/orders") return createOrder(body);
  if (method === "POST" && path === "/update-workflow-step") return updateWorkflowStep(body);

  let match = path.match(/^\/orders\/(.+)$/);
  if (match && method === "GET") return getOrder(match[1]);
  if (match && method === "PUT") return updateOrder(match[1], body);

  match = path.match(/^\/get-workflow-steps\/(.+)$/);
  if (match && method === "GET") return getWorkflowSteps(match[1]);

  match = path.match(/^\/get-completed-records\/(.+)$/);
  if (match && method === "GET") return getCompletedRecords(match[1]);

  throw new Error(`不支援的 API：${method} ${path}`);
}

function login(input) {
  const rows = sheet(SHEETS.accounts).getDataRange().getDisplayValues();
  const username = String(input.username || "").trim();
  const password = String(input.password || "").trim();
  const found = rows.slice(1).find((row) => String(row[0]).trim() === username && String(row[1]).trim() === password);
  if (!found) return { success: false, message: "帳號或密碼錯誤" };
  return { success: true, user: { username: found[0], displayName: found[2] || found[0] } };
}

function dashboardData() {
  return { success: true, data: readOrders().map((item) => item.order) };
}

function getOrder(id) {
  const found = findOrder(id);
  if (!found) return { success: false, message: "order not found" };
  return { success: true, order: found.order };
}

function createOrder(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const orderDate = input.orderDate || Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy-MM-dd");
    const id = input.id || nextOrderId();
    if (findOrder(id)) return { success: false, message: "order id already exists" };

    const order = makeOrder({ ...input, id, orderDate });
    const ws = sheet(SHEETS.orders);
    ws.insertRowAfter(1);
    ws.getRange(2, 1, 1, 25).setValues([orderToRow(order)]);
    return { success: true, order };
  } finally {
    lock.releaseLock();
  }
}

function updateOrder(id, input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = findOrder(id);
    if (!found) return { success: false, message: "order not found" };
    const row = found.row;
    const ws = sheet(SHEETS.orders);
    ws.getRange(row, ORDER_COLUMNS.customer).setValue(input.customer || "");
    ws.getRange(row, ORDER_COLUMNS.orderDate).setValue(formatDateForSheet(input.orderDate));
    ws.getRange(row, ORDER_COLUMNS.deliveryDate).setValue(formatDateForSheet(input.deliveryDate));
    ws.getRange(row, ORDER_COLUMNS.image).setValue(input.image || "");
    ws.getRange(row, ORDER_COLUMNS.amount).setValue(numberValue(input.amount));
    ws.getRange(row, ORDER_COLUMNS.tax).setValue(numberValue(input.tax));
    ws.getRange(row, ORDER_COLUMNS.balance).setValue(numberValue(input.balance));
    return getOrder(id);
  } finally {
    lock.releaseLock();
  }
}

function getWorkflowSteps(id) {
  const found = findOrder(id);
  if (!found) return { success: false, message: "order not found" };
  return { success: true, customerName: found.order.customer, workflowSteps: found.order.steps };
}

function getCompletedRecords(id) {
  const ws = sheet(SHEETS.history);
  const matches = findRowsByFirstColumn(ws, id);
  const logs = matches.map((rowNumber) => {
    const row = ws.getRange(rowNumber, 1, 1, 6).getDisplayValues()[0];
    return {
      timestamp: row[1] || "",
      item: row[2] || "",
      user: row[3] || "",
      feedback: row[4] || "",
      isfinish: row[5] || "",
    };
  });
  return { success: true, historyLogs: logs };
}

function updateWorkflowStep(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = findOrder(input.orderId);
    if (!found) return { success: false, message: "order not found" };
    const stepIndex = STEP_NAMES.indexOf(input.stepName);
    const vendorIndex = VENDOR_NAMES.indexOf(input.stepName);
    const stepColumnIndex = stepIndex >= 0 ? 11 + stepIndex : vendorIndex >= 0 ? 21 + vendorIndex : 0;
    if (!stepColumnIndex) return { success: false, message: "workflow step not found" };

    const ws = sheet(SHEETS.orders);
    ws.getRange(found.row, stepColumnIndex).setValue(input.completed ? "Y" : "");

    const timestamp = Utilities.formatDate(new Date(), "Asia/Taipei", "yyyy/MM/dd HH:mm:ss");
    const historyLog = {
      timestamp,
      item: input.stepName,
      user: input.user || "",
      feedback: input.feedback || "",
      isfinish: input.isfinish || "",
    };
    sheet(SHEETS.history).appendRow([
      input.orderId,
      historyLog.timestamp,
      historyLog.item,
      historyLog.user,
      historyLog.feedback,
      historyLog.isfinish,
    ]);

    const updatedStepValues = ws.getRange(found.row, 11, 1, STEP_NAMES.length).getDisplayValues()[0];
    const allStepsCompleted = updatedStepValues.every((value) => String(value).trim().toUpperCase() === "Y");
    if (allStepsCompleted && !found.order.completionTime) {
      ws.getRange(found.row, ORDER_COLUMNS.completionTime).setValue(timestamp);
    }
    const updatedRow = ws.getRange(found.row, 1, 1, 25).getDisplayValues()[0];
    return { success: true, order: rowToOrder(updatedRow), historyLog };
  } finally {
    lock.releaseLock();
  }
}

function readOrders() {
  const ws = sheet(SHEETS.orders);
  const lastRow = ws.getLastRow();
  if (lastRow < 2) return [];
  const values = ws.getRange(2, 1, lastRow - 1, 25).getDisplayValues();
  return values
    .map((row, index) => ({ row: index + 2, order: rowToOrder(row) }))
    .filter((item) => item.order.id && item.order.customer);
}

function findOrder(id) {
  const ws = sheet(SHEETS.orders);
  const row = findFirstRowByFirstColumn(ws, id);
  if (!row || row < 2) return null;
  const values = ws.getRange(row, 1, 1, 25).getDisplayValues()[0];
  return { row, order: rowToOrder(values) };
}

function findFirstRowByFirstColumn(ws, value) {
  const lastRow = ws.getLastRow();
  if (lastRow < 2) return null;
  const match = ws
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function findRowsByFirstColumn(ws, value) {
  const lastRow = ws.getLastRow();
  if (lastRow < 2) return [];
  return ws
    .getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(String(value))
    .matchEntireCell(true)
    .findAll()
    .map((range) => range.getRow());
}

function nextOrderId() {
  const ws = sheet(SHEETS.orders);
  const lastRow = ws.getLastRow();
  if (lastRow < 2) return "A00001";
  const ids = ws.getRange(2, 1, lastRow - 1, 1).getDisplayValues().flat();
  const maxNumber = ids.reduce((max, id) => {
    const match = String(id || "").trim().match(/^A(\d{5})$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `A${String(maxNumber + 1).padStart(5, "0")}`;
}

function rowToOrder(row) {
  return {
    id: row[0] || "",
    customer: row[3] || "",
    orderDate: normalizeDate(row[4]),
    deliveryDate: normalizeDate(row[5]),
    urgent: Boolean(row[5]),
    completionTime: row[6] || "",
    image: normalizeImage(row[1]),
    steps: STEP_NAMES.map((name, index) => ({ name, completed: String(row[10 + index]).trim().toUpperCase() === "Y" })),
    vendors: VENDOR_NAMES.map((name, index) => ({ name, active: String(row[20 + index]).trim().toUpperCase() === "Y" })),
    amount: numberValue(row[7]),
    tax: numberValue(row[8]),
    balance: numberValue(row[9]),
  };
}

function makeOrder(input) {
  return {
    id: input.id,
    customer: input.customer || "未命名客戶",
    orderDate: normalizeDate(input.orderDate),
    deliveryDate: normalizeDate(input.deliveryDate),
    urgent: Boolean(input.urgent),
    completionTime: input.completionTime || "",
    image: input.image || "",
    steps: STEP_NAMES.map((name) => ({ name, completed: false })),
    vendors: VENDOR_NAMES.map((name) => ({ name, active: false })),
    amount: numberValue(input.amount),
    tax: numberValue(input.tax),
    balance: numberValue(input.balance),
  };
}

function orderToRow(order) {
  return [
    order.id,
    order.image,
    "",
    order.customer,
    formatDateForSheet(order.orderDate),
    formatDateForSheet(order.deliveryDate),
    order.completionTime,
    order.amount,
    order.tax,
    order.balance,
    ...order.steps.map((step) => (step.completed ? "Y" : "")),
    ...order.vendors.map((vendor) => (vendor.active ? "Y" : "")),
  ];
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d{8}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  return text.replaceAll("/", "-").split(" ")[0];
}

function formatDateForSheet(value) {
  return String(value || "").replaceAll("-", "");
}

function numberValue(value) {
  const number = Number(String(value || "").replaceAll(",", ""));
  return Number.isFinite(number) ? number : 0;
}

function normalizeImage(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const fileMatch = text.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1000`;
  const idMatch = text.match(/[?&]id=([^&]+)/);
  if (text.includes("drive.google.com") && idMatch) return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
  return text;
}
