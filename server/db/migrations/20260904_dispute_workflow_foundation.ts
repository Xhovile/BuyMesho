import { postgresDb } from "../../db.js";

export function ensureDisputeWorkflowFoundation(): void {
  postgresDb.exec(`
    ALTER TABLE dispute_attempts
      ADD COLUMN IF NOT EXISTS requested_resolution TEXT NOT NULL DEFAULT 'review';

    ALTER TABLE refund_requests
      ADD COLUMN IF NOT EXISTS requested_resolution TEXT NOT NULL DEFAULT 'refund';

    CREATE INDEX IF NOT EXISTS idx_dispute_attempts_resolution_status
      ON dispute_attempts (requested_resolution, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_refund_requests_resolution_status
      ON refund_requests (requested_resolution, status, created_at DESC);
  `);
}
