import type Database from "better-sqlite3";

export const MESSAGE_REPORT_REASONS = [
  "spam",
  "scam",
  "harassment",
  "fake_listing",
  "abusive_language",
  "off_platform_fraud",
] as const;

export type MessageReportReason = (typeof MESSAGE_REPORT_REASONS)[number];

export const MESSAGE_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_uid TEXT NOT NULL,
    seller_uid TEXT NOT NULL,
    listing_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_pair_listing
  ON conversations (buyer_uid, seller_uid, COALESCE(listing_id, 0));

  CREATE TABLE IF NOT EXISTS conversation_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    uid TEXT NOT NULL,
    deleted_at DATETIME,
    deleted_by_user INTEGER NOT NULL DEFAULT 0,
    archived_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (conversation_id, uid),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_uid TEXT NOT NULL,
    body TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at DATETIME,
    is_spam INTEGER NOT NULL DEFAULT 0,
    spam_flag_count INTEGER NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages (conversation_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS message_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_uid TEXT NOT NULL,
    blocked_uid TEXT NOT NULL,
    block_scope TEXT NOT NULL DEFAULT 'messages',
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (blocker_uid, blocked_uid, block_scope)
  );

  CREATE INDEX IF NOT EXISTS idx_message_blocks_blocked_uid
  ON message_blocks (blocked_uid, block_scope);

  CREATE TABLE IF NOT EXISTS message_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    message_id INTEGER,
    reporter_uid TEXT NOT NULL,
    reported_uid TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_message_reports_status_created_at
  ON message_reports (status, created_at DESC);

  CREATE TABLE IF NOT EXISTS sender_spam_profiles (
    uid TEXT PRIMARY KEY,
    spam_score INTEGER NOT NULL DEFAULT 0,
    spam_flags INTEGER NOT NULL DEFAULT 0,
    auto_limited_until DATETIME,
    last_flagged_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

export const MESSAGE_SCHEMA_MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    buyer_uid TEXT NOT NULL,
    seller_uid TEXT NOT NULL,
    listing_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_pair_listing
   ON conversations (buyer_uid, seller_uid, COALESCE(listing_id, 0))`,
  `CREATE TABLE IF NOT EXISTS conversation_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    uid TEXT NOT NULL,
    deleted_at DATETIME,
    deleted_by_user INTEGER NOT NULL DEFAULT 0,
    archived_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (conversation_id, uid),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_uid TEXT NOT NULL,
    body TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'text',
    is_read INTEGER NOT NULL DEFAULT 0,
    read_at DATETIME,
    is_spam INTEGER NOT NULL DEFAULT 0,
    spam_flag_count INTEGER NOT NULL DEFAULT 0,
    deleted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
   ON messages (conversation_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS message_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_uid TEXT NOT NULL,
    blocked_uid TEXT NOT NULL,
    block_scope TEXT NOT NULL DEFAULT 'messages',
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (blocker_uid, blocked_uid, block_scope)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_message_blocks_blocked_uid
   ON message_blocks (blocked_uid, block_scope)`,
  `CREATE TABLE IF NOT EXISTS message_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    message_id INTEGER,
    reporter_uid TEXT NOT NULL,
    reported_uid TEXT,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_message_reports_status_created_at
   ON message_reports (status, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS sender_spam_profiles (
    uid TEXT PRIMARY KEY,
    spam_score INTEGER NOT NULL DEFAULT 0,
    spam_flags INTEGER NOT NULL DEFAULT 0,
    auto_limited_until DATETIME,
    last_flagged_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
] as const;

export const MESSAGE_BLOCK_SCOPES = ["messages", "listing", "all"] as const;
export type MessageBlockScope = (typeof MESSAGE_BLOCK_SCOPES)[number];

function ensureColumn(db: Database.Database, table: string, column: string, definition: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (rows.some((row) => row.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function ensureMessageSchema(db: Database.Database) {
  db.pragma("foreign_keys = ON");
  db.exec(MESSAGE_SCHEMA_SQL);

  ensureColumn(db, "conversations", "listing_id", "INTEGER");
  ensureColumn(db, "conversations", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "conversations", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "conversations", "last_message_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "conversations", "last_message_preview", "TEXT");
  ensureColumn(db, "conversations", "buyer_unread_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "conversations", "seller_unread_count", "INTEGER NOT NULL DEFAULT 0");

  ensureColumn(db, "conversation_participants", "deleted_at", "DATETIME");
  ensureColumn(db, "conversation_participants", "deleted_by_user", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "conversation_participants", "archived_at", "DATETIME");
  ensureColumn(db, "conversation_participants", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "conversation_participants", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  ensureColumn(db, "messages", "message_type", "TEXT NOT NULL DEFAULT 'text'");
  ensureColumn(db, "messages", "is_read", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "messages", "read_at", "DATETIME");
  ensureColumn(db, "messages", "is_spam", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "messages", "spam_flag_count", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "messages", "deleted_at", "DATETIME");
  ensureColumn(db, "messages", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "messages", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  ensureColumn(db, "message_blocks", "block_scope", "TEXT NOT NULL DEFAULT 'messages'");
  ensureColumn(db, "message_blocks", "reason", "TEXT");
  ensureColumn(db, "message_blocks", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "message_blocks", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  ensureColumn(db, "message_reports", "conversation_id", "INTEGER");
  ensureColumn(db, "message_reports", "message_id", "INTEGER");
  ensureColumn(db, "message_reports", "reported_uid", "TEXT");
  ensureColumn(db, "message_reports", "details", "TEXT");
  ensureColumn(db, "message_reports", "status", "TEXT NOT NULL DEFAULT 'open'");
  ensureColumn(db, "message_reports", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "message_reports", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  ensureColumn(db, "sender_spam_profiles", "spam_score", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sender_spam_profiles", "spam_flags", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "sender_spam_profiles", "auto_limited_until", "DATETIME");
  ensureColumn(db, "sender_spam_profiles", "last_flagged_at", "DATETIME");
  ensureColumn(db, "sender_spam_profiles", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "sender_spam_profiles", "updated_at", "DATETIME DEFAULT CURRENT_TIMESTAMP");

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_conversations_pair_listing
    ON conversations (listing_id, buyer_uid, seller_uid);

    CREATE INDEX IF NOT EXISTS idx_conversations_buyer_updated_at
    ON conversations (buyer_uid, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_conversations_seller_updated_at
    ON conversations (seller_uid, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
    ON messages (conversation_id, created_at ASC, id ASC);

    CREATE INDEX IF NOT EXISTS idx_message_reports_status_created_at
    ON message_reports (status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_message_blocks_blocked_uid
    ON message_blocks (blocked_uid, block_scope);
  `);
}

export function isMessageReportReason(value: string): value is MessageReportReason {
  return (MESSAGE_REPORT_REASONS as readonly string[]).includes(value);
}
