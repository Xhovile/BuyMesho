import { postgresDb } from "../../db.js";

/**
 * Phase 4: indexes/compatibility fields needed by Seller Orders to surface
 * the consolidated dispute case and refund activity without creating a
 * separate seller dispute workspace.
 */
export function ensureSellerDisputeVisibilityMigration(): void {
  postgresDb.exec(`
    ALTER TABLE dispute_cases
      ADD COLUMN IF NOT EXISTS latest_attempt_id TEXT;

    ALTER TABLE refund_requests
      ADD COLUMN IF NOT EXISTS latest_status_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_dispute_cases_seller_opened_at
      ON dispute_cases (seller_id, status, opened_at DESC);

    CREATE INDEX IF NOT EXISTS idx_dispute_attempts_case_latest
      ON dispute_attempts (case_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_refund_requests_seller_latest
      ON refund_requests (seller_id, status, created_at DESC);
  `);

  postgresDb.exec(`
    UPDATE dispute_cases dc
    SET latest_attempt_id = latest.id
    FROM LATERAL (
      SELECT da.id
      FROM dispute_attempts da
      WHERE da.case_id = dc.id
      ORDER BY da.created_at DESC
      LIMIT 1
    ) latest
    WHERE latest.id IS NOT NULL
      AND (dc.latest_attempt_id IS NULL OR dc.latest_attempt_id <> latest.id);

    UPDATE refund_requests
    SET latest_status_at = COALESCE(updated_at, created_at)
    WHERE latest_status_at IS NULL;
  `);
}
