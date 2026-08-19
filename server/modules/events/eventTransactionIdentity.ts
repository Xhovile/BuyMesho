import type { PgCompatDatabase } from "../../db.js";

export type EventTicketIdentity = { ticketId: string; eventId: string; orderId: string };

export type EventTicketTransactionRecord = {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  orderId: string;
  ticketTitle: string;
  ticketType: string;
  ticketStatus: string;
  holderName: string;
  holderEmail: string;
  holderPhone: string;
  purchaseDate: string | null;
  payment: {
    id: string;
    provider: string;
    method: string;
    status: string;
    reference: string;
    providerReference: string | null;
    currency: string;
    amount: number;
    paidAt: string | null;
    verified: boolean;
  } | null;
  dispute: {
    id: string;
    status: string;
    reason: string;
    openedBy: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function nullableText(value: unknown): string | null {
  return text(value) || null;
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function findEventTicketIdentity(db: PgCompatDatabase, ticketId: string): EventTicketIdentity | null {
  const normalized = ticketId.trim();
  if (!normalized) return null;

  const row = db
    .prepare(`SELECT id, event_id, order_id FROM event_tickets WHERE id = ? OR code = ? LIMIT 1`)
    .get(normalized, normalized) as { id?: unknown; event_id?: unknown; order_id?: unknown } | undefined;

  if (!row) return null;
  const id = text(row.id);
  const eventId = text(row.event_id);
  const orderId = text(row.order_id);
  return id && eventId && orderId ? { ticketId: id, eventId, orderId } : null;
}

export function getEventTicketTransaction(db: PgCompatDatabase, ticketId: string): EventTicketTransactionRecord | null {
  const identity = findEventTicketIdentity(db, ticketId);
  if (!identity) return null;

  const ticket = db
    .prepare(`
      SELECT
        et.id,
        et.event_id,
        et.order_id,
        et.ticket_title,
        et.ticket_type,
        et.status,
        et.holder_name,
        et.holder_email,
        et.holder_phone,
        et.purchase_date,
        et.event_title,
        et.event_date,
        e.event_title AS canonical_event_title,
        e.event_date AS canonical_event_date
      FROM event_tickets et
      LEFT JOIN events e ON e.id = et.event_id
      WHERE et.id = ?
      LIMIT 1
    `)
    .get(identity.ticketId) as Record<string, unknown> | undefined;

  if (!ticket) return null;

  const payment = db
    .prepare(`
      SELECT id, provider, method, status, reference, provider_reference, currency, amount, paid_at, verified
      FROM payments
      WHERE order_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(identity.orderId) as Record<string, unknown> | undefined;

  const dispute = db
    .prepare(`
      SELECT id, status, reason, opened_by, created_at, updated_at
      FROM disputes
      WHERE order_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(identity.orderId) as Record<string, unknown> | undefined;

  return {
    ticketId: identity.ticketId,
    eventId: identity.eventId,
    eventTitle: text(ticket.canonical_event_title ?? ticket.event_title),
    eventDate: text(ticket.canonical_event_date ?? ticket.event_date),
    orderId: identity.orderId,
    ticketTitle: text(ticket.ticket_title),
    ticketType: text(ticket.ticket_type),
    ticketStatus: text(ticket.status),
    holderName: text(ticket.holder_name),
    holderEmail: text(ticket.holder_email),
    holderPhone: text(ticket.holder_phone),
    purchaseDate: nullableText(ticket.purchase_date),
    payment: payment
      ? {
          id: text(payment.id),
          provider: text(payment.provider),
          method: text(payment.method),
          status: text(payment.status),
          reference: text(payment.reference),
          providerReference: nullableText(payment.provider_reference),
          currency: text(payment.currency) || "MWK",
          amount: numberValue(payment.amount),
          paidAt: nullableText(payment.paid_at),
          verified: Number(payment.verified ?? 0) === 1,
        }
      : null,
    dispute: dispute
      ? {
          id: text(dispute.id),
          status: text(dispute.status),
          reason: text(dispute.reason),
          openedBy: nullableText(dispute.opened_by),
          createdAt: text(dispute.created_at),
          updatedAt: text(dispute.updated_at),
        }
      : null,
  };
}
