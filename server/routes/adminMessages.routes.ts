import type { RequestHandler, Router } from "express";
import { Router as createRouter } from "express";

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requireAdmin(requireAuth: RequestHandler): RequestHandler[] {
  return [
    requireAuth,
    (req, res, next) => {
      const user = req.user as { is_admin?: boolean } | undefined;
      if (!user?.is_admin) return res.status(403).json({ error: "Admin access required" });
      next();
    },
  ];
}

function ensureAdminMessageReviewSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_message_reviews (
      conversation_id INTEGER NOT NULL,
      admin_uid TEXT NOT NULL,
      reviewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (conversation_id, admin_uid)
    );

    CREATE INDEX IF NOT EXISTS idx_admin_message_reviews_admin
    ON admin_message_reviews (admin_uid, reviewed_at DESC);
  `);
}

export function createAdminMessagesRouter({ requireAuth, db }: { requireAuth: RequestHandler; db: any }): Router {
  const router = createRouter();
  ensureAdminMessageReviewSchema(db);

  router.get("/messages", ...requireAdmin(requireAuth), (req, res) => {
    const user = req.user as { uid: string; is_admin?: boolean };
    const filter = clean(req.query.filter, 20).toLowerCase() || "unread";
    const search = clean(req.query.search, 160).toLowerCase();
    const limitRaw = Number(req.query.limit || 50);
    const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    if (!["unread", "reported", "blocked", "all"].includes(filter)) {
      return res.status(400).json({ error: "Invalid message filter" });
    }

    const params: any[] = [user.uid];
    const conditions: string[] = [];

    if (filter === "unread") {
      conditions.push("r.conversation_id IS NULL");
    } else if (filter === "reported") {
      conditions.push("rp.conversation_id IS NOT NULL AND rp.open_report_count > 0");
    } else if (filter === "blocked") {
      conditions.push("bl.conversation_id IS NOT NULL");
    }

    if (search) {
      conditions.push(`(
        LOWER(c.buyer_uid) LIKE ? OR
        LOWER(c.seller_uid) LIKE ? OR
        LOWER(COALESCE(buyer.email, '')) LIKE ? OR
        LOWER(COALESCE(seller.email, '')) LIKE ? OR
        LOWER(COALESCE(l.name, '')) LIKE ? OR
        LOWER(COALESCE(e.event_title, '')) LIKE ? OR
        LOWER(COALESCE(seller.business_name, '')) LIKE ? OR
        LOWER(COALESCE(buyer.business_name, '')) LIKE ?
      )`);
      const term = `%${search}%`;
      params.push(term, term, term, term, term, term, term, term);
    }

    params.push(limit);

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = db
      .prepare(
        `SELECT
          c.id,
          c.listing_id,
          c.event_id,
          c.buyer_uid,
          c.seller_uid,
          c.last_message_preview,
          c.last_message_at,
          c.created_at,
          c.updated_at,
          l.name AS listing_name,
          e.event_title AS event_title,
          e.organizer_name AS organizer_name,
          seller.email AS seller_email,
          seller.business_name AS seller_business_name,
          buyer.email AS buyer_email,
          buyer.business_name AS buyer_business_name,
          COALESCE(rp.open_report_count, 0) AS open_report_count,
          CASE WHEN bl.conversation_id IS NULL THEN 0 ELSE 1 END AS is_blocked,
          CASE WHEN r.conversation_id IS NULL THEN 1 ELSE 0 END AS is_unread
        FROM conversations c
        LEFT JOIN listings l ON l.id = c.listing_id
        LEFT JOIN events e ON e.id = c.event_id
        LEFT JOIN sellers seller ON seller.uid = c.seller_uid
        LEFT JOIN sellers buyer ON buyer.uid = c.buyer_uid
        LEFT JOIN admin_message_reviews r
          ON r.conversation_id = c.id AND r.admin_uid = ?
        LEFT JOIN (
          SELECT conversation_id, COUNT(*) AS open_report_count
          FROM message_reports
          WHERE status = 'open' AND conversation_id IS NOT NULL
          GROUP BY conversation_id
        ) rp ON rp.conversation_id = c.id
        LEFT JOIN (
          SELECT DISTINCT c2.id AS conversation_id
          FROM conversations c2
          INNER JOIN message_blocks mb
            ON (mb.blocker_uid = c2.buyer_uid AND mb.blocked_uid = c2.seller_uid)
            OR (mb.blocker_uid = c2.seller_uid AND mb.blocked_uid = c2.buyer_uid)
        ) bl ON bl.conversation_id = c.id
        ${where}
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT ?`
      )
      .all(...params) as Array<Record<string, unknown>>;

    return res.json({
      items: rows.map((row) => ({
        id: Number(row.id),
        listing_id: row.listing_id == null ? null : Number(row.listing_id),
        event_id: row.event_id == null ? null : Number(row.event_id),
        thread_type: row.event_id ? "event" : row.listing_id ? "listing" : "seller",
        buyer: {
          uid: String(row.buyer_uid),
          email: row.buyer_email ? String(row.buyer_email) : null,
          business_name: row.buyer_business_name ? String(row.buyer_business_name) : null,
        },
        seller: {
          uid: String(row.seller_uid),
          email: row.seller_email ? String(row.seller_email) : null,
          business_name: row.seller_business_name ? String(row.seller_business_name) : null,
        },
        listing: row.listing_id
          ? { id: Number(row.listing_id), name: row.listing_name ? String(row.listing_name) : "Listing" }
          : null,
        event: row.event_id
          ? { id: Number(row.event_id), title: row.event_title ? String(row.event_title) : "Event", organizer_name: row.organizer_name ? String(row.organizer_name) : "Organizer" }
          : null,
        last_message_preview: row.last_message_preview ? String(row.last_message_preview) : "",
        last_message_at: row.last_message_at ? String(row.last_message_at) : null,
        updated_at: row.updated_at ? String(row.updated_at) : null,
        open_report_count: Number(row.open_report_count || 0),
        is_blocked: Number(row.is_blocked || 0) === 1,
        is_unread: Number(row.is_unread || 0) === 1,
      })),
    });
  });

  router.post("/messages/:conversationId/review", ...requireAdmin(requireAuth), (req, res) => {
    const user = req.user as { uid: string; is_admin?: boolean };
    const conversationId = Number(req.params.conversationId);
    if (!Number.isInteger(conversationId)) {
      return res.status(400).json({ error: "Invalid conversation id" });
    }

    const conversation = db
      .prepare("SELECT id FROM conversations WHERE id = ? LIMIT 1")
      .get(conversationId) as { id: number } | undefined;

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    db.prepare(
      `INSERT INTO admin_message_reviews (conversation_id, admin_uid, reviewed_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (conversation_id, admin_uid)
       DO UPDATE SET reviewed_at = CURRENT_TIMESTAMP`
    ).run(conversationId, user.uid);

    return res.json({ success: true, conversation_id: conversationId, reviewed_at: new Date().toISOString() });
  });

  return router;
}
