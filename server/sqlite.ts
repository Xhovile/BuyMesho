import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import dotenv from "dotenv";

import { initPaymentSchema } from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _db: Database.Database | null = null;

function resolvePaymentDatabasePath(): string {
  const candidates = [
    process.env.PAYMENT_DB_PATH,
    process.env.SQLITE_PATH,
    process.env.DB_PATH,
    process.env.DATABASE_FILE,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return path.resolve(__dirname, "..", "market.db");
}

export function getPaymentDb(): Database.Database {
  if (!_db) {
    const dbPath = resolvePaymentDatabasePath();
    const dbDir = path.dirname(dbPath);

    if (dbDir && dbDir !== ".") {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    _db = new Database(dbPath);
    initPaymentSchema(_db);
  }

  return _db;
}
