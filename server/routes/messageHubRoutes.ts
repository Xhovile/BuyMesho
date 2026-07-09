import type { Express, Request, Response } from "express";
import { sqliteDb as db } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { hasAdminAccess } from "../auth/adminAccess.js";
import { ensureMessageSchema, MESSAGE_BLOCK_SCOPES, MESSAGE_REPORT_REASONS, type MessageBlockScope } from "../../src/server/messageSchema.js";
db.pragma("foreign_keys = ON");

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.messageHubRoutesInstalled");
const MODERATION_ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.messageHubModerationRoutesInstalled");

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      buyer_uid TEXT NOT NULL,
      seller_uid TEXT NOT NULL,
      last_message_preview TEXT,
      last_message_at DATETIME,
      buyer_unread_count INTEGER NOT NULL DEFAULT 0,
      seller_unread_count INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (listing_id, buyer_uid, seller_uid),
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    );

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

    CREATE TABLE IF NOT EXISTS sender_spam_profiles (
      uid TEXT PRIMARY KEY,
      spam_score INTEGER NOT NULL DEFAULT 0,
      spam_flags INTEGER NOT NULL DEFAULT 0,
      auto_limited_until DATETIME,
      last_flagged_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
