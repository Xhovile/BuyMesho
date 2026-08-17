import { Pool } from "pg";

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function stripSslQueryParams(connectionString: string): string {
  try {
    const url = new URL(connectionString);
    ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"].forEach((key) => url.searchParams.delete(key));
    return url.toString();
  } catch {
    return connectionString.trim();
  }
}

function isPlaceholderDatabaseUrl(url?: string): boolean {
  if (!url?.trim()) return true;
  const lower = url.toLowerCase();
  return [
    "username:password",
    "user:password",
    "<username>",
    "<password>",
    "your-database",
    "placeholder",
  ].some((token) => lower.includes(token));
}

function databaseName(connectionString: string): string {
  try {
    return decodeURIComponent(new URL(connectionString).pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

async function main() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Synchronous PostgreSQL helper may only run with NODE_ENV=test.");
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!connectionString || isPlaceholderDatabaseUrl(connectionString)) {
    throw new Error("PostgreSQL test connection is missing or invalid.");
  }
  if (!testUrl) {
    throw new Error("TEST_DATABASE_URL is required.");
  }

  const testName = databaseName(testUrl);
  if (!/(^|[_-])test([_-]|$)/i.test(testName)) {
    throw new Error(`TEST DATABASE SAFETY: TEST_DATABASE_URL is not a test database (${testName || "unknown"}).`);
  }

  const configuredName = databaseName(connectionString);
  if (!/(^|[_-])test([_-]|$)/i.test(configuredName)) {
    throw new Error(`TEST DATABASE SAFETY: DATABASE_URL is not a test database (${configuredName || "unknown"}).`);
  }

  const raw = process.argv[2];
  if (!raw) throw new Error("Missing query payload.");
  const payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
    sql: string;
    params: unknown[];
  };

  const sslMode = process.env.PGSSLMODE?.trim().toLowerCase();
  const sslEnabled = sslMode !== "disable";
  const sslRejectUnauthorized = parseBoolean(process.env.PGSSL_REJECT_UNAUTHORIZED) ?? false;
  const sslCa = process.env.PGSSL_CA?.trim() || undefined;

  const pool = new Pool({
    connectionString: stripSslQueryParams(connectionString),
    ssl: sslEnabled
      ? {
          rejectUnauthorized: sslRejectUnauthorized,
          ...(sslCa ? { ca: sslCa } : {}),
        }
      : false,
    max: 1,
    connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT_MS ?? 10000) || 10000,
    idleTimeoutMillis: 1000,
  });

  try {
    const result = await pool.query(payload.sql, payload.params ?? []);
    process.stdout.write(
      JSON.stringify({
        ok: true,
        rows: result.rows ?? [],
        rowCount: result.rowCount ?? (result.rows ?? []).length,
      }),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
