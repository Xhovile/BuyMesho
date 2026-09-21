import "dotenv/config";
import { Pool } from "pg";

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

function getStudioConnectionString(): string {
  const value = process.env.XHOVILE_STUDIO_DATABASE_URL?.trim();
  if (!value || value === "...") {
    throw new Error(
      "Xhovilé Studio database is not configured: XHOVILE_STUDIO_DATABASE_URL is missing.",
    );
  }
  return value;
}

function createStudioPool(): Pool {
  if (pool) return pool;

  const connectionString = getStudioConnectionString();
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  url.searchParams.delete("sslcert");
  url.searchParams.delete("sslkey");
  url.searchParams.delete("sslrootcert");

  pool = new Pool({
    connectionString: url.toString(),
    ssl:
      sslMode === "disable"
        ? false
        : {
            rejectUnauthorized: false,
          },
    max: Number(process.env.XHOVILE_STUDIO_DB_POOL_MAX ?? 5) || 5,
    idleTimeoutMillis:
      Number(process.env.XHOVILE_STUDIO_DB_IDLE_TIMEOUT_MS ?? 30000) || 30000,
    connectionTimeoutMillis:
      Number(process.env.XHOVILE_STUDIO_DB_CONNECTION_TIMEOUT_MS ?? 10000) ||
      10000,
  });

  pool.on("error", (error) => {
    console.error(
      "[XhovileStudioDB] Unexpected PostgreSQL client error:",
      error instanceof Error ? error.message : error,
    );
  });

  return pool;
}

export async function studioQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: T[]; rowCount: number }> {
  const result = await createStudioPool().query<T>(sql, params);
  return {
    rows: result.rows,
    rowCount: result.rowCount ?? result.rows.length,
  };
}

export async function ensureStudioDatabaseSchema(): Promise<void> {
  if (schemaPromise) return schemaPromise;

  schemaPromise = (async () => {
    await studioQuery(`
      CREATE TABLE IF NOT EXISTS service_payments (
        id TEXT PRIMARY KEY,
        service_type TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        description TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        currency TEXT NOT NULL DEFAULT 'MWK',
        status TEXT NOT NULL DEFAULT 'pending',
        payment_mode TEXT,
        project_total DOUBLE PRECISION,
        project_reference TEXT,
        graphic_id TEXT,
        provider_reference TEXT,
        payment_reference TEXT UNIQUE,
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await studioQuery(`
      CREATE INDEX IF NOT EXISTS idx_studio_service_payments_status
      ON service_payments(status, created_at DESC)
    `);

    await studioQuery(`
      ALTER TABLE service_payments
      ADD COLUMN IF NOT EXISTS success_notification_status TEXT NOT NULL DEFAULT 'pending'
    `);

    await studioQuery(`
      ALTER TABLE service_payments
      ADD COLUMN IF NOT EXISTS success_notification_sent_at TIMESTAMPTZ
    `);

    await studioQuery(`
      ALTER TABLE service_payments
      ADD COLUMN IF NOT EXISTS success_notification_error TEXT
    `);

    await studioQuery(`
      CREATE INDEX IF NOT EXISTS idx_studio_service_payments_reference
      ON service_payments(payment_reference)
    `);

    await studioQuery(`
      CREATE TABLE IF NOT EXISTS service_payment_webhook_events (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        provider_event_id TEXT,
        payment_reference TEXT,
        event_type TEXT,
        payload_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'received',
        signature_valid INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMPTZ
      )
    `);

    await studioQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_webhook_provider_event
      ON service_payment_webhook_events(provider_event_id)
      WHERE provider_event_id IS NOT NULL
    `);

    await studioQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_webhook_payload
      ON service_payment_webhook_events(payment_reference, event_type, payload_hash)
    `);
  `).catch((error) => {
    schemaPromise = null;
    throw error;
  });

  return schemaPromise;
}

export async function closeStudioDatabase(): Promise<void> {
  const currentPool = pool;
  pool = null;
  schemaPromise = null;
  if (currentPool) await currentPool.end();
}
