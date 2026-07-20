import type { PgCompatDatabase } from "../db.js";

function ensureColumn(
  db: PgCompatDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = db.prepare(`SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = ?`).all(tableName) as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

export function initPaymentSchema(db: PgCompatDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_uid TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      quantity INTEGER NOT NULL DEFAULT 1,
      sold_quantity INTEGER NOT NULL DEFAULT 0,
      is_hidden INTEGER NOT NULL DEFAULT 0,
      deleted_at TEXT,
      deleted_by_uid TEXT,
      hard_delete_after TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_uid TEXT,
      event_type TEXT NOT NULL,
      event_title TEXT NOT NULL,
      organizer_name TEXT NOT NULL,
      event_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      venue TEXT NOT NULL,
      location TEXT NOT NULL,
      ticket_mode TEXT NOT NULL,
      ticket_price REAL,
      ticket_link TEXT,
      description TEXT NOT NULL,
      contact_whatsapp TEXT,
      poster_alt TEXT,
      spec_values TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      deleted_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT NOT NULL UNIQUE,
      provider_reference TEXT,
      currency TEXT NOT NULL DEFAULT 'MWK',
      amount REAL NOT NULL DEFAULT 0,
      checkout_url TEXT,
      paid_at TEXT,
      raw_response TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      verification TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

    CREATE TABLE IF NOT EXISTS sellers (
      uid TEXT PRIMARY KEY,
      email TEXT,
      business_name TEXT,
      business_logo TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0,
      is_suspended INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_uid TEXT,
      admin_email TEXT,
      action_type TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seller_payout_accounts (
      id TEXT PRIMARY KEY,
      seller_uid TEXT NOT NULL,
      destination_type TEXT NOT NULL,
      provider_name TEXT NOT NULL,
      provider_ref_id TEXT,
      currency TEXT NOT NULL DEFAULT 'MWK',
      account_name TEXT NOT NULL,
      account_number_encrypted TEXT,
      mobile_encrypted TEXT,
      masked_account TEXT NOT NULL,
      destination_fingerprint TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      verification_status TEXT NOT NULL DEFAULT 'pending',
      verification_attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      verified_at TEXT,
      replaced_from_id TEXT,
      replaced_by_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (seller_uid) REFERENCES sellers(uid) ON DELETE CASCADE,
      FOREIGN KEY (replaced_from_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL,
      FOREIGN KEY (replaced_by_id) REFERENCES seller_payout_accounts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      source TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      currency TEXT NOT NULL,
      subtotal_amount REAL NOT NULL,
      subtotal_currency TEXT NOT NULL,
      total_amount REAL NOT NULL,
      total_currency TEXT NOT NULL,
      payment_provider TEXT,
      payment_reference TEXT,
      escrow_id TEXT,
      items TEXT NOT NULL DEFAULT '[]',
      placed_at TEXT,
      paid_at TEXT,
      fulfilled_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON orders(payment_reference);

    CREATE TABLE IF NOT EXISTS escrows (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL DEFAULT 'initiated',
      currency TEXT NOT NULL,
      balance_amount REAL NOT NULL DEFAULT 0,
      balance_currency TEXT NOT NULL,
      entries TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_escrows_order_id ON escrows(order_id);

    CREATE TABLE IF NOT EXISTS escrow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      escrow_id TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      reference TEXT,
      amount REAL,
      currency TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (escrow_id) REFERENCES escrows(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_escrow_events_escrow_id ON escrow_events(escrow_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      provider_event_id TEXT,
      reference TEXT,
      tx_ref TEXT,
      event_type TEXT,
      payload_hash TEXT,
      processing_status TEXT NOT NULL DEFAULT 'received',
      processed_at TEXT,
      error TEXT,
      signature_valid INTEGER NOT NULL DEFAULT 0,
      payload TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      response TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      escrow_id TEXT,
      opened_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolved_by TEXT,
      resolution_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id);

    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      seller_id TEXT NOT NULL,
      order_id TEXT,
      escrow_id TEXT,
      release_entry_id TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      provider TEXT,
      provider_charge_id TEXT,
      requested_by TEXT,
      requested_at TEXT,
      processed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON payouts(seller_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_payout_accounts_destination_fingerprint
    ON seller_payout_accounts(seller_uid, destination_fingerprint);

    CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_seller_uid
    ON seller_payout_accounts(seller_uid, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_verification_status
    ON seller_payout_accounts(seller_uid, verification_status, is_active);
  `);

  ensureColumn(db, "payment_webhook_events", "provider_event_id", "TEXT");
  ensureColumn(db, "payment_webhook_events", "tx_ref", "TEXT");
  ensureColumn(db, "payment_webhook_events", "payload_hash", "TEXT");
  ensureColumn(db, "payment_webhook_events", "processing_status", "TEXT NOT NULL DEFAULT 'received'");
  ensureColumn(db, "payment_webhook_events", "processed_at", "TEXT");
  ensureColumn(db, "payment_webhook_events", "error", "TEXT");
  ensureColumn(db, "listings", "category", "TEXT");
  ensureColumn(db, "listings", "university", "TEXT");
  ensureColumn(db, "listings", "whatsapp_number", "TEXT");
  ensureColumn(db, "listings", "condition", "TEXT");
  ensureColumn(db, "listings", "original_price", "REAL");
  ensureColumn(db, "listings", "discount_percent", "INTEGER");
  ensureColumn(db, "listings", "deal_label", "TEXT");
  ensureColumn(db, "listings", "listing_mode", "TEXT NOT NULL DEFAULT 'normal'");
  ensureColumn(db, "listings", "deal_expires_at", "TEXT");
  ensureColumn(db, "listings", "is_wholesale", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "listings", "pack_size", "INTEGER");
  ensureColumn(db, "listings", "bulk_units", "TEXT");
  ensureColumn(db, "listings", "can_sell_individually", "INTEGER");
  ensureColumn(db, "listings", "single_item_price", "REAL");
  ensureColumn(db, "listings", "views_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "listings", "whatsapp_clicks", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "listings", "is_hidden", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "listings", "photos", "TEXT");
  ensureColumn(db, "payments", "currency", "TEXT NOT NULL DEFAULT 'MWK'");
  ensureColumn(db, "payments", "amount", "REAL NOT NULL DEFAULT 0");
  ensureColumn(db, "orders", "settlement_route", "TEXT");
  ensureColumn(db, "sellers", "is_suspended", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "payouts", "release_entry_id", "TEXT");
  ensureColumn(db, "payouts", "provider", "TEXT");
  ensureColumn(db, "payouts", "provider_charge_id", "TEXT");
  ensureColumn(db, "payouts", "requested_by", "TEXT");
  ensureColumn(db, "payouts", "requested_at", "TEXT");
  ensureColumn(db, "listings", "deleted_at", "TEXT");
  ensureColumn(db, "listings", "deleted_by_uid", "TEXT");
  ensureColumn(db, "listings", "hard_delete_after", "TEXT");
  ensureColumn(db, "events", "creator_uid", "TEXT");
  ensureColumn(db, "events", "event_type", "TEXT NOT NULL");
  ensureColumn(db, "events", "event_title", "TEXT NOT NULL");
  ensureColumn(db, "events", "organizer_name", "TEXT NOT NULL");
  ensureColumn(db, "events", "event_date", "TEXT NOT NULL");
  ensureColumn(db, "events", "start_time", "TEXT NOT NULL");
  ensureColumn(db, "events", "venue", "TEXT NOT NULL");
  ensureColumn(db, "events", "location", "TEXT NOT NULL");
  ensureColumn(db, "events", "ticket_mode", "TEXT NOT NULL");
  ensureColumn(db, "events", "ticket_price", "REAL");
  ensureColumn(db, "events", "ticket_link", "TEXT");
  ensureColumn(db, "events", "description", "TEXT NOT NULL");
  ensureColumn(db, "events", "contact_whatsapp", "TEXT");
  ensureColumn(db, "events", "poster_alt", "TEXT");
  ensureColumn(db, "events", "spec_values", "TEXT NOT NULL");
  ensureColumn(db, "events", "status", "TEXT NOT NULL DEFAULT 'published'");
  ensureColumn(db, "events", "deleted_at", "TEXT");
}
