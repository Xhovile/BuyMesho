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

function readString(source: Record<string, unknown> | undefined, ...fields: string[]) {
  if (!source) return "";
  for (const field of fields) {
    const value = source[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readNumber(source: Record<string, unknown> | undefined, ...fields: string[]) {
  if (!source) return null;
  for (const field of fields) {
    const value = source[field];
    const numeric = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function readUnitPrice(itemData: Record<string, unknown> | undefined) {
  if (!itemData) return { amount: null as number | null, currency: "MWK" };

  const nestedUnitPrice = itemData.unitPrice;
  const nestedUnitPriceObject = nestedUnitPrice && typeof nestedUnitPrice === "object" ? (nestedUnitPrice as Record<string, unknown>) : undefined;
  const amount =
    readNumber(itemData, "ticketPrice") ??
    readNumber(nestedUnitPriceObject, "amount") ??
    null;
  const currency = readString(nestedUnitPriceObject, "currency") || "MWK";

  return { amount, currency };
}

function resolvePaymentTicketAmount(
  payment: BuyerPaymentRecord,
  eventId: string,
  eventDetail?: BuyerPaymentRecord["eventDetails"][number],
) {
  const checkoutItem = (payment.checkoutItems ?? []).find((entry) => String(entry.eventId) === eventId);
  const checkoutQuantity = Math.max(1, Number(eventDetail?.quantity ?? checkoutItem?.quantity ?? 1) || 1);
  const detailPrice = Number(eventDetail?.ticketPrice ?? 0);

  if (Number.isFinite(detailPrice) && detailPrice > 0) {
    return detailPrice * checkoutQuantity;
  }

  if (checkoutItem && typeof (checkoutItem as Record<string, unknown>).totalPrice === "number") {
    return Number((checkoutItem as Record<string, unknown>).totalPrice) || 0;
  }

  if (checkoutItem && typeof (checkoutItem as Record<string, unknown>).unitPrice === "number") {
    return Number((checkoutItem as Record<string, unknown>).unitPrice) * checkoutQuantity;
  }

  return 0;
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
        const itemData = item as Record<string, unknown>;
        const eventId = String(itemData.eventId ?? "");
        if (!eventId) return;
        const reference = String(bundle.order?.paymentReference ?? bundle.order?.id ?? `event-${eventId}`);
        const paymentEvent = payment?.eventDetails?.find((entry) => String(entry.eventId) === eventId);
        const eventDate = readString(itemData, "eventDate") || paymentEvent?.eventDate || "";
        const startTime = readString(itemData, "startTime") || paymentEvent?.startTime || "";
        const venue = readString(itemData, "venue") || paymentEvent?.venue || "";
        const location = readString(itemData, "location") || paymentEvent?.location || "";
        const organizerName = readString(itemData, "organizerName") || paymentEvent?.organizerName || "Event organizer";
        const quantity = Math.max(1, Number(item.quantity ?? paymentEvent?.quantity ?? 1) || 1);
        const { amount: itemUnitPrice, currency } = readUnitPrice(itemData);
        const paymentEventPrice = Number(paymentEvent?.ticketPrice ?? 0);
        const amount =
          (Number.isFinite(itemUnitPrice ?? NaN) && (itemUnitPrice ?? 0) > 0)
            ? (itemUnitPrice as number) * quantity
            : paymentEventPrice > 0
              ? paymentEventPrice * quantity
              : Number(bundle.order?.total?.amount ?? 0);

        pushTicket({
          key: `${reference}:${eventId}`,
          reference,
          orderId: String(bundle.order?.id ?? reference),
          eventId,
          title: String(item.title ?? paymentEvent?.title ?? `Event ${eventId}`),
          organizerName,
          eventDate,
          startTime,
          venue,
          location,
          quantity,
          amount,
          currency,
          status: ticketStatus,
          paymentStatus,
          orderStatus,
          ticketCode: formatTicketCode(reference, eventId),
          detail: buildDetail(eventDate, startTime, venue, location, "order"),
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
      ...(payment.eventDetails ?? []).map((entry) => String(entry.eventId)),
    ].filter(Boolean);

    if (!fallbackEventIds.length) return;

    const ticketStatus = classifyOrderStatus(payment.status, payment.status);
    fallbackEventIds.forEach((eventId) => {
      const reference = String(payment.reference ?? payment.txRef ?? `event-${eventId}`);
      const dedupeKey = getEventTicketKey(reference, eventId);
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);

      const eventDetail = payment.eventDetails?.find((entry) => String(entry.eventId) === eventId);
      const checkoutItem = checkoutItems.find((entry) => String(entry.eventId) === eventId);
      const title = eventDetail?.title || payment.listingTitle || `Event ${eventId}`;
      const quantity = Math.max(1, Number(eventDetail?.quantity ?? checkoutItem?.quantity ?? payment.quantity ?? 1) || 1);
      const amount = resolvePaymentTicketAmount(payment, eventId, eventDetail);

      pushTicket({
        key: dedupeKey,
        orderId: String(payment.orderId ?? reference),
        reference,
        eventId,
        title,
        organizerName: eventDetail?.organizerName || "Event organizer",
        eventDate: eventDetail?.eventDate || "",
        startTime: eventDetail?.startTime || "",
        venue: eventDetail?.venue || "",
        location: eventDetail?.location || "",
        quantity,
        amount,
        currency: "MWK",
        status: ticketStatus,
        paymentStatus: payment.status,
        orderStatus: payment.status,
        ticketCode: formatTicketCode(reference, eventId),
        detail: buildDetail(eventDetail?.eventDate || "", eventDetail?.startTime || "", eventDetail?.venue || "", eventDetail?.location || "", "payment"),
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
