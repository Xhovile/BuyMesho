import type { PgCompatDatabase } from "../db.js";

function ensureColumn(
  db: PgCompatDatabase,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  db.exec(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${definition}`);
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

    CREATE TABLE IF NOT EXISTS event_creators (
      uid TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      contact_whatsapp TEXT,
      event_types TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      active_until TEXT,
      approved_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_creator_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_uid TEXT NOT NULL,
      applicant_email TEXT,
      display_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      contact_whatsapp TEXT,
      event_types TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    CREATE TABLE IF NOT EXISTS event_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      actor_uid TEXT,
      activity_type TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS event_tickets (
      id TEXT PRIMARY KEY,
      event_id BIGINT NOT NULL,
      order_id TEXT NOT NULL,
      code TEXT NOT NULL,
      ticket_title TEXT NOT NULL,
      ticket_type TEXT NOT NULL DEFAULT 'General Admission',
      holder_name TEXT NOT NULL DEFAULT '',
      holder_email TEXT NOT NULL DEFAULT '',
      holder_phone TEXT NOT NULL DEFAULT '',
      seat_or_zone TEXT,
      status TEXT NOT NULL DEFAULT 'Waiting Entry',
      purchase_date TIMESTAMPTZ,
      scanned_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      event_title TEXT NOT NULL DEFAULT '',
      event_date TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL DEFAULT '',
      end_time TEXT,
      venue TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      metadata TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_event_tickets_event_id ON event_tickets(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_tickets_event_status ON event_tickets(event_id, status);
    CREATE INDEX IF NOT EXISTS idx_event_tickets_code ON event_tickets(code);
    CREATE INDEX IF NOT EXISTS idx_event_tickets_order_id ON event_tickets(order_id);

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
  `);

  ensureColumn(db, "payments", "status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(db, "payments", "verified", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "payments", "verification", "TEXT");
  ensureColumn(db, "payments", "created_at", "TEXT NOT NULL");
  ensureColumn(db, "payments", "updated_at", "TEXT NOT NULL");
  ensureColumn(db, "seller_payout_accounts", "verification_status", "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(db, "seller_payout_accounts", "verification_attempts", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "seller_payout_accounts", "last_error", "TEXT");
  ensureColumn(db, "seller_payout_accounts", "verified_at", "TEXT");
  ensureColumn(db, "seller_payout_accounts", "replaced_from_id", "TEXT");
  ensureColumn(db, "seller_payout_accounts", "replaced_by_id", "TEXT");
  ensureColumn(db, "seller_payout_accounts", "is_active", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "seller_payout_accounts", "currency", "TEXT NOT NULL DEFAULT 'MWK'");
  ensureColumn(db, "seller_payout_accounts", "provider_ref_id", "TEXT");
  ensureColumn(db, "orders", "checkout_idempotency_key", "TEXT");
  ensureColumn(db, "orders", "checkout_request_hash", "TEXT");
  ensureColumn(db, "orders", "buyer_details", "TEXT");

  ensureColumn(db, "events", "creator_uid", "TEXT");
  ensureColumn(db, "events", "ticket_price", "REAL");
  ensureColumn(db, "events", "ticket_link", "TEXT");
  ensureColumn(db, "events", "contact_whatsapp", "TEXT");
  ensureColumn(db, "events", "poster_alt", "TEXT");
  ensureColumn(db, "events", "status", "TEXT NOT NULL DEFAULT 'published'");
  ensureColumn(db, "events", "deleted_at", "TEXT");
  ensureColumn(db, "events", "created_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "events", "updated_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "event_creators", "active_until", "TEXT");
  ensureColumn(db, "event_creators", "approved_at", "TEXT");
  ensureColumn(db, "event_creator_applications", "reviewed_at", "TEXT");
  ensureColumn(db, "event_activity", "actor_uid", "TEXT");
  ensureColumn(db, "event_activity", "metadata", "TEXT");
  ensureColumn(db, "event_activity", "created_at", "TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_buyer_checkout_idempotency
    ON orders (buyer_id, checkout_idempotency_key)
    WHERE checkout_idempotency_key IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_payments_status
    ON payments (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_events_creator_uid
    ON events (creator_uid, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_events_status
    ON events (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_event_activity_event_type
    ON event_activity (event_id, activity_type, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_conversations_buyer_updated_at
    ON conversations (buyer_uid, updated_at DESC);
  `);
}
