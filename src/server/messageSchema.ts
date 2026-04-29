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
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
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
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (listing_id) REFERENCES listings(id)
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

export function isMessageReportReason(value: string): value is MessageReportReason {
  return (MESSAGE_REPORT_REASONS as readonly string[]).includes(value);
}
