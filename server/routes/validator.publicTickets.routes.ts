import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { getPaymentDb } from "../postgresCompat.js";
import { orderRepository } from "../modules/orders/order.repository.js";
import { paymentRepository } from "../modules/payments/payment.repository.js";

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

type EventCreatorRow = {
  uid: string;
  email: string;
  display_name: string;
  organization_name: string;
  organization_type: string;
  contact_whatsapp: string | null;
  event_types: string;
  status: string;
  active_until: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: number;
  creator_uid: string | null;
  event_title: string;
  ticket_price: number | null;
  ticket_link: string | null;
  event_date: string | null;
  start_time: string | null;
  venue: string | null;
  location: string | null;
  organizer_name: string | null;
  status: string;
};

type PublicTicketHolder = {
  fullName: string;
  email: string;
  phone: string;
};

type PublicTicketRecord = {
  ticketId: string;
  code: string;
  ticketTitle: string;
  ticketType: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  seatOrZone: string;
  status: "Waiting Entry" | "Inside" | "Outside" | "Cancelled" | "Refunded" | "Blocked";
  purchaseDate: string;
  updatedAt: string;
};

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.validatorPublicTicketsRoutesInstalled");

function verifyBearerIdentity(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Missing Authorization Bearer token" });

  void (async () => {
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token.trim(), true);
      req.user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        email_verified: (decoded as any).email_verified === true,
        is_admin: (decoded as any).admin === true || (decoded as any).role === "admin",
      } as VerifiedRequestUser;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  })();
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEventCreatorActive(row: EventCreatorRow | undefined) {
  if (!row || row.status !== "approved") return false;
  if (!row.active_until) return true;
  return new Date(row.active_until).getTime() >= Date.now();
}

function loadCreatorRecord(uid: string) {
  const db = getPaymentDb();
  return db.prepare("SELECT * FROM event_creators WHERE uid = ? LIMIT 1").get(uid) as EventCreatorRow | undefined;
}

function mapOrderStatusToTicketStatus(orderStatus: string, paymentStatus: string | null) {
  const status = orderStatus.toLowerCase();
  const payment = (paymentStatus ?? "").toLowerCase();

  if (status === "refunded" || payment === "refunded") return "Refunded" as const;
  if (status === "cancelled") return "Cancelled" as const;
  if (status === "disputed" || status === "closed") return "Blocked" as const;
  if (status === "fulfilled") return "Inside" as const;
  if (status === "in_escrow") return "Outside" as const;
  return "Waiting Entry" as const;
}

function readHolder(source: Record<string, unknown> | undefined): PublicTicketHolder {
  if (!source) return { fullName: "", email: "", phone: "" };
  const fullName = normalizeString(source.fullName ?? source.full_name ?? source.attendeeName ?? source.attendee_name ?? source.name ?? source.fullName);
  const email = normalizeString(source.email ?? source.attendeeEmail ?? source.attendee_email ?? source.buyerEmail ?? source.buyer_email);
  const phone = normalizeString(source.phone ?? source.attendeePhone ?? source.attendee_phone ?? source.buyerPhone ?? source.buyer_phone);
  return { fullName, email, phone };
}

function buildPublicTicketsForEvent(uid: string, eventId: string) {
  const db = getPaymentDb();
  const event = db.prepare("SELECT * FROM events WHERE id = ? AND deleted_at IS NULL").get(Number(eventId)) as EventRow | undefined;
  if (!event) return null;

  const tickets: PublicTicketRecord[] = [];
  const rows = db.prepare("SELECT id FROM orders ORDER BY updated_at DESC, created_at DESC").all() as Array<{ id: string }>;

  for (const row of rows) {
    const order = orderRepository.findById(row.id);
    if (!order) continue;
    const payment = order.paymentReference ? paymentRepository.findByReference(order.paymentReference) ?? null : null;

    for (const item of order.items ?? []) {
      if (String(item.kind ?? "") !== "event_ticket" || String(item.eventId ?? "") !== eventId) continue;

      const itemData = item as Record<string, unknown>;
      const ticketType = normalizeString(itemData.ticketType ?? itemData.ticket_type ?? "General Admission") || "General Admission";
      const ticketTitle = normalizeString(itemData.title ?? event.event_title ?? "Event ticket") || "Event ticket";
      const eventDate = normalizeString(itemData.eventDate ?? itemData.event_date ?? event.event_date ?? "");
      const startTime = normalizeString(itemData.startTime ?? itemData.start_time ?? event.start_time ?? "");
      const venue = normalizeString(itemData.venue ?? event.venue ?? "");
      const location = normalizeString(itemData.location ?? event.location ?? "");
      const seatOrZone = normalizeString(itemData.seatOrZone ?? itemData.seat_or_zone ?? itemData.zone ?? itemData.seat ?? "");
      const quantity = Math.max(1, Number(item.quantity ?? 1) || 1);
      const updatedAt = payment?.updatedAt ?? order.updatedAt ?? event.updated_at;
      const purchaseDate = order.paidAt ?? order.placedAt ?? payment?.paidAt ?? updatedAt;
      const ticketRecords = Array.isArray(itemData.tickets) ? itemData.tickets.filter((entry) => entry && typeof entry === "object") as Array<Record<string, unknown>> : [];
      const fallbackTicketId = normalizeString(itemData.ticketId ?? itemData.ticket_id ?? order.paymentReference ?? `${order.id}-${event.id}`);
      const baseRecords = ticketRecords.length > 0 ? ticketRecords : Array.from({ length: quantity }, (_, index) => ({ ticketId: `${fallbackTicketId}${quantity > 1 ? `-${index + 1}` : ""}`, holder: itemData.ticketHolder }));

      baseRecords.forEach((record, index) => {
        const holder = readHolder((record.holder && typeof record.holder === "object") ? (record.holder as Record<string, unknown>) : (itemData.ticketHolder as Record<string, unknown> | undefined));
        const ticketId = normalizeString(record.ticketId ?? "") || `${fallbackTicketId}${baseRecords.length > 1 ? `-${index + 1}` : ""}`;

        tickets.push({
          ticketId,
          code: ticketId,
          ticketTitle,
          ticketType,
          attendeeName: holder.fullName || normalizeString(itemData.buyerName ?? itemData.buyer_name ?? "Ticket Holder"),
          attendeeEmail: holder.email,
          attendeePhone: holder.phone,
          eventDate,
          startTime,
          venue,
          location,
          seatOrZone,
          status: mapOrderStatusToTicketStatus(order.status, payment?.status ?? null),
          purchaseDate,
          updatedAt,
        });
      });
    }
  }

  return {
    success: true,
    event: {
      id: String(event.id),
      title: event.event_title,
      organizerName: event.organizer_name ?? "Event organizer",
      eventDate: event.event_date ?? "",
      startTime: event.start_time ?? "",
      venue: event.venue ?? "",
      location: event.location ?? "",
      ticketLink: event.ticket_link ?? null,
      status: event.status,
    },
    tickets,
    snapshot_version: event.updated_at,
  };
}

function validatorPublicTicketsHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const creator = loadCreatorRecord(user.uid);
  if (!isEventCreatorActive(creator)) {
    return res.status(403).json({ error: "Approved event creator access is required" });
  }

  const eventId = normalizeString(req.params.eventId);
  if (!eventId) {
    return res.status(400).json({ error: "Event id is required" });
  }

  const bundle = buildPublicTicketsForEvent(user.uid, eventId);
  if (!bundle) {
    return res.status(404).json({ error: "Event not found" });
  }

  return res.json(bundle);
}

export function registerValidatorPublicTicketRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;
  app.get("/api/validator/public/events/:eventId/tickets", verifyBearerIdentity, validatorPublicTicketsHandler);
  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
