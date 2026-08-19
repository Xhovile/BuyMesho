import type { PgCompatDatabase } from "../../db.js";

export function ensureEventDisputeTicketIdentity(db: PgCompatDatabase): void {
  db.exec(`
    ALTER TABLE disputes
      ADD COLUMN IF NOT EXISTS ticket_id TEXT;

    CREATE INDEX IF NOT EXISTS idx_disputes_ticket_id
      ON disputes(ticket_id);
  `);
}
