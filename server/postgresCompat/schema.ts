import { createHash } from 'crypto';
import type { PgCompatDatabase } from './types.js';

export function ensureColumn(db: PgCompatDatabase, table: string, column: string, definition: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((entry) => entry.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

export function initPaymentSchema(db: PgCompatDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reference TEXT NOT NULL UNIQUE,
      provider_reference TEXT,
      currency TEXT NOT NULL,
      amount INTEGER NOT NULL,
      checkout_url TEXT,
      paid_at TEXT,
      raw_response TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      verification TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payment_webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      provider_event_id TEXT,
      reference TEXT,
      tx_ref TEXT,
      event_type TEXT,
      payload_hash TEXT NOT NULL,
      processing_status TEXT NOT NULL,
      signature_valid INTEGER NOT NULL DEFAULT 0,
      payload TEXT,
      error TEXT,
      processed_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  ensureColumn(db, 'payments', 'status', "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(db, 'payments', 'verified', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'payments', 'verification', 'TEXT');
  ensureColumn(db, 'payments', 'created_at', 'TEXT NOT NULL');
  ensureColumn(db, 'payments', 'updated_at', 'TEXT NOT NULL');
  ensureColumn(db, 'listings', 'condition', "TEXT NOT NULL DEFAULT 'used'");
  ensureColumn(db, 'listings', 'category', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'listings', 'university', "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, 'listings', 'whatsapp_number', 'TEXT');
  ensureColumn(db, 'listings', 'views_count', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'seller_payout_accounts', 'verification_status', "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(db, 'seller_payout_accounts', 'verification_attempts', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'seller_payout_accounts', 'last_error', 'TEXT');
  ensureColumn(db, 'seller_payout_accounts', 'verified_at', 'TEXT');
  ensureColumn(db, 'seller_payout_accounts', 'replaced_from_id', 'TEXT');
  ensureColumn(db, 'seller_payout_accounts', 'replaced_by_id', 'TEXT');
  ensureColumn(db, 'seller_payout_accounts', 'is_active', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(db, 'seller_payout_accounts', 'currency', "TEXT NOT NULL DEFAULT 'MWK'");
  ensureColumn(db, 'seller_payout_accounts', 'provider_ref_id', 'TEXT');
  ensureColumn(db, 'orders', 'checkout_idempotency_key', 'TEXT');
  ensureColumn(db, 'orders', 'checkout_request_hash', 'TEXT');
  ensureColumn(db, 'orders', 'buyer_details', 'TEXT');
  ensureColumn(db, 'orders', 'delivery_status', "TEXT NOT NULL DEFAULT 'action_required'");
  ensureColumn(db, 'disputes', 'status', "TEXT NOT NULL DEFAULT 'open'");
  ensureColumn(db, 'disputes', 'ticket_id', 'TEXT');

  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON payments(provider_reference)',
    'CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference ON payment_webhook_events(reference)',
    'CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_payload_hash ON payment_webhook_events(payload_hash)',
  ];
  for (const sql of indexes) db.exec(sql);
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
