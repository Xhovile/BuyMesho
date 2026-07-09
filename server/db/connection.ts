import { sqliteDb } from "../db.js";

export function getDatabase() {
  return sqliteDb;
}

export function closeDatabase() {
  sqliteDb.close();
}
