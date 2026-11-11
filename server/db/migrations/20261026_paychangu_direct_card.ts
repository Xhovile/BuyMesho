import { postgresDb } from "../../db.js";

/**
 * Application persistence for PayChangu Direct Card. This table deliberately has
 * no PAN/CVV/card-number fields and stores only references and lifecycle state.
 * It is idempotent so existing deployments can safely re-run application migrations.
 */
export function ensurePayChanguDirectCardMigration(): void {
  postgresDb.exec(`
    CREATE TABLE IF NOT EXISTS paychangu_direct_card_charges (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      buyer_id TEXT NOT NULL,
      payment_reference TEXT NOT NULL UNIQUE REFERENCES payments(reference) ON DELETE CASCADE,
      charge_id TEXT NOT NULL UNIQUE,
      amount DOUBLE PRECISION NOT NULL CHECK (amount > 0),
      currency TEXT NOT NULL CHECK (currency IN ('MWK', 'USD')),
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'requires_action', 'pending_verification', 'paid', 'failed', 'cancelled', 'reversed', 'unknown')),
      requires_3ds_auth INTEGER NOT NULL DEFAULT 0 CHECK (requires_3ds_auth IN (0, 1)),
      authorization_completed INTEGER NOT NULL DEFAULT 0 CHECK (authorization_completed IN (0, 1)),
      three_ds_auth_url TEXT,
      result_url TEXT NOT NULL,
      provider_order_reference TEXT,
      last_provider_status TEXT,
      failure_reason TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_paychangu_direct_card_charges_status_updated
      ON paychangu_direct_card_charges(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_paychangu_direct_card_charges_buyer_created
      ON paychangu_direct_card_charges(buyer_id, created_at DESC);
  `);
}
