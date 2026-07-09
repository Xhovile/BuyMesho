import type { Express } from "express";
import { sqliteDb as db } from "../db.js";

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
      UNIQUE (listing_id, buyer_uid, seller_uid)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_uid TEXT NOT NULL,
      body TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      read_at DATETIME
    );
  `);
}

export function registerMessageRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;
  try {
    initSchema();
  } catch {
    // keep startup resilient if the compatibility DB cannot apply schema here
  }
  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}

export function registerMessageModerationRoutes(app: Express) {
  if ((app as any)[MODERATION_ROUTES_INSTALLED_FLAG]) return;
  (app as any)[MODERATION_ROUTES_INSTALLED_FLAG] = true;
}
