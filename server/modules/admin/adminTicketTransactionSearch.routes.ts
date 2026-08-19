import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import type { PgCompatDatabase } from "../../db.js";
import { getEventTransactionByTicketId } from "../events/eventTransactionService.js";
import { findEventTicketIdentity } from "../events/eventTransactionIdentity.js";

export function createAdminTicketTransactionSearchRouter(params: {
  requireAuth: RequestHandler;
  db: PgCompatDatabase;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  router.get("/ticket-search", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: "Admin access required" });

    const ticketId = String(req.query.ticketId ?? req.query.q ?? "").trim();
    if (!ticketId) return res.status(400).json({ error: "ticketId or q is required" });

    const identity = findEventTicketIdentity(db, ticketId);
    if (!identity) return res.status(404).json({ error: "Event ticket not found" });

    const transaction = getEventTransactionByTicketId(db, identity.ticketId);
    if (!transaction) return res.status(404).json({ error: "Event ticket transaction not found" });

    return res.json({
      ticketId: identity.ticketId,
      identity,
      transaction,
      source: "event_ticket_identity",
    });
  });

  router.get("/ticket-payments", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) return res.status(403).json({ error: "Admin access required" });

    const ticketId = String(req.query.ticketId ?? req.query.q ?? "").trim();
    if (!ticketId) return res.status(400).json({ error: "ticketId or q is required" });

    const identity = findEventTicketIdentity(db, ticketId);
    if (!identity) return res.status(404).json({ error: "Event ticket not found" });

    const rows = db.prepare(`
      SELECT
        p.id,
        p.order_id,
        p.provider,
        p.method,
        p.status AS payment_status,
        p.reference,
        p.provider_reference,
        p.currency,
        p.amount,
        p.checkout_url,
        p.paid_at,
        p.verified,
        p.verification,
        p.created_at,
        p.updated_at,
        et.id AS ticket_id,
        et.event_id,
        e.event_title,
        e.creator_uid
      FROM event_tickets et
      JOIN payments p ON p.order_id = et.order_id
      LEFT JOIN events e ON e.id = et.event_id
      WHERE et.id = ?
      ORDER BY p.created_at DESC
    `).all(identity.ticketId) as Array<Record<string, unknown>>;

    return res.json({ ticketId: identity.ticketId, payments: rows });
  });

  return router;
}
