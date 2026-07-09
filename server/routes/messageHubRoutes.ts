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

ensureMessageSchema(db);

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

type ConversationRow = {
  id: number;
  listing_id: number;
  buyer_uid: string;
  seller_uid: string;
  last_message_preview: string | null;
  last_message_at: string | null;
  buyer_unread_count: number;
  seller_unread_count: number;
  created_at: string;
  updated_at: string;
  listing_name?: string | null;
  listing_price?: number | null;
  listing_status?: string | null;
  listing_photos?: string | null;
  listing_university?: string | null;
  seller_business_name?: string | null;
  seller_logo?: string | null;
  seller_is_verified?: number | null;
  buyer_business_name?: string | null;
  buyer_logo?: string | null;
  buyer_is_verified?: number | null;
};

type ParticipantRow = {
  id: number;
  conversation_id: number;
  uid: string;
  deleted_at: string | null;
  deleted_by_user: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: number;
  conversation_id: number;
  sender_uid: string;
  body: string;
  message_type: string;
  is_read: number;
  read_at: string | null;
  is_spam: number;
  spam_flag_count: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type BlockRow = {
  id: number;
  blocker_uid: string;
  blocked_uid: string;
  block_scope: MessageBlockScope;
  reason: string | null;
  created_at: string;
  updated_at: string;
};

function currentUser(req: Request) {
  return req.user as VerifiedRequestUser | undefined;
}

function sendOk(res: Response, data?: unknown) {
  return res.json({ ok: true, data });
}

function sendError(res: Response, status: number, error: string) {
  return res.status(status).json({ ok: false, error });
}

function sanitizeText(value: unknown, maxLength = 1000) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLength);
}

function parsePhotos(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean);
  } catch {
    return [];
  }
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

function ensureParticipants(conversationId: number, buyerUid: string, sellerUid: string) {
  db.prepare(
    `INSERT OR IGNORE INTO conversation_participants (conversation_id, uid) VALUES (?, ?)`
  ).run(conversationId, buyerUid);
  db.prepare(
    `INSERT OR IGNORE INTO conversation_participants (conversation_id, uid) VALUES (?, ?)`
  ).run(conversationId, sellerUid);
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
    .get(conversationId) as ConversationRow | undefined;
}

function getConversationByListing(listingId: number, buyerUid: string, sellerUid: string) {
  return db
    .prepare(
      `SELECT *
       FROM conversations
       WHERE listing_id = ? AND buyer_uid = ? AND seller_uid = ?
       LIMIT 1`
    )
    .get(listingId, buyerUid, sellerUid) as ConversationRow | undefined;
}

function getParticipant(conversationId: number, uid: string) {
  return db
    .prepare(
      `SELECT *
       FROM conversation_participants
       WHERE conversation_id = ? AND uid = ?
       LIMIT 1`
    )
    .get(conversationId, uid) as ParticipantRow | undefined;
}

function getBlockRecord(blockerUid: string, blockedUid: string, blockScope?: MessageBlockScope) {
  const scopeFilter = blockScope ? "AND block_scope = ?" : "";
  const params = blockScope ? [blockerUid, blockedUid, blockScope] : [blockerUid, blockedUid];
  return db
    .prepare(
      `SELECT *
       FROM message_blocks
       WHERE blocker_uid = ? AND blocked_uid = ? ${scopeFilter}
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    )
    .get(...params) as BlockRow | undefined;
}

function getBlockState(userUid: string, otherUid: string) {
  const blockByYou = db
    .prepare(
      `SELECT *
       FROM message_blocks
       WHERE blocker_uid = ? AND blocked_uid = ? AND block_scope IN ('messages', 'listing', 'all')
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    )
    .get(userUid, otherUid) as BlockRow | undefined;

  const blockByOther = db
    .prepare(
      `SELECT *
       FROM message_blocks
       WHERE blocker_uid = ? AND blocked_uid = ? AND block_scope IN ('messages', 'listing', 'all')
       ORDER BY created_at DESC, id DESC
       LIMIT 1`
    )
    .get(otherUid, userUid) as BlockRow | undefined;

  return {
    blockedByYou: !!blockByYou,
    blockedByOther: !!blockByOther,
    canReply: !blockByYou && !blockByOther,
    blockedListingContact: !!blockByYou || !!blockByOther,
    blockByYou,
    blockByOther,
  };
}

function getParticipantVisibility(participant: ParticipantRow | undefined) {
  return {
    deletedAt: participant?.deleted_at ?? null,
    deletedByUser: participant ? participant.deleted_by_user === 1 : false,
    hidden: !!participant?.deleted_at,
  };
}

function serializeConversation(conversation: ConversationRow, viewerUid: string) {
  const otherUid = conversation.buyer_uid === viewerUid ? conversation.seller_uid : conversation.buyer_uid;
  const visibility = getParticipantVisibility(getParticipant(conversation.id, viewerUid));
  const blocks = getBlockState(viewerUid, otherUid);

  return {
    id: conversation.id,
    listing_id: conversation.listing_id,
    buyer_uid: conversation.buyer_uid,
    seller_uid: conversation.seller_uid,
    last_message_preview: conversation.last_message_preview,
    last_message_at: conversation.last_message_at,
    buyer_unread_count: Number(conversation.buyer_unread_count || 0),
    seller_unread_count: Number(conversation.seller_unread_count || 0),
    unread_count: conversation.buyer_uid === viewerUid ? Number(conversation.buyer_unread_count || 0) : Number(conversation.seller_unread_count || 0),
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    listing: {
      id: conversation.listing_id,
      name: conversation.listing_name || "Listing",
      price: Number(conversation.listing_price || 0),
      status: conversation.listing_status || "available",
      photos: parsePhotos(conversation.listing_photos),
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
    blocked_by_you: blocks.blockedByYou,
    blocked_by_other: blocks.blockedByOther,
    can_reply: blocks.canReply,
    blocked_listing_contact: blocks.blockedListingContact,
    deleted_at: visibility.deletedAt,
  };
}

function serializeMessage(message: MessageRow) {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_uid: message.sender_uid,
    body: message.body,
    message_type: message.message_type,
    is_read: message.is_read === 1,
    read_at: message.read_at,
    is_spam: message.is_spam === 1,
    spam_flag_count: Number(message.spam_flag_count || 0),
    deleted_at: message.deleted_at,
    created_at: message.created_at,
    updated_at: message.updated_at,
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
    .all(conversationId) as MessageRow[];
}

function clearParticipantDeletion(conversationId: number, uid: string) {
  db.prepare(
    `UPDATE conversation_participants
     SET deleted_at = NULL,
         deleted_by_user = 0,
         updated_at = CURRENT_TIMESTAMP
     WHERE conversation_id = ? AND uid = ?`
  ).run(conversationId, uid);
}

function ensureParticipantVisible(conversationId: number, uid: string) {
  db.prepare(
    `INSERT OR IGNORE INTO conversation_participants (conversation_id, uid, deleted_at, deleted_by_user)
     VALUES (?, ?, NULL, 0)`
  ).run(conversationId, uid);
}

function markConversationUnread(conversationId: number, senderUid: string, body: string) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return;

  if (conversation.buyer_uid === senderUid) {
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

function flagSpamProfile(uid: string) {
  const existing = db
    .prepare(`SELECT * FROM sender_spam_profiles WHERE uid = ? LIMIT 1`)
    .get(uid) as { uid: string; spam_score: number; spam_flags: number } | undefined;

  if (!existing) {
    db.prepare(
      `INSERT INTO sender_spam_profiles (uid, spam_score, spam_flags, last_flagged_at)
       VALUES (?, 1, 1, CURRENT_TIMESTAMP)`
    ).run(uid);
    return;
  }

  const spamFlags = Number(existing.spam_flags || 0) + 1;
  const spamScore = Number(existing.spam_score || 0) + 1;
  const autoLimit = spamFlags >= 3 ? ", auto_limited_until = datetime('now', '+7 days')" : "";

  db.prepare(
    `UPDATE sender_spam_profiles
     SET spam_score = ?,
         spam_flags = ?,
         last_flagged_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP${autoLimit}
     WHERE uid = ?`
  ).run(spamScore, spamFlags, uid);
}

function createReport(params: {
  conversationId: number | null;
  messageId: number | null;
  reporterUid: string;
  reportedUid: string | null;
  reason: string;
  details?: string | null;
}) {
  const result = db
    .prepare(
      `INSERT INTO message_reports (
        conversation_id,
        message_id,
        reporter_uid,
        reported_uid,
        reason,
        details,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run(
      params.conversationId,
      params.messageId,
      params.reporterUid,
      params.reportedUid,
      params.reason,
      params.details ?? null
    );

  return Number(result.lastInsertRowid);
}

function createOrGetConversation(listingId: number, buyerUid: string, sellerUid: string) {
  const existing = getConversationByListing(listingId, buyerUid, sellerUid);
  if (existing) {
    ensureParticipants(existing.id, buyerUid, sellerUid);
    return existing;
  }

  const result = db
    .prepare(
      `INSERT INTO conversations (
        listing_id,
        buyer_uid,
        seller_uid,
        last_message_preview,
        last_message_at,
        buyer_unread_count,
        seller_unread_count,
        updated_at
      ) VALUES (?, ?, ?, NULL, NULL, 0, 0, CURRENT_TIMESTAMP)`
    )
    .run(listingId, buyerUid, sellerUid);

  const created = getConversationById(Number(result.lastInsertRowid));
  if (!created) {
    throw new Error("Failed to create conversation");
  }

  ensureParticipants(created.id, buyerUid, sellerUid);
  return created;
}

function canAccessConversation(conversation: ConversationRow, user: VerifiedRequestUser) {
  return conversation.buyer_uid === user.uid || conversation.seller_uid === user.uid || user.is_admin;
}

function inboxQuery(user: VerifiedRequestUser) {
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
       LEFT JOIN conversation_participants p ON p.conversation_id = c.id AND p.uid = ?
       WHERE (c.buyer_uid = ? OR c.seller_uid = ? OR ? = 1)
         AND (p.deleted_at IS NULL OR p.id IS NULL)
       ORDER BY COALESCE(c.last_message_at, c.updated_at, c.created_at) DESC, c.id DESC`
    )
    .all(user.uid, user.uid, user.uid, user.is_admin ? 1 : 0) as ConversationRow[];
}

async function listInbox(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const rows = inboxQuery(user);
  rows.forEach((row) => ensureParticipants(row.id, row.buyer_uid, row.seller_uid));

  return sendOk(res, {
    items: rows.map((row) => serializeConversation(row, user.uid)),
  });
}

async function getConversation(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = getConversationById(conversationId);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, user)) {
    return sendError(res, 403, "You cannot access this conversation");
  }

  const participant = getParticipant(conversationId, user.uid);
  if (participant?.deleted_at && !user.is_admin) {
    return sendError(res, 404, "Conversation not found");
  }

  ensureParticipants(conversation.id, conversation.buyer_uid, conversation.seller_uid);

  return sendOk(res, {
    conversation: serializeConversation(conversation, user.uid),
    messages: getMessages(conversationId).map(serializeMessage),
  });
}

async function startConversationFromListing(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const listingId = Number(req.params.listingId);
  if (!Number.isInteger(listingId)) {
    return sendError(res, 400, "Invalid listing id");
  }

  const listing = getListingById(listingId);
  if (!listing) {
    return sendError(res, 404, "Listing not found");
  }

  if (listing.seller_uid === user.uid && !user.is_admin) {
    return sendError(res, 403, "Sellers should reply from their inbox");
  }

  const blockState = getBlockState(user.uid, listing.seller_uid);
  if (blockState.blockedByOther) {
    return sendError(res, 403, "This seller has blocked messaging.");
  }

  if (blockState.blockedByYou) {
    return sendError(res, 409, "You have already blocked this seller.");
  }

  const conversation = createOrGetConversation(listingId, user.uid, listing.seller_uid);
  clearParticipantDeletion(conversation.id, user.uid);
  ensureParticipantVisible(conversation.id, listing.seller_uid);

  return sendOk(res, {
    conversation: serializeConversation(conversation, user.uid),
  });
}

async function sendMessage(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = getConversationById(conversationId);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, user)) {
    return sendError(res, 403, "You cannot reply in this conversation");
  }

  const participant = getParticipant(conversationId, user.uid);
  if (participant?.deleted_at && !user.is_admin) {
    clearParticipantDeletion(conversationId, user.uid);
  }

  const otherUid = conversation.buyer_uid === user.uid ? conversation.seller_uid : conversation.buyer_uid;
  const blockState = getBlockState(user.uid, otherUid);
  if (!blockState.canReply) {
    return sendError(res, 403, "Messaging is blocked for this conversation.");
  }

  const body = sanitizeText((req.body as any)?.body, 1500);
  if (!body) {
    return sendError(res, 400, "Message cannot be empty");
  }

  const result = db
    .prepare(
      `INSERT INTO messages (conversation_id, sender_uid, body, is_read, read_at, created_at, updated_at)
       VALUES (?, ?, ?, 0, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .run(conversationId, user.uid, body);

  db.prepare(
    `UPDATE messages
     SET is_read = 1,
         read_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND sender_uid = ?`
  ).run(Number(result.lastInsertRowid), user.uid);

  clearParticipantDeletion(conversationId, user.uid);
  clearParticipantDeletion(conversationId, otherUid);
  ensureParticipantVisible(conversationId, user.uid);
  ensureParticipantVisible(conversationId, otherUid);
  markConversationUnread(conversationId, user.uid, body);

  const message = db
    .prepare(`SELECT * FROM messages WHERE id = ? LIMIT 1`)
    .get(Number(result.lastInsertRowid)) as MessageRow | undefined;

  const updatedConversation = getConversationById(conversationId);
  if (!message || !updatedConversation) {
    return sendError(res, 500, "Failed to send message");
  }

  return sendOk(res, {
    success: true,
    conversation: serializeConversation(updatedConversation, user.uid),
    message: serializeMessage(message),
  });
}

async function markRead(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = getConversationById(conversationId);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, user)) {
    return sendError(res, 403, "You cannot access this conversation");
  }

  const senderUid = conversation.buyer_uid === user.uid ? conversation.seller_uid : conversation.buyer_uid;
  db.prepare(
    `UPDATE messages
     SET is_read = 1,
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
         updated_at = CURRENT_TIMESTAMP
     WHERE conversation_id = ? AND sender_uid = ?`
  ).run(conversationId, senderUid);

  if (conversation.buyer_uid === user.uid) {
    db.prepare(
      `UPDATE conversations
       SET buyer_unread_count = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(conversationId);
  } else {
    db.prepare(
      `UPDATE conversations
       SET seller_unread_count = 0,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(conversationId);
  }

  const updatedConversation = getConversationById(conversationId);
  return sendOk(res, {
    success: true,
    conversation: updatedConversation ? serializeConversation(updatedConversation, user.uid) : null,
  });
}

async function deleteChat(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = getConversationById(conversationId);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  if (!canAccessConversation(conversation, user)) {
    return sendError(res, 403, "You cannot delete this conversation");
  }

  ensureParticipantVisible(conversationId, user.uid);
  db.prepare(
    `UPDATE conversation_participants
     SET deleted_at = CURRENT_TIMESTAMP,
         deleted_by_user = 1,
         updated_at = CURRENT_TIMESTAMP
     WHERE conversation_id = ? AND uid = ?`
  ).run(conversationId, user.uid);

  return sendOk(res, {
    success: true,
    conversationId,
  });
}

function resolveConversationFromRequest(conversationId: number, user: VerifiedRequestUser) {
  const conversation = getConversationById(conversationId);
  if (!conversation) return null;
  if (!canAccessConversation(conversation, user)) return null;
  return conversation;
}

async function blockUser(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = resolveConversationFromRequest(conversationId, user);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  const otherUid = conversation.buyer_uid === user.uid ? conversation.seller_uid : conversation.buyer_uid;
  const rawScope = sanitizeText((req.body as any)?.scope, 16) as MessageBlockScope | "";
  const scope: MessageBlockScope = MESSAGE_BLOCK_SCOPES.includes(rawScope as MessageBlockScope) ? (rawScope as MessageBlockScope) : "messages";
  const reason = sanitizeText((req.body as any)?.reason, 240) || null;

  db.prepare(
    `INSERT INTO message_blocks (blocker_uid, blocked_uid, block_scope, reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT(blocker_uid, blocked_uid, block_scope) DO UPDATE SET
       reason = excluded.reason,
       updated_at = CURRENT_TIMESTAMP`
  ).run(user.uid, otherUid, scope, reason);

  return sendOk(res, {
    success: true,
    blocked_uid: otherUid,
    block_scope: scope,
    reason,
  });
}

async function unblockUser(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = resolveConversationFromRequest(conversationId, user);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  const otherUid = conversation.buyer_uid === user.uid ? conversation.seller_uid : conversation.buyer_uid;
  db.prepare(
    `DELETE FROM message_blocks
     WHERE blocker_uid = ? AND blocked_uid = ? AND block_scope IN ('messages', 'listing', 'all')`
  ).run(user.uid, otherUid);

  return sendOk(res, {
    success: true,
    unblocked_uid: otherUid,
  });
}

async function reportConversation(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = resolveConversationFromRequest(conversationId, user);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  const otherUid = conversation.buyer_uid === user.uid ? conversation.seller_uid : conversation.buyer_uid;
  const reason = sanitizeText((req.body as any)?.reason, 64);
  if (!reason || !isMessageReportReason(reason)) {
    return sendError(res, 400, "Please choose a valid report reason.");
  }

  const details = sanitizeText((req.body as any)?.details, 1000) || null;
  const reportId = createReport({
    conversationId,
    messageId: null,
    reporterUid: user.uid,
    reportedUid: otherUid,
    reason,
    details,
  });

  return sendOk(res, {
    success: true,
    report_id: reportId,
    reason,
  });
}

async function flagSpam(req: Request, res: Response) {
  const user = currentUser(req);
  if (!user) return sendError(res, 401, "Authentication required");

  const conversationId = Number(req.params.conversationId);
  if (!Number.isInteger(conversationId)) {
    return sendError(res, 400, "Invalid conversation id");
  }

  const conversation = resolveConversationFromRequest(conversationId, user);
  if (!conversation) {
    return sendError(res, 404, "Conversation not found");
  }

  const otherUid = conversation.buyer_uid === user.uid ? conversation.seller_uid : conversation.buyer_uid;
  const messageId = Number((req.body as any)?.messageId);
  const message = Number.isInteger(messageId)
    ? (db
        .prepare(`SELECT * FROM messages WHERE id = ? AND conversation_id = ? LIMIT 1`)
        .get(messageId, conversationId) as MessageRow | undefined)
    : undefined;

  if (message && message.sender_uid !== otherUid) {
    return sendError(res, 400, "That message does not belong to the other participant.");
  }

  if (message) {
    db.prepare(
      `UPDATE messages
       SET is_spam = 1,
           spam_flag_count = spam_flag_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(message.id);
  }

  flagSpamProfile(otherUid);
  const reportId = createReport({
    conversationId,
    messageId: message?.id ?? null,
    reporterUid: user.uid,
    reportedUid: otherUid,
    reason: "spam",
    details: "Quick spam flag",
  });

  const profile = db
    .prepare(
      `SELECT *
       FROM sender_spam_profiles
       WHERE uid = ?
       LIMIT 1`
    )
    .get(otherUid) as { uid: string; spam_score: number; spam_flags: number; auto_limited_until: string | null } | undefined;

  return sendOk(res, {
    success: true,
    report_id: reportId,
    spam_profile: profile
      ? {
          uid: profile.uid,
          spam_score: Number(profile.spam_score || 0),
          spam_flags: Number(profile.spam_flags || 0),
          auto_limited_until: profile.auto_limited_until,
        }
      : null,
  });
}

async function adminMessageReports(req: Request, res: Response) {
  const user = currentUser(req);
  if (!hasAdminAccess(user)) return sendError(res, 403, "Admin access required");

  const status = sanitizeText(req.query.status, 24) || "open";
  const shouldFilterByStatus = status === "open" || status === "resolved";
  const rows = db
    .prepare(
      `SELECT
         r.*,
         c.listing_id,
         c.buyer_uid,
         c.seller_uid,
         m.body AS message_body,
         l.name AS listing_name,
         sb.business_name AS seller_business_name,
         bb.business_name AS buyer_business_name
       FROM message_reports r
       LEFT JOIN conversations c ON c.id = r.conversation_id
       LEFT JOIN messages m ON m.id = r.message_id
       LEFT JOIN listings l ON l.id = c.listing_id
       LEFT JOIN sellers sb ON sb.uid = c.seller_uid
       LEFT JOIN sellers bb ON bb.uid = c.buyer_uid
       ${shouldFilterByStatus ? "WHERE r.status = ?" : ""}
       ORDER BY r.created_at DESC, r.id DESC
       LIMIT 200`
    )
    .all(...(shouldFilterByStatus ? [status] : []));

  return sendOk(res, { items: rows });
}

async function resolveReport(req: Request, res: Response) {
  const user = currentUser(req);
  if (!hasAdminAccess(user)) return sendError(res, 403, "Admin access required");

  const reportId = Number(req.params.reportId);
  if (!Number.isInteger(reportId)) {
    return sendError(res, 400, "Invalid report id");
  }

  const updated = db
    .prepare(
      `UPDATE message_reports
       SET status = 'resolved',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(reportId);

  if (!updated.changes) {
    return sendError(res, 404, "Report not found");
  }

  return sendOk(res, { success: true, reportId });
}

export function registerMessageRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  app.get("/api/messages/inbox", requireAuth, (req, res) => void listInbox(req, res));
  app.get("/api/messages/:conversationId", requireAuth, (req, res) => void getConversation(req, res));
  app.post("/api/listings/:listingId/messages/start", requireAuth, (req, res) => void startConversationFromListing(req, res));
  app.post("/api/messages/:conversationId/messages", requireAuth, (req, res) => void sendMessage(req, res));
  app.post("/api/messages/:conversationId/read", requireAuth, (req, res) => void markRead(req, res));
  app.delete("/api/messages/:conversationId", requireAuth, (req, res) => void deleteChat(req, res));

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}

export function registerMessageModerationRoutes(app: Express) {
  if ((app as any)[MODERATION_ROUTES_INSTALLED_FLAG]) return;

  app.post("/api/messages/:conversationId/block", requireAuth, (req, res) => void blockUser(req, res));
  app.delete("/api/messages/:conversationId/block", requireAuth, (req, res) => void unblockUser(req, res));
  app.post("/api/messages/:conversationId/report", requireAuth, (req, res) => void reportConversation(req, res));
  app.post("/api/messages/:conversationId/spam", requireAuth, (req, res) => void flagSpam(req, res));
  app.get("/api/admin/message-reports", requireAuth, (req, res) => void adminMessageReports(req, res));
  app.post("/api/admin/message-reports/:reportId/resolve", requireAuth, (req, res) => void resolveReport(req, res));

  (app as any)[MODERATION_ROUTES_INSTALLED_FLAG] = true;
}
