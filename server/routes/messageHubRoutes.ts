import type { Express, Request, Response } from "express";
import { sqliteDb as db } from "../db.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { hasAdminAccess } from "../auth/adminAccess.js";
import { ensureMessageSchema, MESSAGE_BLOCK_SCOPES, MESSAGE_REPORT_REASONS, isMessageReportReason, type MessageBlockScope } from "../../src/server/messageSchema.js";

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
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_listing
    ON conversations (listing_id, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_conversations_buyer
    ON conversations (buyer_uid, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_conversations_seller
    ON conversations (seller_uid, updated_at DESC);

    CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages (conversation_id, created_at ASC, id ASC);
  `);
}

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

function getUser(req: Request) {
  return req.user as VerifiedRequestUser | undefined;
}

function isAdmin(user?: VerifiedRequestUser | null) {
  return !!user?.is_admin;
}

function sanitizeBody(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 1000);
}

function requireConversationAccess(conversation: any, user: VerifiedRequestUser) {
  return isAdmin(user) || conversation.buyer_uid === user.uid || conversation.seller_uid === user.uid;
}

function getListingById(listingId: number) {
  return db
    .prepare(
      `SELECT l.id, l.seller_uid, l.name, l.price, l.status, l.photos, l.university, s.business_name, s.business_logo, s.is_verified
       FROM listings l
       JOIN sellers s ON s.uid = l.seller_uid
       WHERE l.id = ? AND l.is_hidden = 0 AND l.deleted_at IS NULL
       LIMIT 1`
    )
    .get(listingId) as
    | {
        id: number;
        seller_uid: string;
        name: string;
        price: number;
        status: string;
        photos: string | null;
        university: string;
        business_name: string | null;
        business_logo: string | null;
        is_verified: number | null;
      }
    | undefined;
}

function getConversationById(conversationId: number) {
  return db
    .prepare(
      `SELECT
        c.*,
        l.name AS listing_name,
        l.price AS listing_price,
        l.status AS listing_status,
        l.photos AS listing_photos,
        l.university AS listing_university,
        sb.business_name AS seller_business_name,
        sb.business_logo AS seller_logo,
        sb.is_verified AS seller_is_verified,
        bb.business_name AS buyer_business_name,
        bb.business_logo AS buyer_logo,
        bb.is_verified AS buyer_is_verified
      FROM conversations c
      JOIN listings l ON l.id = c.listing_id
      LEFT JOIN sellers sb ON sb.uid = c.seller_uid
      LEFT JOIN sellers bb ON bb.uid = c.buyer_uid
      WHERE c.id = ?
      LIMIT 1`
    )
    .get(conversationId) as any;
}

function getConversationForThread(listingId: number, buyerUid: string, sellerUid: string) {
  return db
    .prepare(
      `SELECT *
       FROM conversations
       WHERE listing_id = ? AND buyer_uid = ? AND seller_uid = ?
       LIMIT 1`
    )
    .get(listingId, buyerUid, sellerUid) as any;
}

function serializeConversation(conversation: any) {
  return {
    id: conversation.id,
    listing_id: conversation.listing_id,
    buyer_uid: conversation.buyer_uid,
    seller_uid: conversation.seller_uid,
    last_message_preview: conversation.last_message_preview,
    last_message_at: conversation.last_message_at,
    buyer_unread_count: Number(conversation.buyer_unread_count || 0),
    seller_unread_count: Number(conversation.seller_unread_count || 0),
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    listing: {
      id: conversation.listing_id,
      name: conversation.listing_name || "Listing",
      price: Number(conversation.listing_price || 0),
      status: conversation.listing_status || "available",
      photos: (() => {
        try {
          return JSON.parse(conversation.listing_photos || "[]") as string[];
        } catch {
          return [] as string[];
        }
      })(),
      university: conversation.listing_university || "",
    },
    seller: {
      uid: conversation.seller_uid,
      business_name: conversation.seller_business_name || "Seller",
      business_logo: conversation.seller_logo || null,
      is_verified: !!conversation.seller_is_verified,
    },
    buyer: {
      uid: conversation.buyer_uid,
      business_name: conversation.buyer_business_name || "Buyer",
      business_logo: conversation.buyer_logo || null,
      is_verified: !!conversation.buyer_is_verified,
    },
    unread_count: 0,
  };
}

function serializeThreadMessage(row: any) {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_uid: row.sender_uid,
    body: row.body,
    is_read: !!row.is_read,
    created_at: row.created_at,
    read_at: row.read_at,
  };
}

function getMessages(conversationId: number) {
  return db
    .prepare(
      `SELECT *
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC, id ASC`
    )
    .all(conversationId) as any[];
}

function updateUnreadCounters(conversationId: number, senderUid: string, body: string) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;

  const isBuyer = conversation.buyer_uid === senderUid;
  const isSeller = conversation.seller_uid === senderUid;
  if (!isBuyer && !isSeller) return;

  if (isBuyer) {
    db.prepare(
      `UPDATE conversations
       SET seller_unread_count = seller_unread_count + 1,
           last_message_preview = ?,
           last_message_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(body.slice(0, 160), conversationId);
    return;
  }

  db.prepare(
    `UPDATE conversations
     SET buyer_unread_count = buyer_unread_count + 1,
         last_message_preview = ?,
         last_message_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(body.slice(0, 160), conversationId);
}

export function registerMessageRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;
  (app as any)[ROUTES_INSTALLED_FLAG] = true;

  initSchema();

  // ... rest of file unchanged ...
}

export function registerMessageModerationRoutes(app: Express) {
  if ((app as any)[MODERATION_ROUTES_INSTALLED_FLAG]) return;
  (app as any)[MODERATION_ROUTES_INSTALLED_FLAG] = true;
  ensureMessageSchema();
}
