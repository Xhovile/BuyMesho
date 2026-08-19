import express, { type RequestHandler } from "express";
import type { PgCompatDatabase } from "../../db.js";
import { findEventTicketIdentity, getEventTicketTransaction } from "./eventTransactionIdentity.js";
import {
  getEventTransactionByTicketId,
  getEventTransactionSummary,
  getEventTransactions,
} from "./eventTransactionService.js";

function canAccessTicket(db: PgCompatDatabase, req: express.Request, ticketId: string): boolean {
  if (req.user?.is_admin) return true;

  const identity = findEventTicketIdentity(db, ticketId);
  if (!identity) return false;

  const relation = db
    .prepare(`
      SELECT e.creator_uid, o.buyer_id, o.seller_id
      FROM event_tickets et
      LEFT JOIN events e ON e.id = et.event_id
      LEFT JOIN orders o ON o.id = et.order_id
      WHERE et.id = ?
      LIMIT 1
    `)
    .get(identity.ticketId) as {
      creator_uid?: string | null;
      buyer_id?: string | null;
      seller_id?: string | null;
    } | undefined;

  const uid = String(req.user?.uid ?? "").trim();
  if (!uid || !relation) return false;
  return uid === String(relation.creator_uid ?? "") || uid === String(relation.buyer_id ?? "") || uid === String(relation.seller_id ?? "");
}

function canAccessEvent(db: PgCompatDatabase, req: express.Request, eventId: string): boolean {
  if (req.user?.is_admin) return true;
  const uid = String(req.user?.uid ?? "").trim();
  if (!uid || !eventId.trim()) return false;

  const row = db.prepare(`
    SELECT e.creator_uid, o.buyer_id, o.seller_id
    FROM events e
    LEFT JOIN event_tickets et ON et.event_id = e.id
    LEFT JOIN orders o ON o.id = et.order_id
    WHERE e.id = ?
    LIMIT 1
  `).get(eventId.trim()) as {
    creator_uid?: string | null;
    buyer_id?: string | null;
    seller_id?: string | null;
  } | undefined;

  if (!row) return false;
  return uid === String(row.creator_uid ?? "") || uid === String(row.buyer_id ?? "") || uid === String(row.seller_id ?? "");
}

export function createEventTicketIdentityRouter(params: {
  db: PgCompatDatabase;
  requireAuth: RequestHandler;
}): express.Router {
  const router = express.Router();
  const { db, requireAuth } = params;

  router.get("/:ticketId/identity", requireAuth, (req, res) => {
    const ticketId = String(req.params.ticketId ?? "").trim();
    if (!ticketId) return res.status(400).json({ error: "Ticket ID is required" });

    const identity = findEventTicketIdentity(db, ticketId);
    if (!identity) return res.status(404).json({ error: "Event ticket not found" });
    if (!canAccessTicket(db, req, ticketId)) return res.status(403).json({ error: "You cannot access this event ticket" });

    return res.json(identity);
  });

  router.get("/:ticketId/transaction", requireAuth, (req, res) => {
    const ticketId = String(req.params.ticketId ?? "").trim();
    if (!ticketId) return res.status(400).json({ error: "Ticket ID is required" });
    if (!canAccessTicket(db, req, ticketId)) return res.status(403).json({ error: "You cannot access this event ticket" });

    const transaction = getEventTransactionByTicketId(db, ticketId) ?? getEventTicketTransaction(db, ticketId);
    if (!transaction) return res.status(404).json({ error: "Event ticket transaction not found" });

    return res.json({ transaction });
  });

  router.get("/event/:eventId/transactions", requireAuth, (req, res) => {
    const eventId = String(req.params.eventId ?? "").trim();
    if (!eventId) return res.status(400).json({ error: "Event ID is required" });
    if (!canAccessEvent(db, req, eventId)) return res.status(403).json({ error: "You cannot access this event" });

    return res.json({ eventId, transactions: getEventTransactions(db, eventId) });
  });

  router.get("/event/:eventId/transaction-summary", requireAuth, (req, res) => {
    const eventId = String(req.params.eventId ?? "").trim();
    if (!eventId) return res.status(400).json({ error: "Event ID is required" });
    if (!canAccessEvent(db, req, eventId)) return res.status(403).json({ error: "You cannot access this event" });

    return res.json({ summary: getEventTransactionSummary(db, eventId) });
  });

  return router;
}
