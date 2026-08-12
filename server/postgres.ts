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

const connectionString = (rawConnectionString && !isPlaceholderDatabaseUrl(rawConnectionString))
  ? stripSslQueryParams(rawConnectionString)
  : "";

const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
const sslEnabled = sslMode !== "disable";
const sslRejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;

function loadSslCaCertificate(): string | undefined {
  if (!sslEnabled || !sslRejectUnauthorized) return undefined;

  const caPath = process.env.PGSSL_CA_PATH?.trim() || path.resolve(process.cwd(), "ca.pem");
  try {
    return fs.readFileSync(caPath, "utf8");
  } catch (error) {
    throw new Error(
      `PostgreSQL SSL certificate verification is enabled, but the CA certificate could not be loaded from ${caPath}.`,
      { cause: error },
    );
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
    console.error("[AI Studio] Failed to create PostgreSQL pool:", err instanceof Error ? err.message : err);
    throw err;
  }
} else {
  console.warn("[AI Studio] DATABASE_URL is not configured — database operations will fallback to mock mode.");
}

export const pool = poolInstance ?? (new Proxy({}, {
  get(_target, prop) {
    if (prop === 'query') return async () => ({ rows: [], rowCount: 0 });
    if (prop === 'connect') return async () => ({ query: async () => ({ rows: [], rowCount: 0 }), release: () => {} });
    if (prop === 'end') return async () => {};
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
    return { rows: [], rowCount: 0 };
  }
  try {
    const result = await poolInstance.query<Row>(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount ?? result.rows.length,
    };
  } catch (error) {
    console.warn("[AI Studio] Database query failed:", error instanceof Error ? error.message : error);
    return { rows: [], rowCount: 0 };
  }
}

export async function getClient(): Promise<PoolClient> {
  if (!poolInstance) {
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    } as unknown as PoolClient;
  }
  try {
    return await poolInstance.connect();
  } catch (error) {
    console.warn("[AI Studio] Database client connection failed:", error instanceof Error ? error.message : error);
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
      release: () => {},
    } as unknown as PoolClient;
  }
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
