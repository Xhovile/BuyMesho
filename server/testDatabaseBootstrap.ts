import { getPaymentDb } from './postgresCompat.js';
import { runMigrations } from './db/migrations/index.js';

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Test database bootstrap may only run with NODE_ENV=test.');
}

const db = getPaymentDb();

// The production migration layer assumes these foundational tables already exist.
// CI uses a pristine PostgreSQL database, so create the minimum base schema first.
db.exec(`
  CREATE TABLE IF NOT EXISTS sellers (
    uid TEXT PRIMARY KEY,
    email TEXT,
    business_name TEXT,
    business_logo TEXT,
    university TEXT,
    bio TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    is_seller INTEGER NOT NULL DEFAULT 0,
    is_suspended INTEGER NOT NULL DEFAULT 0,
    profile_views INTEGER NOT NULL DEFAULT 0,
    join_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    masked_account TEXT NOT NULL DEFAULT '',
    destination_fingerprint TEXT NOT NULL DEFAULT '',
    is_default INTEGER NOT NULL DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'pending',
    verification_attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    verified_at TIMESTAMPTZ,
    replaced_from_id TEXT,
    replaced_by_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'marketplace',
    status TEXT NOT NULL DEFAULT 'pending',
    currency TEXT NOT NULL DEFAULT 'MWK',
    subtotal_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    subtotal_currency TEXT NOT NULL DEFAULT 'MWK',
    fees_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    fees_currency TEXT NOT NULL DEFAULT 'MWK',
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_currency TEXT NOT NULL DEFAULT 'MWK',
    payment_provider TEXT,
    payment_reference TEXT,
    escrow_id TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    placed_at TEXT,
    paid_at TEXT,
    fulfilled_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'paychangu',
    method TEXT NOT NULL DEFAULT 'unknown',
    status TEXT NOT NULL DEFAULT 'pending',
    reference TEXT NOT NULL UNIQUE,
    provider_reference TEXT,
    currency TEXT NOT NULL DEFAULT 'MWK',
    amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    checkout_url TEXT,
    paid_at TEXT,
    raw_response TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    verification TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS escrows (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    currency TEXT NOT NULL,
    balance_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    balance_currency TEXT NOT NULL,
    entries TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS disputes (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    escrow_id TEXT,
    opened_by TEXT,
    state TEXT NOT NULL DEFAULT 'open',
    reason TEXT,
    details TEXT,
    resolution TEXT,
    resolved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    seller_id TEXT NOT NULL,
    order_id TEXT,
    escrow_id TEXT,
    release_entry_id TEXT,
    destination_account_id TEXT,
    amount INTEGER NOT NULL DEFAULT 0,
    gross_amount INTEGER NOT NULL DEFAULT 0,
    platform_fee_amount INTEGER NOT NULL DEFAULT 0,
    processing_fee_amount INTEGER NOT NULL DEFAULT 0,
    reserve_amount INTEGER NOT NULL DEFAULT 0,
    reserve_cap_amount INTEGER NOT NULL DEFAULT 0,
    manual_adjustment_amount INTEGER NOT NULL DEFAULT 0,
    payout_fee_amount INTEGER NOT NULL DEFAULT 0,
    seller_receives_amount INTEGER NOT NULL DEFAULT 0,
    net_amount INTEGER NOT NULL DEFAULT 0,
    formula_snapshot TEXT,
    currency TEXT NOT NULL DEFAULT 'MWK',
    status TEXT NOT NULL DEFAULT 'pending_settlement',
    provider TEXT,
    provider_charge_id TEXT,
    provider_ref_id TEXT,
    provider_transaction_id TEXT,
    provider_status TEXT,
    failure_reason TEXT,
    manual_review_reason TEXT,
    approved_by TEXT,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    last_attempt_id TEXT,
    raw_request TEXT,
    raw_response TEXT,
    processed_by TEXT,
    gross_amount_snapshot INTEGER,
    last_adjustment_id TEXT,
    requested_by TEXT,
    requested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT,
    reference TEXT,
    payload TEXT,
    status TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, event_id)
  );

  CREATE TABLE IF NOT EXISTS idempotency_keys (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    scope TEXT NOT NULL,
    request_hash TEXT,
    response_status INTEGER,
    response_body TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(scope, key)
  );

  CREATE TABLE IF NOT EXISTS events (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    creator_uid TEXT,
    event_type TEXT NOT NULL DEFAULT 'event',
    event_title TEXT NOT NULL DEFAULT '',
    organizer_name TEXT NOT NULL DEFAULT '',
    event_date TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT,
    venue TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    ticket_mode TEXT NOT NULL DEFAULT 'free',
    ticket_price DOUBLE PRECISION,
    ticket_link TEXT,
    description TEXT NOT NULL DEFAULT '',
    contact_whatsapp TEXT,
    poster_alt TEXT,
    spec_values TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'published',
    publication_status TEXT NOT NULL DEFAULT 'published',
    publication_mode TEXT NOT NULL DEFAULT 'immediate',
    publication_at TIMESTAMPTZ,
    runtime_mode TEXT NOT NULL DEFAULT 'automatic',
    deleted_at TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

runMigrations();

// Keep the CI database aligned with the current PostgreSQL repositories.
db.exec(`
  ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_verified INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_seller INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sellers ADD COLUMN IF NOT EXISTS is_suspended INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'action_required';
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS settlement_route TEXT;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_idempotency_key TEXT;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS checkout_request_hash TEXT;
  ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_details TEXT;
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS provider_event_id TEXT;
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS tx_ref TEXT;
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS payload_hash TEXT;
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'received';
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS signature_valid INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS error TEXT;
  ALTER TABLE payment_webhook_events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
  CREATE TABLE IF NOT EXISTS escrow_events (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    escrow_id TEXT,
    order_id TEXT,
    event_type TEXT NOT NULL,
    actor_type TEXT,
    actor_id TEXT,
    note TEXT,
    payload TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_event_id
    ON payment_webhook_events(provider, provider_event_id);
  CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference_event
    ON payment_webhook_events(provider, reference, event_type);
  CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_tx_ref_event_hash
    ON payment_webhook_events(provider, tx_ref, event_type, payload_hash);
`);
console.log('[CI] Test PostgreSQL schema bootstrap completed.');
await db.close();
