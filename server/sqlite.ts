import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _db: Database.Database | null = null;

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

    CREATE TABLE IF NOT EXISTS sellers (
      uid TEXT PRIMARY KEY,
      email TEXT,
      business_name TEXT,
      business_logo TEXT,
      is_verified INTEGER NOT NULL DEFAULT 0
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
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      processed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payouts_seller_id ON payouts(seller_id);
  `);

  ensureColumn(db, "payment_webhook_events", "provider_event_id", "TEXT");
  ensureColumn(db, "payment_webhook_events", "tx_ref", "TEXT");
  ensureColumn(db, "payment_webhook_events", "payload_hash", "TEXT");
  ensureColumn(
    db,
    "payment_webhook_events",
    "processing_status",
    "TEXT NOT NULL DEFAULT 'received'",
  );
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

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_reference
    ON payment_webhook_events(reference);

    CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_created_at
    ON payment_webhook_events(created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_event_id
    ON payment_webhook_events(provider, provider_event_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_dedupe
    ON payment_webhook_events(provider, tx_ref, event_type, payload_hash);
  `);
}

export type PaymentWebhookProcessingStatus =
  | "received"
  | "processing"
  | "processed"
  | "ignored"
  | "failed"
  | "signature_invalid";

export interface InsertPaymentWebhookEventInput {
  provider: string;
  providerEventId?: string | null;
  reference?: string | null;
  txRef?: string | null;
  eventType?: string | null;
  payloadHash?: string | null;
  processingStatus: PaymentWebhookProcessingStatus | string;
  signatureValid: boolean;
  payload?: string | null;
  error?: string | null;
  createdAt: string;
}

export type InsertPaymentWebhookEventResult =
  | { inserted: true; id: number }
  | { inserted: false; duplicate: true; existingId?: number };

export interface FindPaymentWebhookDuplicateInput {
  provider: string;
  providerEventId?: string | null;
  txRef?: string | null;
  eventType?: string | null;
  payloadHash?: string | null;
}

export interface UpdatePaymentWebhookEventStatusOptions {
  processedAt?: string | null;
  error?: string | null;
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function isPaymentWebhookUniqueConstraintFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const err = error as { code?: unknown; message?: unknown };
  if (
    err.code !== "SQLITE_CONSTRAINT_UNIQUE" &&
    err.code !== "SQLITE_CONSTRAINT"
  ) {
    return false;
  }

  const message = String(err.message ?? "");
  return (
    message.includes("idx_payment_webhook_events_provider_event_id") ||
    message.includes("idx_payment_webhook_events_dedupe") ||
    message.includes("payment_webhook_events.provider") ||
    message.includes("payment_webhook_events.tx_ref")
  );
}

export function findPaymentWebhookDuplicate(
  input: FindPaymentWebhookDuplicateInput,
): { id: number } | null {
  const db = getPaymentDb();
  const provider = normalizeOptionalText(input.provider);
  const providerEventId = normalizeOptionalText(input.providerEventId);
  const txRef = normalizeOptionalText(input.txRef);
  const eventType = normalizeOptionalText(input.eventType);
  const payloadHash = normalizeOptionalText(input.payloadHash);

  if (!provider) return null;

  if (providerEventId) {
    const row = db
      .prepare(
        `SELECT id FROM payment_webhook_events
         WHERE provider = ? AND provider_event_id = ?
         LIMIT 1`,
      )
      .get(provider, providerEventId) as { id: number } | undefined;
    if (row) return row;
  }

  if (txRef && eventType && payloadHash) {
    const row = db
      .prepare(
        `SELECT id FROM payment_webhook_events
         WHERE provider = ? AND tx_ref = ? AND event_type = ? AND payload_hash = ?
         LIMIT 1`,
      )
      .get(provider, txRef, eventType, payloadHash) as
      | { id: number }
      | undefined;
    if (row) return row;
  }

  return null;
}

export function insertPaymentWebhookEvent(
  input: InsertPaymentWebhookEventInput,
): InsertPaymentWebhookEventResult {
  const db = getPaymentDb();
  const normalized = {
    provider: normalizeOptionalText(input.provider),
    providerEventId: normalizeOptionalText(input.providerEventId),
    reference: normalizeOptionalText(input.reference),
    txRef: normalizeOptionalText(input.txRef),
    eventType: normalizeOptionalText(input.eventType),
    payloadHash: normalizeOptionalText(input.payloadHash),
    processingStatus:
      normalizeOptionalText(input.processingStatus) ?? "received",
    payload: input.payload ?? null,
    error: normalizeOptionalText(input.error),
  };

  if (!normalized.provider) {
    throw new Error("payment webhook provider is required");
  }

  try {
    const result = db
      .prepare(
        `INSERT INTO payment_webhook_events (
           provider, provider_event_id, reference, tx_ref, event_type, payload_hash,
           processing_status, error, signature_valid, payload, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        normalized.provider,
        normalized.providerEventId,
        normalized.reference,
        normalized.txRef,
        normalized.eventType,
        normalized.payloadHash,
        normalized.processingStatus,
        normalized.error,
        input.signatureValid ? 1 : 0,
        normalized.payload,
        input.createdAt,
      );

    return { inserted: true, id: Number(result.lastInsertRowid) };
  } catch (error) {
    if (!isPaymentWebhookUniqueConstraintFailure(error)) {
      throw error;
    }

    const existing = findPaymentWebhookDuplicate({
      provider: normalized.provider,
      providerEventId: normalized.providerEventId,
      txRef: normalized.txRef,
      eventType: normalized.eventType,
      payloadHash: normalized.payloadHash,
    });

    return {
      inserted: false,
      duplicate: true,
      ...(existing ? { existingId: existing.id } : {}),
    };
  }
}

export function updatePaymentWebhookEventStatus(
  id: number,
  status: PaymentWebhookProcessingStatus | string,
  options: UpdatePaymentWebhookEventStatusOptions = {},
): void {
  const db = getPaymentDb();
  db.prepare(
    `UPDATE payment_webhook_events
     SET processing_status = ?,
         processed_at = COALESCE(?, processed_at),
         error = ?
     WHERE id = ?`,
  ).run(
    normalizeOptionalText(status) ?? "received",
    options.processedAt ?? null,
    normalizeOptionalText(options.error),
    id,
  );
}

const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function checkIdempotencyKey(
  key: string,
): Record<string, unknown> | null {
  const db = getPaymentDb();
  const cutoff = new Date(Date.now() - IDEMPOTENCY_TTL_MS).toISOString();
  const row = db
    .prepare(
      "SELECT response FROM idempotency_keys WHERE key = ? AND created_at > ?",
    )
    .get(key, cutoff) as { response: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.response) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function storeIdempotencyKey(
  key: string,
  response: Record<string, unknown>,
): void {
  const db = getPaymentDb();
  db.prepare(
    "INSERT OR REPLACE INTO idempotency_keys (key, response, created_at) VALUES (?, ?, ?)",
  ).run(key, JSON.stringify(response), new Date().toISOString());
}

export function getPaymentDb(): Database.Database {
  if (!_db) {
    const dbPath = path.resolve(__dirname, "..", "market.db");
    _db = new Database(dbPath);
    initPaymentSchema(_db);
  }
  return _db;
}
