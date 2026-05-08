import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _db: Database.Database | null = null;

function ensureColumn(db: Database.Database, tableName: string, columnName: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function initPaymentSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      seller_uid TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      quantity INTEGER NOT NULL DEFAULT 1,
      sold_quantity INTEGER NOT NULL DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      reference TEXT,
      event_type TEXT,
      signature_valid INTEGER NOT NULL DEFAULT 0,
      payload TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference
    ON payment_webhook_events(reference);

    CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
    ON payment_webhook_events(created_at DESC);

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
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      processed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON payouts(seller_id);
  `);

  ensureColumn(db, 'payments', 'currency', "TEXT NOT NULL DEFAULT 'MWK'");
  ensureColumn(db, 'payments', 'amount', 'REAL NOT NULL DEFAULT 0');
}

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function checkIdempotencyKey(key: string): Record<string, unknown> | null {
  const db = getPaymentDb();
  const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString();
  const row = db
    .prepare('SELECT response FROM idempotency_keys WHERE key = ? AND created_at > ?')
    .get(key, cutoff) as { response: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.response) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function storeIdempotencyKey(key: string, response: Record<string, unknown>): void {
  const db = getPaymentDb();
  db.prepare(
    'INSERT OR REPLACE INTO idempotency_keys (key, response, created_at) VALUES (?, ?, ?)',
  ).run(key, JSON.stringify(response), new Date().toISOString());
}

export function getPaymentDb(): Database.Database {
  if (!_db) {
    const dbPath = path.resolve(__dirname, '..', 'market.db');
    _db = new Database(dbPath);
    initPaymentSchema(_db);
  }
  return _db;
}
