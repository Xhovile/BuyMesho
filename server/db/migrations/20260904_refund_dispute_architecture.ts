import { postgresDb } from "../../db.js";

/**
 * Establish the canonical refund/dispute records while preserving the legacy
 * disputes table used by older application paths.
 *
 * Production has existed with multiple legacy disputes shapes, so this
 * migration deliberately adds every legacy column referenced by the backfill
 * before reading from disputes. All operations are idempotent.
 */
export function ensureRefundDisputeArchitectureMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS refund_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      item_id TEXT,
      dispute_case_id TEXT,
      request_type TEXT NOT NULL,
      requested_resolution TEXT,
      reason TEXT NOT NULL,
      amount_requested DOUBLE PRECISION NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MWK',
      payment_method TEXT,
      refund_destination TEXT,
      order_state_snapshot TEXT,
      escrow_state_snapshot TEXT,
      payout_state_snapshot TEXT,
      evidence TEXT NOT NULL DEFAULT '[]',
      buyer_comments TEXT,
      seller_response TEXT,
      admin_decision TEXT,
      refund_transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'requested',
      latest_status_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      window_ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS refund_transactions (
      id TEXT PRIMARY KEY,
      refund_request_id TEXT,
      order_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'MWK',
      destination TEXT,
      payment_method TEXT,
      provider TEXT,
      transaction_id TEXT,
      status TEXT NOT NULL DEFAULT 'processing',
      executed_by TEXT,
      executed_at TIMESTAMPTZ,
      supporting_evidence TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dispute_cases (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      opened_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      outcome TEXT,
      legacy_dispute_id TEXT UNIQUE,
      opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      window_ends_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS dispute_attempts (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      request_type TEXT NOT NULL,
      requested_resolution TEXT,
      reason TEXT NOT NULL,
      amount_requested DOUBLE PRECISION NOT NULL DEFAULT 0,
      evidence TEXT NOT NULL DEFAULT '[]',
      submitted_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      decision TEXT,
      resolution_note TEXT,
      resolved_by TEXT,
      resolved_at TIMESTAMPTZ,
      window_ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      performed_by TEXT,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      previous_state TEXT,
      new_state TEXT,
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    -- Legacy disputes has existed with both state/status and with different
    -- optional fields. Normalize the full compatibility surface first.
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS state TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS status TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS details TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS case_id TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS window_ends_at TIMESTAMPTZ;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS request_type TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS reason TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS amount_requested DOUBLE PRECISION;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS evidence TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS opened_by TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_by TEXT;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
    ALTER TABLE disputes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

    UPDATE disputes
    SET status = COALESCE(NULLIF(status, ''), NULLIF(state, ''), 'open')
    WHERE status IS NULL OR status = '';

    UPDATE disputes
    SET resolution = details
    WHERE resolution IS NULL AND details IS NOT NULL;

    UPDATE disputes
    SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
    WHERE created_at IS NULL;

    UPDATE disputes
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL;

    UPDATE disputes
    SET amount_requested = COALESCE(amount_requested, 0)
    WHERE amount_requested IS NULL;

    UPDATE disputes
    SET evidence = COALESCE(NULLIF(evidence, ''), '[]')
    WHERE evidence IS NULL OR evidence = '';

    ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS requested_resolution TEXT;
    ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS latest_status_at TIMESTAMPTZ;
    ALTER TABLE dispute_attempts ADD COLUMN IF NOT EXISTS requested_resolution TEXT;

    CREATE INDEX IF NOT EXISTS idx_refund_requests_order_created_at
      ON refund_requests (order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_buyer_status
      ON refund_requests (buyer_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_seller_status
      ON refund_requests (seller_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_dispute_case
      ON refund_requests (dispute_case_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refund_requests_window_ends_at
      ON refund_requests (window_ends_at);

    CREATE INDEX IF NOT EXISTS idx_refund_transactions_order_created_at
      ON refund_transactions (order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refund_transactions_request
      ON refund_transactions (refund_request_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_refund_transactions_transaction_id
      ON refund_transactions (transaction_id);

    CREATE INDEX IF NOT EXISTS idx_dispute_cases_order_created_at
      ON dispute_cases (order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dispute_cases_buyer_status
      ON dispute_cases (buyer_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dispute_cases_seller_status
      ON dispute_cases (seller_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dispute_cases_window_ends_at
      ON dispute_cases (window_ends_at);

    CREATE INDEX IF NOT EXISTS idx_dispute_attempts_case_created_at
      ON dispute_attempts (case_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dispute_attempts_order_created_at
      ON dispute_attempts (order_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_dispute_attempts_status_created_at
      ON dispute_attempts (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_audit_events_entity_timestamp
      ON audit_events (entity_type, entity_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_events_event_type_timestamp
      ON audit_events (event_type, timestamp DESC);
  `);

  // Preserve existing dispute history in the canonical case model.
  postgresDb.exec(`
    INSERT INTO dispute_cases (
      id, order_id, buyer_id, seller_id, opened_by, status, outcome,
      legacy_dispute_id, opened_at, resolved_at, created_at, updated_at
    )
    SELECT
      'case_' || d.id,
      o.id,
      o.buyer_id,
      o.seller_id,
      COALESCE(NULLIF(d.opened_by, ''), o.buyer_id),
      COALESCE(NULLIF(d.status, ''), 'open'),
      CASE
        WHEN lower(COALESCE(d.status, 'open')) IN ('resolved', 'accepted', 'closed')
          THEN CASE
            WHEN NULLIF(d.resolution, '') IS NOT NULL THEN 'resolved'
            ELSE 'closed'
          END
        ELSE NULL
      END,
      d.id,
      COALESCE(d.created_at, CURRENT_TIMESTAMP),
      d.resolved_at,
      COALESCE(d.created_at, CURRENT_TIMESTAMP),
      COALESCE(d.updated_at, d.created_at, CURRENT_TIMESTAMP)
    FROM disputes d
    INNER JOIN orders o ON o.id = d.order_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM dispute_cases existing
      WHERE existing.legacy_dispute_id = d.id
    );

    INSERT INTO dispute_attempts (
      id, case_id, order_id, request_type, requested_resolution,
      reason, amount_requested, evidence, submitted_by, status, decision,
      resolution_note, resolved_by, resolved_at, window_ends_at,
      created_at, updated_at
    )
    SELECT
      'attempt_' || d.id,
      'case_' || d.id,
      o.id,
      COALESCE(NULLIF(d.request_type, ''), 'legacy_dispute'),
      CASE
        WHEN lower(COALESCE(d.request_type, '')) IN ('refund', 'return_and_refund')
          THEN 'refund'
        WHEN lower(COALESCE(d.request_type, '')) = 'return'
          THEN 'return'
        WHEN NULLIF(d.resolution, '') IS NOT NULL
          THEN d.resolution
        ELSE NULL
      END,
      COALESCE(NULLIF(d.reason, ''), 'Legacy dispute'),
      COALESCE(d.amount_requested, 0),
      COALESCE(NULLIF(d.evidence, ''), '[]'),
      COALESCE(NULLIF(d.opened_by, ''), o.buyer_id),
      CASE
        WHEN lower(COALESCE(d.status, 'open')) = 'rejected' THEN 'rejected'
        WHEN lower(COALESCE(d.status, 'open')) IN ('resolved', 'accepted', 'closed') THEN 'resolved'
        ELSE 'open'
      END,
      CASE
        WHEN lower(COALESCE(d.status, 'open')) = 'rejected' THEN 'reject'
        WHEN lower(COALESCE(d.status, 'open')) IN ('resolved', 'accepted', 'closed') THEN 'accept'
        ELSE NULL
      END,
      NULLIF(d.resolution, ''),
      d.resolved_by,
      d.resolved_at,
      d.window_ends_at,
      COALESCE(d.created_at, CURRENT_TIMESTAMP),
      COALESCE(d.updated_at, d.created_at, CURRENT_TIMESTAMP)
    FROM disputes d
    INNER JOIN orders o ON o.id = d.order_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM dispute_attempts existing
      WHERE existing.id = 'attempt_' || d.id
    );
  `);
}
