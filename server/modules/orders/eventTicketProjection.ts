import { getPaymentDb } from "../../postgresCompat.js";
import type { StoredOrder } from "./order.repository.js";

type TicketRecord = Record<string, unknown>;

function isObject(value: unknown): value is TicketRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(source: TicketRecord | undefined, ...keys: string[]): string {
  if (!source) return "";
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function nullableText(source: TicketRecord | undefined, ...keys: string[]): string | null {
  const value = text(source, ...keys);
  return value || null;
}

function holderFor(item: TicketRecord, ticket: TicketRecord): TicketRecord {
  const holder = ticket.holder ?? item.ticketHolder;
  return isObject(holder) ? holder : {};
}

function ticketStatus(orderStatus: string, explicitStatus: string): string {
  const explicit = explicitStatus.toLowerCase();
  if (explicit === "cancelled") return "Cancelled";
  if (explicit === "refunded") return "Refunded";
  const status = orderStatus.toLowerCase();
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  if (status === "disputed" || status === "closed") return "Blocked";
  if (["paid", "in_escrow", "fulfilled"].includes(status)) return "Waiting Entry";
  return "Waiting Entry";
}

export function projectEventTickets(order: StoredOrder): void {
  const db = getPaymentDb();
  const now = new Date().toISOString();

  const eventItems = (order.items ?? [])
    .map((item) => item as unknown as TicketRecord)
    .filter((item) => item.kind === "event_ticket" || text(item, "eventId"));

  const eventIds = new Set<string>();

  for (const item of eventItems) {
    const eventId = text(item, "eventId");
    if (!eventId) continue;
    eventIds.add(eventId);

    const ticketRecords = Array.isArray(item.tickets)
      ? item.tickets.filter(isObject)
      : [];
    const fallbackId = text(item, "ticketId") || `${order.id}-${eventId}`;
    const records = ticketRecords.length > 0
      ? ticketRecords
      : [{ ticketId: fallbackId, holder: item.ticketHolder }];

    records.forEach((record, index) => {
      const holder = holderFor(item, record);
      const ticketId = text(record, "ticketId") || `${fallbackId}-${index + 1}`;
      const explicitStatus = text(record, "status");
      const status = ticketStatus(order.status, explicitStatus);
      const purchaseDate = order.paidAt ?? order.placedAt ?? order.createdAt ?? now;

      db.prepare(`
        INSERT INTO event_tickets (
          id, event_id, order_id, code, ticket_title, ticket_type,
          holder_name, holder_email, holder_phone, seat_or_zone, status,
          purchase_date, scanned_at, updated_at, event_title, event_date,
          start_time, end_time, venue, location, metadata
        ) VALUES (
          @id, @event_id, @order_id, @code, @ticket_title, @ticket_type,
          @holder_name, @holder_email, @holder_phone, @seat_or_zone, @status,
          @purchase_date, NULL, @updated_at, @event_title, @event_date,
          @start_time, @end_time, @venue, @location, @metadata
        )
        ON CONFLICT(id) DO UPDATE SET
          event_id = excluded.event_id,
          order_id = excluded.order_id,
          code = excluded.code,
          ticket_title = excluded.ticket_title,
          ticket_type = excluded.ticket_type,
          holder_name = excluded.holder_name,
          holder_email = excluded.holder_email,
          holder_phone = excluded.holder_phone,
          seat_or_zone = excluded.seat_or_zone,
          status = CASE
            WHEN event_tickets.status IN ('Inside','Outside') AND excluded.status NOT IN ('Cancelled','Refunded','Blocked')
              THEN event_tickets.status
            ELSE excluded.status
          END,
          purchase_date = excluded.purchase_date,
          updated_at = excluded.updated_at,
          event_title = excluded.event_title,
          event_date = excluded.event_date,
          start_time = excluded.start_time,
          end_time = excluded.end_time,
          venue = excluded.venue,
          location = excluded.location,
          metadata = excluded.metadata
      `).run({
        id: ticketId,
        event_id: eventId,
        order_id: order.id,
        code: ticketId,
        ticket_title: text(item, "title") || "Event Ticket",
        ticket_type: text(item, "ticketType") || "General Admission",
        holder_name: text(holder, "fullName", "name") || text(item, "buyerName"),
        holder_email: text(holder, "email"),
        holder_phone: text(holder, "phone", "phoneNumber"),
        seat_or_zone: nullableText(record, "seatOrZone") || nullableText(item, "seatOrZone"),
        status,
        purchase_date: purchaseDate,
        updated_at: now,
        event_title: text(item, "title"),
        event_date: text(item, "eventDate"),
        start_time: text(item, "startTime"),
        end_time: nullableText(item, "endTime"),
        venue: text(item, "venue"),
        location: text(item, "location"),
        metadata: JSON.stringify({ source: "order", projected_at: now }),
      });
    });
  }

  if (eventIds.size > 0) {
    db.prepare(`
      DELETE FROM event_tickets
      WHERE order_id = ?
        AND event_id NOT IN (${Array.from(eventIds).map(() => "?").join(",")})
    `).run(order.id, ...Array.from(eventIds));
  } else {
    db.prepare(`DELETE FROM event_tickets WHERE order_id = ?`).run(order.id);
  }
}

export function backfillEventTickets(): void {
  const db = getPaymentDb();
  const rows = db.prepare(`SELECT id FROM orders ORDER BY created_at ASC`).all() as Array<{ id: string }>;
  const orderRepositoryRows = rows;
  for (const row of orderRepositoryRows) {
    const stored = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(row.id) as Record<string, unknown> | undefined;
    if (!stored) continue;
    let items: StoredOrder["items"] = [];
    try {
      items = JSON.parse(String(stored.items ?? "[]")) as StoredOrder["items"];
    } catch {
      items = [];
    }
    projectEventTickets({
      id: String(stored.id), buyerId: String(stored.buyer_id ?? ""), sellerId: String(stored.seller_id ?? ""), source: stored.source as StoredOrder["source"], status: stored.status as StoredOrder["status"], currency: String(stored.currency ?? "MWK"),
      subtotal: { amount: Number(stored.subtotal_amount ?? 0), currency: String(stored.subtotal_currency ?? stored.currency ?? "MWK") },
      total: { amount: Number(stored.total_amount ?? 0), currency: String(stored.total_currency ?? stored.currency ?? "MWK") },
      items, placedAt: (stored.placed_at as string | null) ?? null, paidAt: (stored.paid_at as string | null) ?? null, fulfilledAt: (stored.fulfilled_at as string | null) ?? null,
      createdAt: String(stored.created_at ?? new Date().toISOString()), updatedAt: String(stored.updated_at ?? new Date().toISOString()),
    });
  }
}
