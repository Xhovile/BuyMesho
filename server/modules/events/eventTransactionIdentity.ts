import type { PgCompatDatabase } from "../../db.js";

export type EventTicketIdentity = {
  ticketId: string;
  eventId: string;
  orderId: string;
};

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

function toNullableString(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  return text || null;
}

function toStringValue(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function findEventTicketIdentity(db: PgCompatDatabase, ticketId: string): EventTicketIdentity | null {
  const normalized = ticketId.trim();
  if (!normalized) return null;

  const row = db
    .prepare(
      `SELECT id, event_id, order_id
       FROM event_tickets
       WHERE id = ? OR code = ?
       LIMIT 1`,
    )
    .get(normalized, normalized) as { id?: unknown; event_id?: unknown; order_id?: unknown } | undefined;

  if (!row) return null;

  const id = toStringValue(row.id);
  const eventId = toStringValue(row.event_id);
  const orderId = toStringValue(row.order_id);
  if (!id || !eventId || !orderId) return null;

  return { ticketId: id, eventId, orderId };
}

export function getEventTicketTransaction(
  db: PgCompatDatabase,
  ticketId: string,
): EventTicketTransactionRecord | null {
  const row = db
    .prepare(
      `
        SELECT
          et.id AS ticket_id,
          et.event_id,
          et.order_id,
          et.ticket_title,
          et.ticket_type,
          et.status AS ticket_status,
          et.holder_name,
          et.holder_email,
          et.holder_phone,
          et.purchase_date,
          et.event_title,
          et.event_date,
          e.event_title AS canonical_event_title,
          e.event_date AS canonical_event_date,
          p.id AS payment_id,
          p.provider AS payment_provider,
          p.method AS payment_method,
          p.status AS payment_status,
          p.reference AS payment_reference,
          p.provider_reference,
          p.currency AS payment_currency,
          p.amount AS payment_amount,
          p.paid_at AS payment_paid_at,
          p.verified AS payment_verified,
          d.id AS dispute_id,
          d.status AS dispute_status,
          d.reason AS dispute_reason,
          d.opened_by AS dispute_opened_by,
          d.created_at AS dispute_created_at,
          d.updated_at AS dispute_updated_at
        FROM event_tickets et
        LEFT JOIN events e ON e.id = et.event_id
        LEFT JOIN payments p ON p.order_id = et.order_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM disputes d0
          WHERE d0.order_id = et.order_id
          ORDER BY d0.created_at DESC
          LIMIT 1
        ) d ON TRUE
        WHERE et.id = ? OR et.code = ?
        ORDER BY p.created_at DESC NULLS LAST
        LIMIT 1
      `,
    )
    .get(ticketId.trim(), ticketId.trim()) as Record<string, unknown> | undefined;

  if (!row) return null;

  const resolvedTicketId = toStringValue(row.ticket_id);
  const eventId = toStringValue(row.event_id);
  const orderId = toStringValue(row.order_id);
  if (!resolvedTicketId || !eventId || !orderId) return null;

  return {
    ticketId: resolvedTicketId,
    eventId,
    eventTitle: toStringValue(row.canonical_event_title ?? row.event_title),
    eventDate: toStringValue(row.canonical_event_date ?? row.event_date),
    orderId,
    ticketTitle: toStringValue(row.ticket_title),
    ticketType: toStringValue(row.ticket_type),
    ticketStatus: toStringValue(row.ticket_status),
    holderName: toStringValue(row.holder_name),
    holderEmail: toStringValue(row.holder_email),
    holderPhone: toStringValue(row.holder_phone),
    purchaseDate: toNullableString(row.purchase_date),
    payment: row.payment_id
      ? {
          id: toStringValue(row.payment_id),
          provider: toStringValue(row.payment_provider),
          method: toStringValue(row.payment_method),
          status: toStringValue(row.payment_status),
          reference: toStringValue(row.payment_reference),
          providerReference: toNullableString(row.provider_reference),
          currency: toStringValue(row.payment_currency) || "MWK",
          amount: toNumber(row.payment_amount),
          paidAt: toNullableString(row.payment_paid_at),
          verified: Number(row.payment_verified ?? 0) === 1,
        }
      : null,
    dispute: row.dispute_id
      ? {
          id: toStringValue(row.dispute_id),
          status: toStringValue(row.dispute_status),
          reason: toStringValue(row.dispute_reason),
          openedBy: toNullableString(row.dispute_opened_by),
          createdAt: toStringValue(row.dispute_created_at),
          updatedAt: toStringValue(row.dispute_updated_at),
        }
      : null,
  };
}

export function getEventTicketTransactionByOrder(
  db: PgCompatDatabase,
  orderId: string,
): EventTicketTransactionRecord[] {
  const normalized = orderId.trim();
  if (!normalized) return [];

  const rows = db
    .prepare(
      `
        SELECT et.id
        FROM event_tickets et
        WHERE et.order_id = ?
        ORDER BY et.purchase_date ASC, et.id ASC
      `,
    )
    .all(normalized) as Array<{ id?: unknown }>;

  return rows
    .map((row) => toStringValue(row.id))
    .filter(Boolean)
    .map((id) => getEventTicketTransaction(db, id))
    .filter((record): record is EventTicketTransactionRecord => Boolean(record));
}
