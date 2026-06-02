import Database from "better-sqlite3";

let database: Database.Database | null = null;

export function getDatabase(dbPath = process.env.DB_PATH ?? "market.db"): Database.Database {
  if (!database) {
    database = new Database(dbPath);
  }

  return database;
}

export function closeDatabase() {
  if (!database) return;

  database.close();
  database = null;
}
