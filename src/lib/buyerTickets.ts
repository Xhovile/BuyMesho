import type { BuyerPaymentRecord } from "./buyerState";
import type { OrderBundle } from "./orderApi";

export type BuyerTicketStatus = "pending" | "paid" | "rejected" | "error";

export type BuyerTicketRecord = {
  key: string;
  reference: string;
  orderId: string;
  eventId: string;
  title: string;
  organizerName: string;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  quantity: number;
  amount: number;
  currency: string;
  status: BuyerTicketStatus;
  paymentStatus: string;
  orderStatus: string;
  ticketCode: string;
  detail: string;
  updatedAt: string | null;
  source: "order" | "payment";
};

const SUCCESS_PAYMENT_STATUSES = new Set(["paid", "captured", "verified", "successful", "completed"]);
const PENDING_PAYMENT_STATUSES = new Set(["pending", "initiated", "processing", "queued", "awaiting_payment"]);
const REJECTED_PAYMENT_STATUSES = new Set(["rejected", "cancelled", "refunded"]);
const ERROR_PAYMENT_STATUSES = new Set(["failed", "error"]);
const PAID_ORDER_STATUSES = new Set(["paid", "in_escrow", "fulfilled", "closed"]);
const PENDING_ORDER_STATUSES = new Set(["draft", "pending_payment"]);
const REJECTED_ORDER_STATUSES = new Set(["cancelled", "refunded"]);

function normalizeToken(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function classifyOrderStatus(orderStatus: unknown, paymentStatus: unknown): BuyerTicketStatus {
  const normalizedOrderStatus = normalizeToken(orderStatus);
  const normalizedPaymentStatus = normalizeToken(paymentStatus);

  if (ERROR_PAYMENT_STATUSES.has(normalizedPaymentStatus)) return "error";
  if (REJECTED_PAYMENT_STATUSES.has(normalizedPaymentStatus) || REJECTED_ORDER_STATUSES.has(normalizedOrderStatus)) return "rejected";
  if (SUCCESS_PAYMENT_STATUSES.has(normalizedPaymentStatus) || PAID_ORDER_STATUSES.has(normalizedOrderStatus)) return "paid";
  if (PENDING_PAYMENT_STATUSES.has(normalizedPaymentStatus) || PENDING_ORDER_STATUSES.has(normalizedOrderStatus) || !normalizedPaymentStatus) return "pending";
  return "pending";
}

function getOrderReference(bundle: OrderBundle): string {
  if (typeof bundle.order?.paymentReference === "string" && bundle.order.paymentReference.trim()) {
    return bundle.order.paymentReference;
  }
  return String(bundle.order?.id ?? "Unknown reference");
}

function getOrderStatusText(bundle: OrderBundle): string {
  return String(bundle.order?.status ?? "pending");
}

function getPaymentStatusText(payment: BuyerPaymentRecord | undefined): string {
  return String(payment?.status ?? "pending");
}

function formatTicketCode(reference: string, eventId: string) {
  const seed = `${reference}-${eventId}`.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase();
  return seed.slice(0, 18) || `TKT-${eventId}`;
}

function buildDetail(eventDate: string, startTime: string, venue: string, location: string, source: string) {
  const parts = [eventDate, startTime, venue, location].filter(Boolean);
  const prefix = source === "payment" ? "Pending ticket" : "Ticket";
  return `${prefix}: ${parts.join(" • ")}`;
}

function getEventTicketKey(reference: string, eventId: string) {
  return `${reference}:${eventId}`;
}

export function buildBuyerTickets(orders: OrderBundle[], buyerPayments: BuyerPaymentRecord[]): BuyerTicketRecord[] {
  const paymentByReference = new Map<string, BuyerPaymentRecord>();
  const paymentByOrderId = new Map<string, BuyerPaymentRecord>();

  buyerPayments.forEach((payment) => {
    paymentByReference.set(payment.reference, payment);
    if (payment.orderId) paymentByOrderId.set(String(payment.orderId), payment);
  });

  const tickets: BuyerTicketRecord[] = [];
  const seen = new Set<string>();

  const pushTicket = (ticket: BuyerTicketRecord) => {
    const dedupeKey = getEventTicketKey(ticket.reference, ticket.eventId);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    tickets.push(ticket);
  };

  orders.forEach((bundle) => {
    const payment = paymentByReference.get(getOrderReference(bundle)) ?? paymentByOrderId.get(String(bundle.order?.id ?? ""));
    const paymentStatus = getPaymentStatusText(payment);
    const orderStatus = getOrderStatusText(bundle);
    const ticketStatus = classifyOrderStatus(orderStatus, paymentStatus);
    const updatedAt =
      bundle.order?.updatedAt ??
      bundle.order?.updated_at ??
      bundle.payment?.paidAt ??
      bundle.payment?.paid_at ??
      bundle.payment?.updatedAt ??
      bundle.payment?.updated_at ??
      bundle.order?.createdAt ??
      bundle.order?.created_at ??
      null;

    (bundle.order?.items ?? [])
      .filter((item) => item?.kind === "event_ticket" || item?.eventId)
      .forEach((item) => {
        const eventId = String(item.eventId ?? "");
        if (!eventId) return;
        const reference = String(bundle.order?.paymentReference ?? bundle.order?.id ?? `event-${eventId}`);

        pushTicket({
          key: `${reference}:${eventId}`,
          reference,
          orderId: String(bundle.order?.id ?? reference),
          eventId,
          title: String(item.title ?? `Event ${eventId}`),
          organizerName: String((bundle.order as Record<string, unknown> | undefined)?.organizerName ?? "Event organizer"),
          eventDate: String((bundle.order as Record<string, unknown> | undefined)?.eventDate ?? ""),
          startTime: String((bundle.order as Record<string, unknown> | undefined)?.startTime ?? ""),
          venue: String((bundle.order as Record<string, unknown> | undefined)?.venue ?? ""),
          location: String((bundle.order as Record<string, unknown> | undefined)?.location ?? ""),
          quantity: Math.max(1, Number(item.quantity ?? 1) || 1),
          amount: Number(bundle.order?.total?.amount ?? 0),
          currency: String(bundle.order?.total?.currency ?? "MWK"),
          status: ticketStatus,
          paymentStatus,
          orderStatus,
          ticketCode: formatTicketCode(reference, eventId),
          detail: buildDetail(String((bundle.order as Record<string, unknown> | undefined)?.eventDate ?? ""), String((bundle.order as Record<string, unknown> | undefined)?.startTime ?? ""), String((bundle.order as Record<string, unknown> | undefined)?.venue ?? ""), String((bundle.order as Record<string, unknown> | undefined)?.location ?? ""), "order"),
          updatedAt,
          source: "order",
        });
      });
  });

  buyerPayments.forEach((payment) => {
    const eventIds = Array.isArray((payment as BuyerPaymentRecord & { eventIds?: string[] }).eventIds)
      ? ((payment as BuyerPaymentRecord & { eventIds?: string[] }).eventIds ?? [])
      : [];
    const checkoutItems = Array.isArray(payment.checkoutItems) ? payment.checkoutItems : [];
    const fallbackEventIds = [
      ...eventIds,
      ...checkoutItems
        .filter((item) => item.eventId)
        .map((item) => String(item.eventId)),
    ].filter(Boolean);

    if (!fallbackEventIds.length) return;

    const ticketStatus = classifyOrderStatus(payment.status, payment.status);
    fallbackEventIds.forEach((eventId) => {
      const reference = String(payment.reference ?? payment.txRef ?? `event-${eventId}`);
      const dedupeKey = getEventTicketKey(reference, eventId);
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      tickets.push({
        key: dedupeKey,
        reference,
        orderId: String(payment.orderId ?? reference),
        eventId,
        title: payment.listingTitle || `Event ${eventId}`,
        organizerName: "Event organizer",
        eventDate: "",
        startTime: "",
        venue: "",
        location: "",
        quantity: Math.max(1, Number(payment.quantity ?? 1) || 1),
        amount: Number(payment.totalPrice ?? 0),
        currency: "MWK",
        status: ticketStatus,
        paymentStatus: payment.status,
        orderStatus: payment.status,
        ticketCode: formatTicketCode(reference, eventId),
        detail: buildDetail("", "", "", "", "payment"),
        updatedAt: payment.updatedAt ?? payment.createdAt ?? null,
        source: "payment",
      });
    });
  });

  tickets.sort((left, right) => {
    const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
    const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
    return rightTime - leftTime;
  });

  return tickets;
}
