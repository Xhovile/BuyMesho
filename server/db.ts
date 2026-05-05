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
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    provider_reference TEXT,
    currency TEXT NOT NULL,
    amount REAL NOT NULL,
    checkout_url TEXT,
    paid_at TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    verification TEXT,
    raw_metadata TEXT,
    raw_response TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_payments_order_id
  ON payments (order_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    buyer_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    currency TEXT NOT NULL,
    subtotal_amount REAL NOT NULL,
    subtotal_currency TEXT NOT NULL,
    fees_amount REAL,
    fees_currency TEXT,
    total_amount REAL NOT NULL,
    total_currency TEXT NOT NULL,
    payment_provider TEXT,
    payment_reference TEXT,
    escrow_id TEXT,
    items TEXT NOT NULL,
    placed_at TEXT,
    paid_at TEXT,
    fulfilled_at TEXT,
    raw_metadata TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_orders_payment_reference
  ON orders (payment_reference);
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
