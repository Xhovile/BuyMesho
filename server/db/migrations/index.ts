import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sqliteDb } from "../../db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveSchemaPath(): string {
  const candidates = [
    path.join(process.cwd(), "server", "schema.sql"),
    path.join(process.cwd(), "schema.sql"),
    path.join(__dirname, "../../schema.sql"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Could not locate schema.sql. Tried: ${candidates.join(", ")}`);
}

export function runMigrations() {
  const schemaPath = resolveSchemaPath();
  const sql = fs.readFileSync(schemaPath, "utf8");

  try {
    sqliteDb.exec(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Migration step skipped because the database is unavailable: ${message}`);
  }

  return sqliteDb;
}
