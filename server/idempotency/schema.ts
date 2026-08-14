import type { PgCompatDatabase } from "../db.js";

export function ensureIdempotencySchema(db: PgCompatDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS idempotency_operations (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      user_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      response_status INTEGER,
      response_body TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_operations_key
    ON idempotency_operations (scope, user_id, idempotency_key);

    CREATE INDEX IF NOT EXISTS idx_idempotency_operations_status
    ON idempotency_operations (status, updated_at);
  `);
}
