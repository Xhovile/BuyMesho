import type { BuyerPaymentRecord } from "./buyerState";
import type { OrderBundle } from "./orderApi";
import { extractPayChanguTicketCode } from "./ticketCode";

export type BuyerTicketStatus = "pending" | "paid" | "rejected" | "error";

export type BuyerTicketRecord = {
  key: string;
  reference: string;
  orderId: string;
  eventId: string;
  ticketId: string;
  ticketType: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
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

function normalizeToken(value: unknown): string { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
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
  if (typeof bundle.order?.paymentReference === "string" && bundle.order.paymentReference.trim()) return bundle.order.paymentReference;
  return String(bundle.order?.id ?? "Unknown reference");
}
function getOrderStatusText(bundle: OrderBundle): string { return String(bundle.order?.status ?? "pending"); }
function getPaymentStatusText(payment: BuyerPaymentRecord | undefined): string { return String(payment?.status ?? "pending"); }
function formatTicketCode(reference: string, orderId: string, txRef?: string | null) { return extractPayChanguTicketCode(orderId, reference, txRef); }
function buildDetail(eventDate: string, startTime: string, venue: string, location: string, source: string) { const parts = [eventDate, startTime, venue, location].filter(Boolean); return `${source === "payment" ? "Pending ticket" : "Ticket"}: ${parts.join(" • ")}`; }
function readString(source: Record<string, unknown> | undefined, ...fields: string[]) { if (!source) return ""; for (const field of fields) { const value = source[field]; if (typeof value === "string" && value.trim()) return value.trim(); } return ""; }
function readNumber(source: Record<string, unknown> | undefined, ...fields: string[]) { if (!source) return null; for (const field of fields) { const value = source[field]; const numeric = typeof value === "number" ? value : Number(value); if (Number.isFinite(numeric)) return numeric; } return null; }
function readUnitPrice(itemData: Record<string, unknown> | undefined) {
  if (!itemData) return { amount: null as number | null, currency: "MWK" };
  const nestedUnitPrice = itemData.unitPrice;
  const nestedUnitPriceObject = nestedUnitPrice && typeof nestedUnitPrice === "object" ? (nestedUnitPrice as Record<string, unknown>) : undefined;
  return { amount: readNumber(itemData, "ticketPrice") ?? readNumber(nestedUnitPriceObject, "amount") ?? null, currency: readString(nestedUnitPriceObject, "currency") || "MWK" };
}
function resolvePaymentTicketAmount(payment: BuyerPaymentRecord, eventId: string, eventDetail?: BuyerPaymentRecord["eventDetails"][number]) {
  const checkoutItem = (payment.checkoutItems ?? []).find((entry) => String(entry.eventId) === eventId);
  const checkoutQuantity = Math.max(1, Number(eventDetail?.quantity ?? checkoutItem?.quantity ?? 1) || 1);
  if (typeof eventDetail?.ticketPrice === "number") return eventDetail.ticketPrice * checkoutQuantity;
  if (checkoutItem && typeof (checkoutItem as Record<string, unknown>).totalPrice === "number") return Number((checkoutItem as Record<string, unknown>).totalPrice) || 0;
  if (checkoutItem && typeof (checkoutItem as Record<string, unknown>).unitPrice === "number") return Number((checkoutItem as Record<string, unknown>).unitPrice) * checkoutQuantity;
  return 0;
}

export function buildBuyerTickets(orders: OrderBundle[], buyerPayments: BuyerPaymentRecord[]): BuyerTicketRecord[] {
  const paymentByReference = new Map<string, BuyerPaymentRecord>();
  const paymentByOrderId = new Map<string, BuyerPaymentRecord>();
  buyerPayments.forEach((payment) => { paymentByReference.set(payment.reference, payment); if (payment.orderId) paymentByOrderId.set(String(payment.orderId), payment); });

  const tickets: BuyerTicketRecord[] = [];
  const seen = new Set<string>();
  const pushTicket = (ticket: BuyerTicketRecord) => { const dedupeKey = `${ticket.eventId}:${ticket.ticketId || ticket.key}`; if (seen.has(dedupeKey)) return; seen.add(dedupeKey); tickets.push(ticket); };

  orders.forEach((bundle) => {
    const payment = paymentByReference.get(getOrderReference(bundle)) ?? paymentByOrderId.get(String(bundle.order?.id ?? ""));
    const paymentStatus = getPaymentStatusText(payment);
    const orderStatus = getOrderStatusText(bundle);
    const ticketStatus = classifyOrderStatus(orderStatus, paymentStatus);
    const updatedAtCandidates = [bundle.order?.placedAt, bundle.order?.paidAt, bundle.payment?.paidAt, bundle.payment?.createdAt, bundle.order?.createdAt, bundle.order?.updatedAt, bundle.payment?.updatedAt];
    const updatedAt = updatedAtCandidates.find((value): value is string => typeof value === "string" && value.trim().length > 0) ?? null;

    (bundle.order?.items ?? []).filter((item) => item?.kind === "event_ticket" || item?.eventId).forEach((item) => {
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
      const paymentEventPrice = paymentEvent?.ticketPrice;
      const amount = typeof itemUnitPrice === "number" ? itemUnitPrice * quantity : typeof paymentEventPrice === "number" ? paymentEventPrice * quantity : Number(bundle.order?.total?.amount ?? 0);
      const ticketRecords = Array.isArray(itemData.tickets) ? itemData.tickets.filter((entry) => entry && typeof entry === "object") as Array<Record<string, unknown>> : [];
      const fallbackTicketId = readString(itemData, "ticketId") || formatTicketCode(reference, String(bundle.order?.id ?? reference), payment?.txRef ?? null);
      const ticketType = readString(itemData, "ticketType") || "General Admission";
      const records = ticketRecords.length > 0 ? ticketRecords : [{ ticketId: fallbackTicketId, holder: itemData.ticketHolder } as Record<string, unknown>];

      records.forEach((record, index) => {
        const holder = record.holder && typeof record.holder === "object" ? record.holder as Record<string, unknown> : itemData.ticketHolder && typeof itemData.ticketHolder === "object" ? itemData.ticketHolder as Record<string, unknown> : {};
        const ticketId = readString(record, "ticketId") || `${fallbackTicketId}-${index + 1}`;
        const ticketAmount = quantity > 0 && records.length > 1 ? amount / records.length : amount;
        pushTicket({
          key: `${eventId}:${ticketId}`,
          reference,
          orderId: String(bundle.order?.id ?? reference),
          eventId,
          ticketId,
          ticketType,
          holderName: readString(holder, "fullName") || readString(itemData, "buyerName") || "",
          holderEmail: readString(holder, "email") || "",
          holderPhone: readString(holder, "phone") || "",
          title: String(item.title ?? paymentEvent?.title ?? `Event ${eventId}`),
          organizerName,
          eventDate,
          startTime,
          venue,
          location,
          quantity: 1,
          amount: ticketAmount,
          currency,
          status: ticketStatus,
          paymentStatus,
          orderStatus,
          ticketCode: ticketId,
          detail: buildDetail(eventDate, startTime, venue, location, "order"),
          updatedAt,
          source: "order",
        });
      });
    });
  });

  buyerPayments.forEach((payment) => {
    const eventIds = Array.isArray((payment as BuyerPaymentRecord & { eventIds?: string[] }).eventIds) ? ((payment as BuyerPaymentRecord & { eventIds?: string[] }).eventIds ?? []) : [];
    const checkoutItems = Array.isArray(payment.checkoutItems) ? payment.checkoutItems : [];
    const fallbackEventIds = [...eventIds, ...checkoutItems.filter((item) => item.eventId).map((item) => String(item.eventId)), ...(payment.eventDetails ?? []).map((entry) => String(entry.eventId))].filter(Boolean);
    if (!fallbackEventIds.length) return;
    const ticketStatus = classifyOrderStatus(payment.status, payment.status);
    fallbackEventIds.forEach((eventId) => {
      const reference = String(payment.reference ?? payment.txRef ?? `event-${eventId}`);
      const eventDetail = payment.eventDetails?.find((entry) => String(entry.eventId) === eventId);
      const checkoutItem = checkoutItems.find((entry) => String(entry.eventId) === eventId);
      const title = eventDetail?.title || payment.listingTitle || `Event ${eventId}`;
      const quantity = Math.max(1, Number(eventDetail?.quantity ?? checkoutItem?.quantity ?? payment.quantity ?? 1) || 1);
      const amount = resolvePaymentTicketAmount(payment, eventId, eventDetail);
      const updatedAt = payment.createdAt ?? payment.updatedAt ?? null;
      // A payment record alone does not contain the canonical public Ticket ID.
      // Do not expose an order/payment reference as a fake Ticket ID while payment is pending.
      pushTicket({ key: `${reference}:${eventId}:pending`, orderId: String(payment.orderId ?? reference), reference, eventId, ticketId: "", ticketType: "General Admission", holderName: "", holderEmail: "", holderPhone: "", title, organizerName: eventDetail?.organizerName || "Event organizer", eventDate: eventDetail?.eventDate || "", startTime: eventDetail?.startTime || "", venue: eventDetail?.venue || "", location: eventDetail?.location || "", quantity, amount, currency: "MWK", status: ticketStatus, paymentStatus: payment.status, orderStatus: payment.status, ticketCode: "", detail: buildDetail(eventDetail?.eventDate || "", eventDetail?.startTime || "", eventDetail?.venue || "", eventDetail?.location || "", "payment"), updatedAt, source: "payment" });
    });
  });

  tickets.sort((left, right) => (right.updatedAt ? Date.parse(right.updatedAt) : 0) - (left.updatedAt ? Date.parse(left.updatedAt) : 0));
  return tickets;
}
