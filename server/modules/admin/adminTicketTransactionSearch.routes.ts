import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import type { PgCompatDatabase } from "../../db.js";
import { getEventTransactionByTicketId } from "../events/eventTransactionService.js";
import { findEventTicketIdentity } from "../events/eventTicketIdentity.js";

export function createAdminTicketTransactionSearchRouter(params: {
  requireAuth: RequestHandler;
  db: PgCompatDatabase;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  function requireAdmin(req: express.Request, res: express.Response): boolean {
    if (!hasAdminAccess(req.user)) {
      res.status(403).json({ error: "Admin access required" });
      return false;
    }
    return true;
  }

  function resolveTicket(raw: unknown) {
    const ticketId = String(raw ?? "").trim();
    return ticketId ? findEventTicketIdentity(db, ticketId) : null;
  }

  router.get("/ticket-search", requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return;
    const identity = resolveTicket(req.query.ticketId ?? req.query.q);
    if (!identity) return res.status(404).json({ error: "Event ticket not found" });

    const transaction = getEventTransactionByTicketId(db, identity.ticketId);
    if (!transaction) return res.status(404).json({ error: "Event ticket transaction not found" });

    return res.json({ ticketId: identity.ticketId, identity, transaction, source: "event_ticket_identity" });
  });

  router.get("/ticket-payments", requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return;
    const identity = resolveTicket(req.query.ticketId ?? req.query.q);
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

    return res.json({ ticketId: identity.ticketId, orderId: identity.orderId, eventId: identity.eventId, payments: rows });
  });

  router.get("/payment-investigation", requireAuth, (req, res) => {
    if (!requireAdmin(req, res)) return;

    const query = String(req.query.q ?? req.query.query ?? "").trim();
    if (!query) return res.status(400).json({ error: "Investigation query is required" });

    try {
      const like = `%${query.toLowerCase()}%`;

      const paymentRows = db.prepare(`
        SELECT DISTINCT
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
          o.seller_id,
          o.status AS order_status,
          o.paid_at AS order_paid_at,
          o.fulfilled_at AS order_fulfilled_at,
          o.escrow_id,
          e.state AS escrow_state,
          e.balance_amount,
          e.balance_currency,
          e.updated_at AS escrow_updated_at,
          et.id AS ticket_id,
          et.code AS ticket_code,
          et.event_id,
          ev.event_title
        FROM payments p
        LEFT JOIN orders o ON o.payment_reference = p.reference
        LEFT JOIN escrows e ON e.order_id = o.id
        LEFT JOIN event_tickets et ON et.order_id = o.id
        LEFT JOIN events ev ON ev.id = et.event_id
        WHERE
          LOWER(CAST(p.id AS TEXT)) LIKE ? OR
          LOWER(COALESCE(p.order_id, '')) LIKE ? OR
          LOWER(COALESCE(p.reference, '')) LIKE ? OR
          LOWER(COALESCE(p.provider_reference, '')) LIKE ? OR
          LOWER(COALESCE(p.provider, '')) LIKE ? OR
          LOWER(COALESCE(p.method, '')) LIKE ? OR
          LOWER(COALESCE(p.status, '')) LIKE ? OR
          LOWER(CAST(p.amount AS TEXT)) LIKE ? OR
          LOWER(COALESCE(o.seller_id, '')) LIKE ? OR
          LOWER(COALESCE(o.status, '')) LIKE ? OR
          LOWER(COALESCE(o.escrow_id, '')) LIKE ? OR
          LOWER(CAST(et.id AS TEXT)) LIKE ? OR
          LOWER(COALESCE(et.code, '')) LIKE ? OR
          LOWER(CAST(et.event_id AS TEXT)) LIKE ? OR
          LOWER(COALESCE(ev.event_title, '')) LIKE ? OR
          LOWER(CAST(p.verification AS TEXT)) LIKE ?
        ORDER BY p.created_at DESC
        LIMIT 200
      `).all(...Array.from({ length: 16 }, () => like)) as Array<Record<string, unknown>>;

      const webhookRows = db.prepare(`
        SELECT
          id,
          event_id,
          provider_event_id,
          provider,
          reference,
          tx_ref,
          event_type,
          processing_status,
          error,
          signature_valid,
          payload,
          created_at
        FROM payment_webhook_events
        WHERE
          LOWER(CAST(id AS TEXT)) LIKE ? OR
          LOWER(COALESCE(event_id, '')) LIKE ? OR
          LOWER(COALESCE(provider_event_id, '')) LIKE ? OR
          LOWER(COALESCE(provider, '')) LIKE ? OR
          LOWER(COALESCE(reference, '')) LIKE ? OR
          LOWER(COALESCE(tx_ref, '')) LIKE ? OR
          LOWER(COALESCE(event_type, '')) LIKE ? OR
          LOWER(COALESCE(processing_status, '')) LIKE ? OR
          LOWER(COALESCE(error, '')) LIKE ? OR
          LOWER(CAST(signature_valid AS TEXT)) LIKE ? OR
          LOWER(COALESCE(payload, '')) LIKE ?
        ORDER BY created_at DESC
        LIMIT 200
      `).all(...Array.from({ length: 11 }, () => like)) as Array<Record<string, unknown>>;

      const paymentReferences = [...new Set(
        paymentRows
          .flatMap((row) => [row.reference, row.provider_reference])
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      )];
      const webhookReferences = [...new Set(
        webhookRows
          .flatMap((row) => [row.reference, row.tx_ref])
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      )];

      const relatedWebhooks = paymentReferences.length > 0
        ? db.prepare(`
            SELECT
              id,
              event_id,
              provider_event_id,
              provider,
              reference,
              tx_ref,
              event_type,
              processing_status,
              error,
              signature_valid,
              payload,
              created_at
            FROM payment_webhook_events
            WHERE reference IN (${paymentReferences.map(() => "?").join(", ")})
               OR tx_ref IN (${paymentReferences.map(() => "?").join(", ")})
            ORDER BY created_at DESC
            LIMIT 200
          `).all(...paymentReferences, ...paymentReferences) as Array<Record<string, unknown>>
        : [];

      const relatedPayments = webhookReferences.length > 0
        ? db.prepare(`
            SELECT DISTINCT
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
              o.seller_id,
              o.status AS order_status,
              o.paid_at AS order_paid_at,
              o.fulfilled_at AS order_fulfilled_at,
              o.escrow_id,
              e.state AS escrow_state,
              e.balance_amount,
              e.balance_currency,
              e.updated_at AS escrow_updated_at,
              et.id AS ticket_id,
              et.code AS ticket_code,
              et.event_id,
              ev.event_title
            FROM payments p
            LEFT JOIN orders o ON o.payment_reference = p.reference
            LEFT JOIN escrows e ON e.order_id = o.id
            LEFT JOIN event_tickets et ON et.order_id = o.id
            LEFT JOIN events ev ON ev.id = et.event_id
            WHERE p.reference IN (${webhookReferences.map(() => "?").join(", ")})
               OR p.provider_reference IN (${webhookReferences.map(() => "?").join(", ")})
            ORDER BY p.created_at DESC
            LIMIT 200
          `).all(...webhookReferences, ...webhookReferences) as Array<Record<string, unknown>>
        : [];

      const paymentsById = new Map<string, Record<string, unknown>>();
      [...paymentRows, ...relatedPayments].forEach((row) => paymentsById.set(String(row.id), row));

      const webhooksById = new Map<string, Record<string, unknown>>();
      [...webhookRows, ...relatedWebhooks].forEach((row) => webhooksById.set(String(row.id), row));

      const ticketRows = [...paymentsById.values()].filter((row) => row.ticket_id != null);
      const sellerIds = [...new Set(
        [...paymentsById.values()]
          .map((row) => row.seller_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      )];

      return res.status(200).json({
        query,
        payments: [...paymentsById.values()],
        webhooks: [...webhooksById.values()],
        tickets: ticketRows.map((row) => ({
          ticketId: row.ticket_id,
          ticketCode: row.ticket_code ?? null,
          eventId: row.event_id ?? null,
          eventTitle: row.event_title ?? null,
          orderId: row.order_id ?? null,
          sellerId: row.seller_id ?? null,
        })),
        sellers: sellerIds.map((sellerId) => ({ sellerId })),
        counts: {
          payments: paymentsById.size,
          webhooks: webhooksById.size,
          tickets: ticketRows.length,
          sellers: sellerIds.length,
        },
      });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to investigate payments and webhooks",
      });
    }
  });

  return router;
}
