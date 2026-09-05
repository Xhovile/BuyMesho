import { postgresDb } from "../../db.js";

export function ensureDisputeSupportRequestsMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      dispute_case_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      admin_response TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMPTZ,
      resolved_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_support_requests_status_created
      ON support_requests(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_support_requests_buyer_created
      ON support_requests(buyer_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_support_requests_case_created
      ON support_requests(dispute_case_id, created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_support_requests_active_case
      ON support_requests(dispute_case_id)
      WHERE status IN ('open', 'in_progress');
  `);
}
