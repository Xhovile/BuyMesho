import Database from "better-sqlite3";

let _db: Database.Database | null = null;

export function setPaymentDb(db: Database.Database): void {
  _db = db;
}

export function getPaymentDb(): Database.Database {
  if (!_db) {
    throw new Error("payment database has not been initialized");
  }

  return _db;
}
