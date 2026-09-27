import { postgresDb } from "../../db.js";

/**
 * Phase 10 — event refund liability ledger.
 *
 * PayChangu refund execution is not available in the current provider adapter,
 * so an event refund is never represented as completed merely because an admin
 * approved it. Approval creates a durable liability that must later be recovered
 * through the controlled manual recovery flow.
 */
export function ensureEventRefundLiabilityMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS event_refund_liabilities (
      id TEXT PRIMARY KEY,
      event_id BIGINT NOT NULL,
      event_creator_uid TEXT NOT NULL,
      order_id TEXT NOT NULL,
      ticket_id TEXT,
      payout_id TEXT,
      refund_request_id TEXT NOT NULL UNIQUE,
      amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL DEFAULT 'MWK',
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'due',
      due_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      recovery_reference TEXT,
      recovery_note TEXT,
      recovered_by TEXT,
      recovered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (status IN ('due', 'recovered', 'waived'))
    );

    CREATE INDEX IF NOT EXISTS idx_event_refund_liabilities_event_status
      ON event_refund_liabilities (event_id, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_event_refund_liabilities_creator_status
      ON event_refund_liabilities (event_creator_uid, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_event_refund_liabilities_order
      ON event_refund_liabilities (order_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_event_refund_liabilities_payout
      ON event_refund_liabilities (payout_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_event_refund_liabilities_due
      ON event_refund_liabilities (status, due_at);

    ALTER TABLE refund_requests
      ADD COLUMN IF NOT EXISTS event_liability_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_refund_requests_event_liability
      ON refund_requests (event_liability_id);
  `);
}
