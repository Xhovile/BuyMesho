import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sqliteDb } from "../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  const schemaPath = path.join(__dirname, "../../schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  sqliteDb.exec(sql);
  return sqliteDb;
}
