import { getPaymentDb } from '../../sqlite.js';

const db = getPaymentDb();

function ensureColumn(tableName: string, columnName: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function ensureIndex(statement: string): void {
  db.exec(statement);
}

function ensurePayoutLifecycleSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payout_attempts (
      id TEXT PRIMARY KEY,
      payout_id TEXT NOT NULL,
      attempt_no INTEGER NOT NULL,
      provider TEXT NOT NULL,
      provider_charge_id TEXT NOT NULL UNIQUE,
      request_payload TEXT NOT NULL,
      response_payload TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      failure_reason TEXT,
      sent_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payout_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payout_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      note TEXT,
      payload TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payout_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payout_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      adjustment_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      reason TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      provider_reference TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (payout_id) REFERENCES payouts(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_id) REFERENCES sellers(uid) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS seller_payout_account_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_uid TEXT NOT NULL,
      account_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      note TEXT,
      payload TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (account_id) REFERENCES seller_payout_accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE
    );
  `);

  ensureColumn('payouts', 'destination_account_id', 'TEXT');
  ensureColumn('payouts', 'provider_ref_id', 'TEXT');
  ensureColumn('payouts', 'provider_transaction_id', 'TEXT');
  ensureColumn('payouts', 'provider_status', 'TEXT');
  ensureColumn('payouts', 'failure_reason', 'TEXT');
  ensureColumn('payouts', 'manual_review_reason', 'TEXT');
  ensureColumn('payouts', 'approved_by', 'TEXT');
  ensureColumn('payouts', 'sent_at', 'TIMESTAMPTZ');
  ensureColumn('payouts', 'paid_at', 'TIMESTAMPTZ');
  ensureColumn('payouts', 'failed_at', 'TIMESTAMPTZ');
  ensureColumn('payouts', 'last_attempt_id', 'TEXT');
  ensureColumn('payouts', 'raw_request', 'TEXT');
  ensureColumn('payouts', 'raw_response', 'TEXT');
  ensureColumn('payouts', 'processed_by', 'TEXT');
  ensureColumn('payouts', 'gross_amount', 'INTEGER');
  ensureColumn('payouts', 'platform_fee_amount', 'INTEGER');
  ensureColumn('payouts', 'processing_fee_amount', 'INTEGER');
  ensureColumn('payouts', 'reserve_amount', 'INTEGER');
  ensureColumn('payouts', 'reserve_cap_amount', 'INTEGER');
  ensureColumn('payouts', 'manual_adjustment_amount', 'INTEGER');
  ensureColumn('payouts', 'net_amount', 'INTEGER');
  ensureColumn('payouts', 'formula_snapshot', 'TEXT');
  ensureColumn('payouts', 'last_adjustment_id', 'TEXT');
  ensureColumn('sellers', 'is_suspended', 'INTEGER NOT NULL DEFAULT 0');

  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payout_attempts_payout_id ON payout_attempts (payout_id, created_at DESC)`);
  ensureIndex(`CREATE UNIQUE INDEX IF NOT EXISTS idx_payout_attempts_payout_id_attempt_no ON payout_attempts (payout_id, attempt_no)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payout_attempts_status ON payout_attempts (status, created_at DESC)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payout_events_payout_id ON payout_events (payout_id, created_at DESC)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payout_events_seller_id ON payout_events (seller_id, created_at DESC)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payout_adjustments_payout_id ON payout_adjustments (payout_id, created_at DESC)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payout_adjustments_seller_id ON payout_adjustments (seller_id, created_at DESC)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_seller_payout_account_events_seller_uid ON seller_payout_account_events (seller_uid, created_at DESC)`);
  ensureIndex(`CREATE INDEX IF NOT EXISTS idx_payouts_destination_account_id ON payouts (destination_account_id)`);
}

ensurePayoutLifecycleSchema();

export {};
