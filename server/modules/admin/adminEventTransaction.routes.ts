import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import type { PgCompatDatabase } from "../../db.js";
import { getEventTransactionSummary, getEventTransactions } from "../events/eventTransactionService.js";

export function createAdminEventTransactionRouter(params: {
  requireAuth: RequestHandler;
  db: PgCompatDatabase;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  const assertAdmin = (req: express.Request, res: express.Response): boolean => {
    if (!hasAdminAccess(req.user)) {
      res.status(403).json({ error: "Forbidden: admin access required" });
      return false;
    }
    return true;
  };

  router.get("/events/overview", requireAuth, (req, res, next) => {
    if (!assertAdmin(req, res)) return;

    try {
      const creators = db.prepare(`
        SELECT *
        FROM event_creators
        ORDER BY updated_at DESC, created_at DESC
      `).all();

      const submissions = db.prepare(`
        SELECT *
        FROM event_creator_applications
        ORDER BY created_at DESC, id DESC
      `).all();

      const events = db.prepare(`
        SELECT e.*, ec.email AS creator_email, ec.display_name AS creator_display_name, ec.status AS creator_status
        FROM events e
        LEFT JOIN event_creators ec ON ec.uid = e.creator_uid
        WHERE e.deleted_at IS NULL
        ORDER BY e.created_at DESC, e.id DESC
      `).all() as Array<Record<string, unknown>>;

      const activity = db.prepare(`
        SELECT
          e.id AS event_id,
          COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_added_to_cart' THEN 1 ELSE 0 END), 0) AS cart_adds,
          COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_link_clicked' THEN 1 ELSE 0 END), 0) AS ticket_clicks,
          MAX(a.created_at) AS last_activity_at
        FROM events e
        LEFT JOIN event_activity a ON a.event_id = e.id
        WHERE e.deleted_at IS NULL
        GROUP BY e.id
      `).all() as Array<Record<string, unknown>>;

      const messages = db.prepare(`
        SELECT
          c.event_id AS event_id,
          COUNT(*) AS message_threads,
          COALESCE(SUM(CASE WHEN c.seller_unread_count > 0 THEN c.seller_unread_count ELSE 0 END), 0) AS unread_messages,
          MAX(c.updated_at) AS last_message_at
        FROM conversations c
        WHERE c.event_id IS NOT NULL
        GROUP BY c.event_id
      `).all() as Array<Record<string, unknown>>;

      const activityMap = new Map(activity.map((row) => [Number(row.event_id), row]));
      const messageMap = new Map(messages.map((row) => [Number(row.event_id), row]));
      const transactionSummaries = new Map(
        events.map((event) => {
          const id = String(event.id ?? "");
          return [id, getEventTransactionSummary(db, id)];
        }),
      );

      const normalizedEvents = events.map((event) => {
        const id = Number(event.id);
        const summary = transactionSummaries.get(String(id));
        const activityRow = activityMap.get(id);
        const messageRow = messageMap.get(id);
        const specValues = (() => {
          try {
            const parsed = JSON.parse(String(event.spec_values ?? "{}"));
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
          } catch {
            return {};
          }
        })();

        return {
          ...event,
          status: event.status,
          ticket_price: event.ticket_price == null ? null : Number(event.ticket_price),
          spec_values: specValues,
          message_threads: Number(messageRow?.message_threads ?? 0),
          unread_messages: Number(messageRow?.unread_messages ?? 0),
          cart_adds: Number(activityRow?.cart_adds ?? 0),
          ticket_clicks: Number(activityRow?.ticket_clicks ?? 0),
          last_activity_at: activityRow?.last_activity_at ?? messageRow?.last_message_at ?? summary?.lastTransactionAt ?? null,
          last_message_at: messageRow?.last_message_at ?? null,
          purchase_count: summary?.orderCount ?? 0,
          tickets_issued: summary?.ticketsIssued ?? 0,
          tickets_sold: summary?.ticketsSold ?? 0,
          tickets_cancelled: summary?.ticketsCancelled ?? 0,
          tickets_refunded: summary?.ticketsRefunded ?? 0,
          tickets_disputed: summary?.ticketsDisputed ?? 0,
          payment_count: summary?.paymentCount ?? 0,
          successful_payment_count: summary?.successfulPaymentCount ?? 0,
          pending_payment_count: summary?.pendingPaymentCount ?? 0,
          failed_payment_count: summary?.failedPaymentCount ?? 0,
          refunded_payment_count: summary?.refundedPaymentCount ?? 0,
          disputed_payment_count: summary?.disputedPaymentCount ?? 0,
          gross_revenue_amount: summary?.grossRevenueAmount ?? 0,
          net_revenue_amount: summary?.netRevenueAmount ?? 0,
          refunded_amount: summary?.refundedAmount ?? 0,
          revenue_currency: summary?.revenueCurrency ?? "MWK",
          latest_payment_reference: summary?.latestPaymentReference ?? null,
          last_sale_at: summary?.lastTransactionAt ?? null,
        };
      });

      return res.json({
        creators,
        events: normalizedEvents,
        submissions,
        summary: {
          creatorCount: creators.length,
          suspendedCreatorCount: creators.filter((row: any) => String(row.status).toLowerCase() === "suspended").length,
          submissionCount: submissions.length,
          eventCount: normalizedEvents.length,
          publishedEventCount: normalizedEvents.filter((row) => String(row.status) === "published").length,
          inactiveEventCount: normalizedEvents.filter((row) => String(row.status) === "inactive").length,
          cancelledEventCount: normalizedEvents.filter((row) => String(row.status) === "cancelled").length,
          totalMessageThreads: normalizedEvents.reduce((sum, row) => sum + Number(row.message_threads ?? 0), 0),
          totalUnreadMessages: normalizedEvents.reduce((sum, row) => sum + Number(row.unread_messages ?? 0), 0),
          totalCartAdds: normalizedEvents.reduce((sum, row) => sum + Number(row.cart_adds ?? 0), 0),
          totalTicketClicks: normalizedEvents.reduce((sum, row) => sum + Number(row.ticket_clicks ?? 0), 0),
          totalPaymentCount: normalizedEvents.reduce((sum, row) => sum + Number(row.payment_count ?? 0), 0),
          totalTicketsSold: normalizedEvents.reduce((sum, row) => sum + Number(row.tickets_sold ?? 0), 0),
          totalDisputedTickets: normalizedEvents.reduce((sum, row) => sum + Number(row.tickets_disputed ?? 0), 0),
          totalGrossRevenue: normalizedEvents.reduce((sum, row) => sum + Number(row.gross_revenue_amount ?? 0), 0),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/events/:eventId/records", requireAuth, (req, res, next) => {
    if (!assertAdmin(req, res)) return;

    try {
      const eventId = String(req.params.eventId ?? "").trim();
      if (!/^\d+$/.test(eventId)) return res.status(400).json({ error: "Invalid event id" });

      const event = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as Record<string, unknown> | undefined;
      if (!event) return res.status(404).json({ error: "Event not found" });

      const creator = event.creator_uid
        ? db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(String(event.creator_uid))
        : null;

      const activities = db.prepare(`
        SELECT *
        FROM event_activity
        WHERE event_id = ?
        ORDER BY created_at DESC, id DESC
      `).all(eventId).map((row: any) => ({
        ...row,
        metadata: (() => {
          try {
            const parsed = JSON.parse(String(row.metadata ?? "{}"));
            return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            return {};
          }
        })(),
      }));

      const conversations = db.prepare(`
        SELECT *
        FROM conversations
        WHERE event_id = ?
        ORDER BY updated_at DESC
      `).all(eventId);

      const transactions = getEventTransactions(db, eventId);
      const purchaseRecords = transactions.map((transaction) => ({
        id: transaction.orderId,
        ticket_id: transaction.ticketId,
        order_id: transaction.orderId,
        event_id: transaction.eventId,
        event_title: transaction.eventTitle,
        status: transaction.ticketStatus,
        total_currency: transaction.payment?.currency ?? "MWK",
        total_amount: transaction.payment?.amount ?? 0,
        created_at: transaction.purchaseDate ?? transaction.payment?.paidAt ?? null,
        items: JSON.stringify({
          ticketId: transaction.ticketId,
          ticketTitle: transaction.ticketTitle,
          ticketType: transaction.ticketType,
          holderName: transaction.holderName,
          holderEmail: transaction.holderEmail,
          payment: transaction.payment,
          dispute: transaction.dispute,
        }),
      }));

      return res.json({
        event,
        creator,
        activities,
        conversations,
        purchaseRecords,
        transactions,
        transactionSummary: getEventTransactionSummary(db, eventId),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
