import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

export interface SqliteQueryResult<Row = Record<string, unknown>> {
  rows: Row[];
}

export interface SqliteClient {
  query(text: string, params?: unknown[]): Promise<SqliteQueryResult>;
  release(): void;
}

function resolveDatabasePath(): string {
  const candidates = [
    process.env.SQLITE_PATH,
    process.env.DB_PATH,
    process.env.DATABASE_FILE,
  ];

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }

  return 'market.db';
}

function ensureColumn(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
    name: string;
  }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

const databasePath = resolveDatabasePath();
const databaseDirectory = path.dirname(databasePath);
if (databaseDirectory && databaseDirectory !== '.') {
  fs.mkdirSync(databaseDirectory, { recursive: true });
}

export const sqliteDb = new Database(databasePath);
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');
sqliteDb.pragma('busy_timeout = 5000');

sqliteDb.exec(`
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

sqliteDb.exec(`
  DROP INDEX IF EXISTS idx_payment_webhook_events_provider_event_id;
  DROP INDEX IF EXISTS idx_payment_webhook_events_dedupe;

  CREATE INDEX IF NOT EXISTS idx_listings_hard_delete_after
  ON listings(hard_delete_after)
  WHERE deleted_at IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference
  ON payment_webhook_events(reference);

  CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
  ON payment_webhook_events(created_at DESC);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_event_id_active
  ON payment_webhook_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL AND processing_status <> 'duplicate';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_dedupe_active
  ON payment_webhook_events(provider, tx_ref, event_type, payload_hash)
  WHERE tx_ref IS NOT NULL
    AND event_type IS NOT NULL
    AND payload_hash IS NOT NULL
    AND processing_status <> 'duplicate';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_reference_event_active
  ON payment_webhook_events(provider, reference, event_type)
  WHERE reference IS NOT NULL
    AND event_type IS NOT NULL
    AND processing_status <> 'duplicate';

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_release_escrow
  ON payouts(escrow_id)
  WHERE escrow_id IS NOT NULL AND release_entry_id IS NOT NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_provider_charge_id
  ON payouts(provider_charge_id)
  WHERE provider_charge_id IS NOT NULL;

  CREATE INDEX IF NOT EXISTS idx_payouts_status
  ON payouts(status, created_at DESC);
`);

function normalizeSql(text: string): string {
  return text.replace(/\$(\d+)/g, '?');
}

function isResultSetStatement(sql: string): boolean {
  const trimmed = sql.trim();
  return (
    /^select\b/i.test(trimmed)
    || /^with\b/i.test(trimmed)
    || /^pragma\b/i.test(trimmed)
    || /^values\b/i.test(trimmed)
    || /\breturning\b/i.test(trimmed)
  );
}

function execute(text: string, params: unknown[] = []): SqliteQueryResult {
  const sql = normalizeSql(text);
  const trimmed = sql.trim();

  if (!trimmed) {
    return { rows: [] };
  }

  if (/^(begin|commit|rollback|savepoint|release)\b/i.test(trimmed)) {
    sqliteDb.exec(trimmed);
    return { rows: [] };
  }

  const stmt = sqliteDb.prepare(sql);
  const args = Array.isArray(params) ? params : [];

  if (isResultSetStatement(trimmed)) {
    return { rows: stmt.all(...args) as Record<string, unknown>[] };
  }

  stmt.run(...args);
  return { rows: [] };
}

export async function query(text: string, params: unknown[] = []): Promise<SqliteQueryResult> {
  return execute(text, params);
}

export const pool = {
  async connect(): Promise<SqliteClient> {
    return {
      async query(text: string, params: unknown[] = []) {
        return execute(text, params);
      },
      release() {
        return;
      },
    };
  },
};
