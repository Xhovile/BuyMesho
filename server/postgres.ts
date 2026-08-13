import "dotenv/config";

import fs from "node:fs";
import path from "node:path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

const rawConnectionString = process.env.DATABASE_URL?.trim();

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function stripSslQueryParams(connectionString: string) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("ssl");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch {
    return connectionString;
  }
}

function isPlaceholderDatabaseUrl(urlStr?: string): boolean {
  if (!urlStr || !urlStr.trim()) return true;
  const lower = urlStr.toLowerCase();
  return (
    lower.includes("username:password") ||
    lower.includes("user:password") ||
    lower.includes("<username>") ||
    lower.includes("<password>") ||
    lower.includes("your-database") ||
    lower.includes("placeholder")
  );
}

const connectionString = rawConnectionString && !isPlaceholderDatabaseUrl(rawConnectionString)
  ? stripSslQueryParams(rawConnectionString)
  : "";

const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
const sslEnabled = sslMode !== "disable";
const sslRejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;
const allowMockDatabase = process.env.NODE_ENV === "test" || parseBoolean(process.env.ALLOW_MOCK_DATABASE) === true;

function loadSslCaCertificate(): string | undefined {
  if (!sslEnabled || !sslRejectUnauthorized) return undefined;

  const inlineCa = process.env.PGSSL_CA?.trim();
  if (inlineCa) return inlineCa;

  const caPath = process.env.PGSSL_CA_PATH?.trim() || path.resolve(process.cwd(), "ca.pem");
  try {
    return fs.readFileSync(caPath, "utf8");
  } catch (error) {
    const message =
      `PostgreSQL SSL certificate verification is enabled, but the CA certificate could not be loaded from ${caPath}. ` +
      "Set PGSSL_CA to the Aiven project CA or set PGSSL_CA_PATH to a readable CA file.";
    throw new Error(`${message} ${error instanceof Error ? error.message : String(error)}`);
  }
}

let poolInstance: Pool | null = null;
if (connectionString) {
  try {
    const sslCa = loadSslCaCertificate();

    poolInstance = new Pool({
      connectionString,
      ssl: sslEnabled
        ? {
            rejectUnauthorized: sslRejectUnauthorized,
            ...(sslCa ? { ca: sslCa } : {}),
          }
        : false,
      max: Number(process.env.PGPOOL_MAX ?? 10) || 10,
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_TIMEOUT_MS ?? 30_000) || 30_000,
      connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10_000) || 10_000,
    });
  } catch (err) {
    console.error("[BuyMesho] Failed to create PostgreSQL pool:", err instanceof Error ? err.message : err);
    throw err;
  }
} else if (!allowMockDatabase) {
  throw new Error("PostgreSQL is not configured: DATABASE_URL is missing or invalid.");
} else {
  console.warn("[BuyMesho] DATABASE_URL is not configured; mock database mode is enabled for this process.");
}

export const pool = poolInstance ?? (new Proxy({}, {
  get(_target, prop) {
    if (!allowMockDatabase) {
      throw new Error("PostgreSQL is unavailable and mock database mode is disabled.");
    }
    if (prop === "query") return async () => ({ rows: [], rowCount: 0 });
    if (prop === "connect") return async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} });
    if (prop === "end") return async () => {};
    return () => {};
  }
}) as unknown as Pool);

export type DbRow = Record<string, unknown>;
export type DbQueryResult<Row extends QueryResultRow = DbRow> = {
  rows: Row[];
  rowCount: number;
};

export async function query<Row extends QueryResultRow = DbRow>(
  text: string,
  params: unknown[] = [],
): Promise<DbQueryResult<Row>> {
  if (!poolInstance) {
    if (allowMockDatabase) return { rows: [], rowCount: 0 };
    throw new Error("PostgreSQL is unavailable: no connection pool is configured.");
  }

  try {
    const result = await poolInstance.query<Row>(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`PostgreSQL query failed: ${message}`);
  }
}

export async function getClient(): Promise<PoolClient> {
  if (!poolInstance) {
    if (allowMockDatabase) throw new Error("PostgreSQL is not configured in mock mode.");
    throw new Error("PostgreSQL is not configured: DATABASE_URL is missing or invalid.");
  }

  return poolInstance.connect();
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getClient();
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
    try {
      client.release();
    } catch {
      // Ignore release errors.
    }
  }
}

export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
  }
}
