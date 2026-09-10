import { postgresDb } from "../../db.js";

/** Persist dispute ownership at submission time so later payout changes do not reroute an existing case. */
export function ensureDisputeResolutionOwnershipMigration(): void {
  postgresDb.exec(`
    ALTER TABLE dispute_cases
      ADD COLUMN IF NOT EXISTS resolution_owner TEXT NOT NULL DEFAULT 'admin';

    ALTER TABLE dispute_cases
      ADD COLUMN IF NOT EXISTS payout_status_at_submission TEXT;

    CREATE INDEX IF NOT EXISTS idx_dispute_cases_resolution_owner_status
      ON dispute_cases (resolution_owner, status, created_at DESC);

    UPDATE dispute_cases dc
       SET resolution_owner = CASE
         WHEN EXISTS (
           SELECT 1
             FROM dispute_attempts da
            WHERE da.case_id = dc.id
              AND da.status IN ('resolved', 'rejected')
              AND da.decision IN ('seller_refund_confirmed', 'seller_refund_accepted', 'seller_replacement_confirmed', 'seller_replacement_committed', 'seller_rejected', 'seller_dispute_rejected')
         ) THEN 'seller'
         WHEN EXISTS (
           SELECT 1
             FROM payouts p
            WHERE p.order_id = dc.order_id
              AND p.status = 'paid'
         ) THEN 'seller'
         ELSE 'admin'
       END
     WHERE dc.resolution_owner IS NULL OR dc.resolution_owner NOT IN ('admin', 'seller');

    UPDATE dispute_cases dc
       SET payout_status_at_submission = (
         SELECT p.status
           FROM payouts p
          WHERE p.order_id = dc.order_id
          ORDER BY p.created_at DESC
          LIMIT 1
       )
     WHERE dc.payout_status_at_submission IS NULL;
  `);
}
