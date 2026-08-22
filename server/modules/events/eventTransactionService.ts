import type { PgCompatDatabase } from "../../db.js";
import { calculatePayoutFormula } from "../payouts/payout.policy.js";
import {
  findEventTicketIdentity,
  getEventTicketTransaction,
  type EventTicketTransactionRecord,
} from "./eventTransactionIdentity.js";

export type EventTransactionRecord = EventTicketTransactionRecord;

export type EventTransactionSummary = {
  eventId: string;
  ticketsIssued: number;
  ticketsSold: number;
  ticketsCancelled: number;
  ticketsRefunded: number;
  ticketsDisputed: number;
  orderCount: number;
  paymentCount: number;
  successfulPaymentCount: number;
  pendingPaymentCount: number;
  failedPaymentCount: number;
  refundedPaymentCount: number;
  disputedPaymentCount: number;
  grossRevenueAmount: number;
  netRevenueAmount: number;
  refundedAmount: number;
  revenueCurrency: string;
  lastTransactionAt: string | null;
  latestPaymentReference: string | null;
};

const SETTLED_ORDER_STATUSES = new Set(["paid", "in_escrow", "fulfilled", "closed"]);
const SUCCESSFUL_PAYMENT_STATUSES = new Set(["captured", "paid", "verified", "successful", "completed"]);
const PENDING_PAYMENT_STATUSES = new Set(["pending", "processing", "initiated", "created"]);
const FAILED_PAYMENT_STATUSES = new Set(["failed", "cancelled", "expired", "rejected"]);
const REFUNDED_PAYMENT_STATUSES = new Set(["refunded", "partially_refunded"]);

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseItems(value: unknown): Array<Record<string, unknown>> {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : [];
  } catch {
    return [];
  }
}

function eventItemForOrder(items: Array<Record<string, unknown>>, eventId: string): Array<Record<string, unknown>> {
  return items.filter((item) => text(item.eventId ?? item.event_id) === eventId);
}

function paymentState(value: unknown): string {
  return text(value).toLowerCase();
}

function transactionTimestamp(record: EventTransactionRecord): string | null {
  return record.payment?.paidAt || record.purchaseDate || record.dispute?.updatedAt || record.dispute?.createdAt || null;
}

function calculateItemRevenue(item: Record<string, unknown>, fallbackTicketPrice: number): number {
  const unitPrice = item.unitPrice;
  const amount =
    unitPrice && typeof unitPrice === "object" && !Array.isArray(unitPrice) && "amount" in unitPrice
      ? numberValue((unitPrice as Record<string, unknown>).amount)
      : numberValue(item.ticketPrice ?? fallbackTicketPrice);
  const quantity = Math.max(1, numberValue(item.quantity) || 1);
  return Math.max(0, amount * quantity);
}

export function getEventTransactions(
  db: PgCompatDatabase,
  eventId: string,
): EventTransactionRecord[] {
  const normalizedEventId = text(eventId);
  if (!normalizedEventId) return [];

  const ticketRows = db
    .prepare(
      `SELECT id
       FROM event_tickets
       WHERE event_id = ?
       ORDER BY purchase_date ASC, id ASC`,
    )
    .all(normalizedEventId) as Array<{ id?: unknown }>;

  return ticketRows
    .map((row) => text(row.id))
    .filter(Boolean)
    .map((ticketId) => getEventTicketTransaction(db, ticketId))
    .filter((record): record is EventTransactionRecord => Boolean(record));
}

export function getEventTransactionByTicketId(
  db: PgCompatDatabase,
  ticketId: string,
): EventTransactionRecord | null {
  return getEventTicketTransaction(db, ticketId);
}

export function getEventTransactionSummary(
  db: PgCompatDatabase,
  eventId: string,
): EventTransactionSummary {
  const normalizedEventId = text(eventId);
  const event = db
    .prepare(`SELECT id, ticket_price FROM events WHERE id = ? LIMIT 1`)
    .get(normalizedEventId) as { id?: unknown; ticket_price?: unknown } | undefined;

  const empty: EventTransactionSummary = {
    eventId: normalizedEventId,
    ticketsIssued: 0,
    ticketsSold: 0,
    ticketsCancelled: 0,
    ticketsRefunded: 0,
    ticketsDisputed: 0,
    orderCount: 0,
    paymentCount: 0,
    successfulPaymentCount: 0,
    pendingPaymentCount: 0,
    failedPaymentCount: 0,
    refundedPaymentCount: 0,
    disputedPaymentCount: 0,
    grossRevenueAmount: 0,
    netRevenueAmount: 0,
    refundedAmount: 0,
    revenueCurrency: "MWK",
    lastTransactionAt: null,
    latestPaymentReference: null,
  };

  if (!event?.id) return empty;

  const tickets = db
    .prepare(`
      SELECT id, order_id, status, purchase_date, updated_at
      FROM event_tickets
      WHERE event_id = ?
      ORDER BY id ASC
    `)
    .all(normalizedEventId) as Array<{
      id?: unknown;
      order_id?: unknown;
      status?: unknown;
      purchase_date?: unknown;
      updated_at?: unknown;
    }>;

  empty.ticketsIssued = tickets.length;
  empty.ticketsSold = tickets.filter((ticket) => !["Cancelled", "Refunded"].includes(text(ticket.status))).length;
  empty.ticketsCancelled = tickets.filter((ticket) => text(ticket.status) === "Cancelled").length;
  empty.ticketsRefunded = tickets.filter((ticket) => text(ticket.status) === "Refunded").length;

  const orderIds = [...new Set(tickets.map((ticket) => text(ticket.order_id)).filter(Boolean))];
  if (orderIds.length === 0) return empty;

  const placeholders = orderIds.map(() => "?").join(",");
  const orders = db
    .prepare(`
      SELECT o.id, o.status, o.items, o.currency, o.total_currency, o.paid_at, o.updated_at, o.created_at,
             p.id AS payment_id, p.provider, p.method, p.status AS payment_status,
             p.reference, p.provider_reference, p.amount AS payment_amount, p.currency AS payment_currency,
             p.paid_at AS payment_paid_at, p.verified
      FROM orders o
      LEFT JOIN payments p ON p.order_id = o.id
      WHERE o.id IN (${placeholders})
      ORDER BY p.paid_at DESC NULLS LAST, p.created_at DESC NULLS LAST, p.id DESC NULLS LAST
    `)
    .all(...orderIds) as Array<Record<string, unknown>>;

  const latestPaymentByOrder = new Map<string, Record<string, unknown>>();
  for (const row of orders) {
    const orderId = text(row.id);
    if (orderId && !latestPaymentByOrder.has(orderId) && row.payment_id) latestPaymentByOrder.set(orderId, row);
  }

  const orderSet = new Set<string>();
  let latestTimestamp: string | null = null;
  let latestReference: string | null = null;

  for (const [orderId, paymentRow] of latestPaymentByOrder.entries()) {
    const ticketItems = eventItemForOrder(parseItems(orders.find((row) => text(row.id) === orderId)?.items), normalizedEventId);
    if (ticketItems.length === 0) continue;

    orderSet.add(orderId);

    const orderRow = orders.find((row) => text(row.id) === orderId) ?? paymentRow;
    const orderStatus = paymentState(orderRow.status);
    const paymentStatus = paymentState(paymentRow.payment_status);
    const settled = SETTLED_ORDER_STATUSES.has(orderStatus) || SUCCESSFUL_PAYMENT_STATUSES.has(paymentStatus) || !!orderRow.paid_at;
    const saleTime = text(paymentRow.payment_paid_at || orderRow.paid_at || orderRow.updated_at || orderRow.created_at) || null;

    if (settled) {
      for (const item of ticketItems) {
        const gross = calculateItemRevenue(item, numberValue(event.ticket_price));
        const currency = text(paymentRow.payment_currency || orderRow.total_currency || orderRow.currency || "MWK") || "MWK";
        empty.grossRevenueAmount += gross;
        empty.netRevenueAmount += calculatePayoutFormula({ grossAmount: gross, currency }).netAmount;
        empty.revenueCurrency = currency;
      }
    }

    if (paymentStatus) {
      empty.paymentCount += 1;
      if (SUCCESSFUL_PAYMENT_STATUSES.has(paymentStatus)) empty.successfulPaymentCount += 1;
      else if (PENDING_PAYMENT_STATUSES.has(paymentStatus)) empty.pendingPaymentCount += 1;
      else if (FAILED_PAYMENT_STATUSES.has(paymentStatus)) empty.failedPaymentCount += 1;
      else if (REFUNDED_PAYMENT_STATUSES.has(paymentStatus)) {
        empty.refundedPaymentCount += 1;
        empty.refundedAmount += numberValue(paymentRow.payment_amount);
      }
    }

    if (saleTime && (!latestTimestamp || new Date(saleTime).getTime() > new Date(latestTimestamp).getTime())) {
      latestTimestamp = saleTime;
      latestReference = text(paymentRow.reference) || null;
    }
  }

  empty.orderCount = orderSet.size;

  const ticketTransactions = getEventTransactions(db, normalizedEventId);
  empty.ticketsDisputed = ticketTransactions.filter((transaction) => transaction.dispute?.status === "open").length;
  empty.disputedPaymentCount = ticketTransactions.filter((transaction) => transaction.dispute?.status === "open" && !!transaction.payment).length;

  for (const transaction of ticketTransactions) {
    const timestamp = transactionTimestamp(transaction);
    if (timestamp && (!latestTimestamp || new Date(timestamp).getTime() > new Date(latestTimestamp).getTime())) {
      latestTimestamp = timestamp;
      latestReference = transaction.payment?.reference || latestReference;
    }
  }

  empty.lastTransactionAt = latestTimestamp;
  empty.latestPaymentReference = latestReference;
  return empty;
}

export function getEventTransactionSummaries(
  db: PgCompatDatabase,
  eventIds: string[],
): Map<string, EventTransactionSummary> {
  const result = new Map<string, EventTransactionSummary>();
  for (const eventId of [...new Set(eventIds.map(text).filter(Boolean))]) {
    result.set(eventId, getEventTransactionSummary(db, eventId));
  }
  return result;
}

export { findEventTicketIdentity };
