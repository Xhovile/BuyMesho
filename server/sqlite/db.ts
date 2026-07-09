export { pool, query, sqliteDb, type SqliteClient, type SqliteQueryResult } from "../db.js";

export function getPaymentDb() {
  return sqliteDb;
}

export default sqliteDb;
