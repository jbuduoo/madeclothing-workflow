import express from "express";
import cors from "cors";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(__dirname, "../data/db.json");
const seedPath = path.resolve(__dirname, "../data/seed.json");
const backupDir = path.resolve(__dirname, "../data/backups");
const app = express();
const port = Number(process.env.PORT || 8787);

const defaultSteps = ["\u5e03", "\u88c1", "\u6599", "\u62c6", "\u8eca", "\u91e6", "\u71d9", "\u7bb1", "\u9678", "\u7968"];
const defaultVendors = ["\u6607\u83ef", "\u8f49\u5370", "\u7db2\u7248", "\u7e61\u82b1", "\u8a02\u55ae"];
const defaultImage = "/src/assets/order-placeholder.svg";
const apiBaseUrl = `http://127.0.0.1:${port}`;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readDb() {
  return readJson(dataPath);
}

async function backupDb() {
  await fs.mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await fs.copyFile(dataPath, path.join(backupDir, `db-${stamp}.json`));
}

async function writeDb(db) {
  await backupDb();
  await fs.writeFile(dataPath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function publicImageUrl(image) {
  if (!image) return defaultImage;
  if (image.startsWith("/images/")) return `${apiBaseUrl}${image}`;
  return image;
}

function makeOrder(input) {
  const orderDate = input.orderDate || new Date().toISOString().slice(0, 10);
  const id = input.id || `${orderDate.replaceAll("-", "")}-${String(Date.now()).slice(-4)}`;
  return {
    id,
    customer: input.customer || "\u672a\u547d\u540d\u5ba2\u6236",
    orderDate,
    deliveryDate: input.deliveryDate || "",
    urgent: Boolean(input.urgent),
    completionTime: input.completionTime || "",
    image: input.image || defaultImage,
    steps: defaultSteps.map((name) => ({ name, completed: false })),
    vendors: defaultVendors.map((name) => ({ name, active: false })),
    amount: normalizeNumber(input.amount),
    tax: normalizeNumber(input.tax),
    balance: normalizeNumber(input.balance),
    historyLogs: [],
  };
}

function publicOrder(order) {
  return {
    id: order.id,
    customer: order.customer,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate,
    urgent: order.urgent,
    completionTime: order.completionTime,
    image: publicImageUrl(order.image),
    steps: order.steps,
    vendors: order.vendors,
    amount: order.amount,
    tax: order.tax,
    balance: order.balance,
  };
}

function findOrder(db, id) {
  return db.orders.find((item) => item.id === id);
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/images/drive/:fileId", async (req, res) => {
  const fileId = req.params.fileId;
  if (!/^[\w-]+$/.test(fileId)) {
    res.status(400).send("invalid image id");
    return;
  }

  try {
    const response = await fetch(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      redirect: "follow",
    });
    if (!response.ok) {
      res.status(response.status).send("image unavailable");
      return;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(bytes);
  } catch (error) {
    res.status(502).send("image fetch failed");
  }
});

app.post("/login", async (req, res) => {
  const db = await readDb();
  const { username, password } = req.body;
  const user = db.users.find((item) => item.username === username && item.password === password);
  if (!user) {
    res.status(401).json({ success: false, message: "login failed" });
    return;
  }
  res.json({ success: true, user: { username: user.username, displayName: user.displayName } });
});

app.get("/dashboard-data", async (_req, res) => {
  const db = await readDb();
  res.json({ success: true, data: db.orders.map(publicOrder) });
});

app.get("/orders/:id", async (req, res) => {
  const db = await readDb();
  const order = findOrder(db, req.params.id);
  if (!order) {
    res.status(404).json({ success: false, message: "order not found" });
    return;
  }
  res.json({ success: true, order: publicOrder(order) });
});

app.post("/orders", async (req, res) => {
  const db = await readDb();
  const order = makeOrder(req.body || {});
  if (db.orders.some((item) => item.id === order.id)) {
    res.status(409).json({ success: false, message: "order id already exists" });
    return;
  }
  db.orders.unshift(order);
  await writeDb(db);
  res.status(201).json({ success: true, order: publicOrder(order) });
});

app.put("/orders/:id", async (req, res) => {
  const db = await readDb();
  const order = findOrder(db, req.params.id);
  if (!order) {
    res.status(404).json({ success: false, message: "order not found" });
    return;
  }

  const input = req.body || {};
  order.customer = input.customer ?? order.customer;
  order.orderDate = input.orderDate ?? order.orderDate;
  order.deliveryDate = input.deliveryDate ?? order.deliveryDate;
  order.urgent = Boolean(input.urgent);
  order.image = input.image || defaultImage;
  order.amount = normalizeNumber(input.amount);
  order.tax = normalizeNumber(input.tax);
  order.balance = normalizeNumber(input.balance);

  await writeDb(db);
  res.json({ success: true, order: publicOrder(order) });
});

app.get("/get-workflow-steps/:id", async (req, res) => {
  const db = await readDb();
  const order = findOrder(db, req.params.id);
  if (!order) {
    res.status(404).json({ success: false, message: "order not found" });
    return;
  }
  res.json({ success: true, customerName: order.customer, workflowSteps: order.steps });
});

app.get("/get-completed-records/:id", async (req, res) => {
  const db = await readDb();
  const order = findOrder(db, req.params.id);
  if (!order) {
    res.status(404).json({ success: false, message: "order not found" });
    return;
  }
  res.json({ success: true, historyLogs: order.historyLogs || [] });
});

app.post("/update-workflow-step", async (req, res) => {
  const db = await readDb();
  const { orderId, stepName, completed, user, feedback, isfinish } = req.body;
  const order = findOrder(db, orderId);
  if (!order) {
    res.status(404).json({ success: false, message: "order not found" });
    return;
  }

  const step = order.steps.find((item) => item.name === stepName);
  if (!step) {
    res.status(404).json({ success: false, message: "workflow step not found" });
    return;
  }

  step.completed = Boolean(completed);
  order.historyLogs = order.historyLogs || [];
  order.historyLogs.unshift({
    timestamp: new Date().toLocaleString("zh-TW", { hour12: false }),
    item: stepName,
    user,
    feedback,
    isfinish,
  });

  if (order.steps.every((item) => item.completed) && !order.completionTime) {
    order.completionTime = new Date().toLocaleString("zh-TW", { hour12: false });
  }

  await writeDb(db);
  res.json({ success: true, order: publicOrder(order) });
});

app.post("/dev/reset-data", async (_req, res) => {
  const seed = await readJson(seedPath);
  await writeDb(seed);
  res.json({ success: true, message: "data reset" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`MadeClothing restored API is running at http://127.0.0.1:${port}`);
});
