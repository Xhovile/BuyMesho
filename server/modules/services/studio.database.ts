import "dotenv/config";
import { Pool } from "pg";
import { getPostgresSslOptions } from "../../lib/postgresSsl.js";

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
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");
  url.searchParams.delete("sslcert");
  url.searchParams.delete("sslkey");
  url.searchParams.delete("sslrootcert");

  pool = new Pool({
    connectionString: url.toString(),
    ssl: getPostgresSslOptions(),
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

export async function withStudioAdvisoryLock<T>(
  key: string,
  callback: () => Promise<T>,
): Promise<T> {
  const databasePool = createStudioPool();
  const client = await databasePool.connect();

  try {
    await client.query(
      "SELECT pg_advisory_lock(hashtextextended($1, 0))",
      [key],
    );
    return await callback();
  } finally {
    try {
      await client.query(
        "SELECT pg_advisory_unlock(hashtextextended($1, 0))",
        [key],
      );
    } finally {
      client.release();
    }
  }
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
        reference_media JSONB NOT NULL DEFAULT '[]'::jsonb,
        provider_reference TEXT,
        payment_reference TEXT UNIQUE,
        checkout_url TEXT,
        idempotency_key TEXT,
        idempotency_request_hash TEXT,
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
      ADD COLUMN IF NOT EXISTS reference_media JSONB NOT NULL DEFAULT '[]'::jsonb
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
      ADD COLUMN IF NOT EXISTS checkout_url TEXT
    `);

    await studioQuery(`
      ALTER TABLE service_payments
      ADD COLUMN IF NOT EXISTS idempotency_key TEXT
    `);

    await studioQuery(`
      ALTER TABLE service_payments
      ADD COLUMN IF NOT EXISTS idempotency_request_hash TEXT
    `);

    await studioQuery(`
      ALTER TABLE service_payments
      ADD COLUMN IF NOT EXISTS success_notification_error TEXT
    `);

    await studioQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_service_payments_idempotency_key
      ON service_payments(idempotency_key)
    `);

    await studioQuery(`
      DO $studio$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_service_payments_service_type'
        ) THEN
          ALTER TABLE service_payments
          ADD CONSTRAINT chk_studio_service_payments_service_type
          CHECK (service_type IN ('graphic_design', 'website_development', 'both')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_service_payments_status'
        ) THEN
          ALTER TABLE service_payments
          ADD CONSTRAINT chk_studio_service_payments_status
          CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_service_payments_payment_mode'
        ) THEN
          ALTER TABLE service_payments
          ADD CONSTRAINT chk_studio_service_payments_payment_mode
          CHECK (payment_mode IS NULL OR payment_mode IN ('deposit', 'full', 'balance')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_service_payments_amount'
        ) THEN
          ALTER TABLE service_payments
          ADD CONSTRAINT chk_studio_service_payments_amount
          CHECK (
            amount > 0
            AND amount <= 100000000
            AND amount * 100 = ROUND(amount * 100)
          ) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_service_payments_reference_media'
        ) THEN
          ALTER TABLE service_payments
          ADD CONSTRAINT chk_studio_service_payments_reference_media
          CHECK (jsonb_typeof(reference_media) = 'array') NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_service_payments_notification_status'
        ) THEN
          ALTER TABLE service_payments
          ADD CONSTRAINT chk_studio_service_payments_notification_status
          CHECK (success_notification_status IN ('pending', 'sending', 'sent', 'failed')) NOT VALID;
        END IF;
      END $studio$;
    `);

    await studioQuery(`
      DROP INDEX IF EXISTS idx_studio_service_payments_reference
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
      DO $studio_webhook$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_webhook_status'
        ) THEN
          ALTER TABLE service_payment_webhook_events
          ADD CONSTRAINT chk_studio_webhook_status
          CHECK (status IN ('received', 'processed', 'ignored', 'failed')) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_webhook_signature'
        ) THEN
          ALTER TABLE service_payment_webhook_events
          ADD CONSTRAINT chk_studio_webhook_signature
          CHECK (signature_valid IN (0, 1)) NOT VALID;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_studio_webhook_payload_hash'
        ) THEN
          ALTER TABLE service_payment_webhook_events
          ADD CONSTRAINT chk_studio_webhook_payload_hash
          CHECK (TRIM(payload_hash) <> '') NOT VALID;
        END IF;
      END $studio_webhook$;
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
  })().catch((error: unknown) => {
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
