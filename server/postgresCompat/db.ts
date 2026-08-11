import { pool, query, postgresDb, type PgCompatClient, type PgCompatQueryResult } from "../db.js";

export { pool, query, postgresDb };
export type { PgCompatClient, PgCompatQueryResult };

export function getPaymentDb() {
  return postgresDb;
}

export default postgresDb;
