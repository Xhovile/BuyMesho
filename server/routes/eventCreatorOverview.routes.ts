import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getEventTransactionSummaries } from "../modules/events/eventTransactionService.js";

type EventRow = {
  id: number;
  creator_uid: string | null;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_mode: string;
  ticket_price: number | null;
  ticket_link: string | null;
  description: string;
  contact_whatsapp: string | null;
  poster_alt: string | null;
  spec_values: string;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type EventCreatorRow = { uid: string; status: string; active_until: string | null };

type EventActivitySummaryRow = {
  event_id: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
};

type EventMessageSummaryRow = {
  event_id: number;
  message_threads: number;
  unread_messages: number;
  last_message_at: string | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function deriveCreatorApprovalStatus(creator: EventCreatorRow | null | undefined): string {
  if (!creator) return "unknown";
  const normalized = normalizeString(creator.status).toLowerCase();
  if (normalized === "approved") return "approved";
  if (normalized === "pending") return "pending approval";
  if (normalized === "suspended") return "suspended";
  if (normalized === "inactive") return "inactive";
  if (creator.active_until && normalized !== "approved") return "approved";
  return creator.status || "unknown";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function safeParseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function serializeEventRow(row: EventRow) {
  return {
    ...row,
    ticket_price: row.ticket_price === null || row.ticket_price === undefined ? null : Number(row.ticket_price),
    spec_values: safeParseJsonObject(row.spec_values),
  };
}

function loadEventMessageSummaries(db: any, creatorUid: string) {
  return db
    .prepare(`
      SELECT
        c.event_id AS event_id,
        COUNT(*) AS message_threads,
        COALESCE(SUM(CASE WHEN c.seller_unread_count > 0 THEN c.seller_unread_count ELSE 0 END), 0) AS unread_messages,
        MAX(c.updated_at) AS last_message_at
      FROM conversations c
      WHERE c.event_id IS NOT NULL
        AND c.seller_uid = ?
      GROUP BY c.event_id
    `)
    .all(creatorUid) as EventMessageSummaryRow[];
}

function loadEventActivitySummaries(db: any, creatorUid: string) {
  return db
    .prepare(`
      SELECT
        e.id AS event_id,
        COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_added_to_cart' THEN 1 ELSE 0 END), 0) AS cart_adds,
        COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_link_clicked' THEN 1 ELSE 0 END), 0) AS ticket_clicks,
        MAX(a.created_at) AS last_activity_at
      FROM events e
      LEFT JOIN event_activity a ON a.event_id = e.id
      WHERE e.creator_uid = ?
        AND e.deleted_at IS NULL
      GROUP BY e.id
    `)
    .all(creatorUid) as EventActivitySummaryRow[];
}

export function registerEventCreatorOverviewRoutes(app: Express, deps: { db: any }) {
  const { db } = deps;

  app.get("/api/event-creator/overview", requireAuth, (req, res) => {
    const uid = req.user!.uid;

    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid) as EventCreatorRow | undefined;
      const events = db
        .prepare(`
          SELECT *
          FROM events
          WHERE creator_uid = ?
            AND deleted_at IS NULL
          ORDER BY created_at DESC, id DESC
        `)
        .all(uid) as EventRow[];

      const messageSummaries = loadEventMessageSummaries(db, uid);
      const activitySummaries = loadEventActivitySummaries(db, uid);
      const transactionSummaries = getEventTransactionSummaries(db, events.map((event) => String(event.id)));
      const messageMap = new Map(messageSummaries.map((row) => [row.event_id, row]));
      const activityMap = new Map(activitySummaries.map((row) => [row.event_id, row]));

      const overviewEvents = events.map((event) => {
        const messages = messageMap.get(event.id);
        const activity = activityMap.get(event.id);
        const transactions = transactionSummaries.get(String(event.id));
        const lastActivityCandidates = [
          activity?.last_activity_at,
          messages?.last_message_at,
          transactions?.lastTransactionAt,
        ].filter(Boolean) as string[];
        const lastActivityAt = lastActivityCandidates.length
          ? lastActivityCandidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
          : null;

        return {
          ...serializeEventRow(event),
          message_threads: Number(messages?.message_threads || 0),
          unread_messages: Number(messages?.unread_messages || 0),
          last_message_at: messages?.last_message_at || null,
          cart_adds: Number(activity?.cart_adds || 0),
          ticket_clicks: Number(activity?.ticket_clicks || 0),
          last_activity_at: lastActivityAt,
          tickets_issued: Number(transactions?.ticketsIssued || 0),
          tickets_sold: Number(transactions?.ticketsSold || 0),
          tickets_cancelled: Number(transactions?.ticketsCancelled || 0),
          tickets_refunded: Number(transactions?.ticketsRefunded || 0),
          tickets_disputed: Number(transactions?.ticketsDisputed || 0),
          gross_revenue_amount: Number(transactions?.grossRevenueAmount || 0),
          net_revenue_amount: Number(transactions?.netRevenueAmount || 0),
          refunded_amount: Number(transactions?.refundedAmount || 0),
          revenue_amount: Number(transactions?.grossRevenueAmount || 0),
          revenue_currency: transactions?.revenueCurrency || "MWK",
          purchase_count: Number(transactions?.orderCount || 0),
          payment_count: Number(transactions?.paymentCount || 0),
          successful_payment_count: Number(transactions?.successfulPaymentCount || 0),
          pending_payment_count: Number(transactions?.pendingPaymentCount || 0),
          failed_payment_count: Number(transactions?.failedPaymentCount || 0),
          refunded_payment_count: Number(transactions?.refundedPaymentCount || 0),
          disputed_payment_count: Number(transactions?.disputedPaymentCount || 0),
          latest_payment_reference: transactions?.latestPaymentReference || null,
          last_sale_at: transactions?.lastTransactionAt || null,
          pending_issues:
            event.status !== "published" ||
            Number(messages?.unread_messages || 0) > 0 ||
            Number(transactions?.ticketsDisputed || 0) > 0 ||
            Number(transactions?.failedPaymentCount || 0) > 0,
        };
      });

      const totalTicketsSold = overviewEvents.reduce((sum, event) => sum + Number(event.tickets_sold || 0), 0);
      const revenueCurrency = overviewEvents.find((event) => Number(event.gross_revenue_amount || 0) > 0)?.revenue_currency || "MWK";
      const grossRevenueAmount = overviewEvents.reduce((sum, event) => sum + Number(event.gross_revenue_amount || 0), 0);
      const netRevenueAmount = overviewEvents.reduce((sum, event) => sum + Number(event.net_revenue_amount || 0), 0);
      const activeEvents = overviewEvents.filter((event) => event.status === "published").length;
      const pendingIssues = overviewEvents.filter((event) => event.pending_issues).length;

      return res.json({
        creator: creator
          ? { ...creator, status: deriveCreatorApprovalStatus(creator) }
          : null,
        events: overviewEvents,
        summary: {
          totalTicketsSold,
          grossRevenueAmount,
          netRevenueAmount,
          revenueAmount: grossRevenueAmount,
          revenueCurrency,
          activeEvents,
          pendingIssues,
          totalPaymentCount: overviewEvents.reduce((sum, event) => sum + Number(event.payment_count || 0), 0),
          totalDisputedTickets: overviewEvents.reduce((sum, event) => sum + Number(event.tickets_disputed || 0), 0),
          totalRefundedAmount: overviewEvents.reduce((sum, event) => sum + Number(event.refunded_amount || 0), 0),
        },
      });
    } catch (error) {
      console.error("Failed to load event creator overview", error);
      return res.status(500).json({ error: "Failed to load event creator overview" });
    }
  });
}
