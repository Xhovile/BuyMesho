import { postgresDb } from "../db.js";

export function getDatabase() {
  return postgresDb;
}

export function closeDatabase() {
  postgresDb.close();
}
