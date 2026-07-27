import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

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

type EventSalesSummaryRow = {
  event_id: number;
  tickets_sold: number;
  revenue_amount: number;
  revenue_currency: string;
  purchase_count: number;
  last_sale_at: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  items: string;
  currency: string;
  total_amount: number;
  total_currency: string;
  paid_at: string | null;
  updated_at: string | null;
  created_at: string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
    .prepare(
      `
        SELECT
          c.event_id AS event_id,
          COUNT(*) AS message_threads,
          COALESCE(SUM(CASE WHEN c.seller_unread_count > 0 THEN c.seller_unread_count ELSE 0 END), 0) AS unread_messages,
          MAX(c.updated_at) AS last_message_at
        FROM conversations c
        WHERE c.event_id IS NOT NULL
          AND c.seller_uid = ?
        GROUP BY c.event_id
      `
    )
    .all(creatorUid) as EventMessageSummaryRow[];
}

function loadEventActivitySummaries(db: any, creatorUid: string) {
  return db
    .prepare(
      `
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
      `
    )
    .all(creatorUid) as EventActivitySummaryRow[];
}

function loadEventSalesSummaries(db: any, creatorUid: string) {
  const events = db
    .prepare(
      `
        SELECT id, ticket_price
        FROM events
        WHERE creator_uid = ?
          AND deleted_at IS NULL
      `
    )
    .all(creatorUid) as Array<{ id: number; ticket_price: number | null }>;

  const eventMap = new Map(events.map((event) => [event.id, event]));
  const summaries = new Map<number, EventSalesSummaryRow>();
  const orderIdsByEvent = new Map<number, Set<string>>();

  for (const event of events) {
    summaries.set(event.id, {
      event_id: event.id,
      tickets_sold: 0,
      revenue_amount: 0,
      revenue_currency: "MWK",
      purchase_count: 0,
      last_sale_at: null,
    });
    orderIdsByEvent.set(event.id, new Set());
  }

  const orders = db
    .prepare(
      `
        SELECT id, status, items, currency, total_amount, total_currency, paid_at, updated_at, created_at
        FROM orders
        WHERE status IN ('paid', 'in_escrow', 'fulfilled', 'closed')
      `
    )
    .all() as OrderRow[];

  for (const order of orders) {
    let items: Array<Record<string, unknown>> = [];
    try {
      const parsed = JSON.parse(order.items);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      items = [];
    }

    const saleTime = order.paid_at || order.updated_at || order.created_at;

    for (const item of items) {
      const eventId = Number(item.eventId ?? null);
      if (!Number.isInteger(eventId) || !eventMap.has(eventId)) continue;

      const summary = summaries.get(eventId);
      if (!summary) continue;

      const quantity = Math.max(1, Number(item.quantity ?? 1) || 1);
      const unitPriceRaw = item.unitPrice;
      const unitPrice =
        typeof unitPriceRaw === "object" && unitPriceRaw !== null && "amount" in unitPriceRaw
          ? Number((unitPriceRaw as { amount?: unknown }).amount ?? 0)
          : Number(item.ticketPrice ?? eventMap.get(eventId)?.ticket_price ?? 0);
      const revenue = Number.isFinite(unitPrice) ? unitPrice * quantity : 0;

      summary.tickets_sold += quantity;
      summary.revenue_amount += revenue;
      summary.revenue_currency = order.total_currency || order.currency || summary.revenue_currency;
      summary.last_sale_at = saleTime && (!summary.last_sale_at || new Date(saleTime).getTime() > new Date(summary.last_sale_at).getTime()) ? saleTime : summary.last_sale_at;
      orderIdsByEvent.get(eventId)?.add(order.id);
    }
  }

  return events.map((event) => {
    const summary = summaries.get(event.id);
    const orderIds = orderIdsByEvent.get(event.id) ?? new Set<string>();
    return {
      event_id: event.id,
      tickets_sold: summary?.tickets_sold ?? 0,
      revenue_amount: summary?.revenue_amount ?? 0,
      revenue_currency: summary?.revenue_currency ?? "MWK",
      purchase_count: orderIds.size,
      last_sale_at: summary?.last_sale_at ?? null,
    } as EventSalesSummaryRow;
  });
}

export function registerEventCreatorOverviewRoutes(app: Express, deps: { db: any }) {
  const { db } = deps;

  app.get("/api/event-creator/overview", requireAuth, (req, res) => {
    const uid = req.user!.uid;

    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      const events = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE creator_uid = ?
              AND deleted_at IS NULL
            ORDER BY created_at DESC, id DESC
          `
        )
        .all(uid) as EventRow[];

      const messageSummaries = loadEventMessageSummaries(db, uid);
      const activitySummaries = loadEventActivitySummaries(db, uid);
      const salesSummaries = loadEventSalesSummaries(db, uid);
      const messageMap = new Map(messageSummaries.map((row) => [row.event_id, row]));
      const activityMap = new Map(activitySummaries.map((row) => [row.event_id, row]));
      const salesMap = new Map(salesSummaries.map((row) => [row.event_id, row]));

      const overviewEvents = events.map((event) => {
        const messages = messageMap.get(event.id);
        const activity = activityMap.get(event.id);
        const sales = salesMap.get(event.id);
        const lastActivityCandidates = [activity?.last_activity_at, messages?.last_message_at, sales?.last_sale_at].filter(Boolean) as string[];
        const lastActivityAt =
          lastActivityCandidates.length > 0
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
          tickets_sold: Number(sales?.tickets_sold || 0),
          revenue_amount: Number(sales?.revenue_amount || 0),
          revenue_currency: sales?.revenue_currency || "MWK",
          purchase_count: Number(sales?.purchase_count || 0),
          last_sale_at: sales?.last_sale_at || null,
          pending_issues: event.status !== "published" || Number(messages?.unread_messages || 0) > 0,
        };
      });

      const totalTicketsSold = overviewEvents.reduce((sum, event) => sum + Number(event.tickets_sold || 0), 0);
      const revenueCurrency = overviewEvents.find((event) => Number(event.revenue_amount || 0) > 0)?.revenue_currency || "MWK";
      const revenueAmount = overviewEvents.reduce((sum, event) => sum + Number(event.revenue_amount || 0), 0);
      const activeEvents = overviewEvents.filter((event) => event.status === "published").length;
      const pendingIssues = overviewEvents.filter((event) => event.pending_issues).length;

      return res.json({
        creator: creator ?? null,
        events: overviewEvents,
        summary: {
          totalTicketsSold,
          revenueAmount,
          revenueCurrency,
          activeEvents,
          pendingIssues,
        },
      });
    } catch (error) {
      console.error("Failed to load event creator overview", error);
      return res.status(500).json({ error: "Failed to load event creator overview" });
    }
  });
}
