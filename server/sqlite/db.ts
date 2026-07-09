import { pool, query, sqliteDb, type SqliteClient, type SqliteQueryResult } from "../db.js";

export { pool, query, sqliteDb };
export type { SqliteClient, SqliteQueryResult };

export function getPaymentDb() {
  return sqliteDb;
}

export default sqliteDb;
