import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const seedPath = path.join(root, "backend", "data", "seed.json");
const dbPath = path.join(root, "backend", "data", "db.json");

fs.copyFileSync(seedPath, dbPath);
console.log("資料已重置：restored/backend/data/db.json");
