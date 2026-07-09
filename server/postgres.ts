import "dotenv/config";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
const sslEnabled = sslMode !== "disable";
const sslRejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;

export const pool = new Pool({
  connectionString,
  ssl: sslEnabled
    ? {
        rejectUnauthorized: sslRejectUnauthorized,
      }
    : false,
  max: Number(process.env.PGPOOL_MAX ?? 10) || 10,
  idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30_000) || 30_000,
  connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10_000) || 10_000,
});

export type DbRow = Record<string, unknown>;
export type DbQueryResult<Row extends QueryResultRow = DbRow> = {
  rows: Row[];
  rowCount: number;
};

export async function query<Row extends QueryResultRow = DbRow>(
  text: string,
  params: unknown[] = [],
): Promise<DbQueryResult<Row>> {
  const result = await pool.query<Row>(text, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? result.rows.length,
  };
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback errors so the original failure is preserved.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
