import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";
import { getPaymentDb } from "../postgresCompat.js";
import { orderRepository } from "../modules/orders/order.repository.js";
import { paymentRepository } from "../modules/payments/payment.repository.js";

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

type ValidatorQueueItem = {
  queueId: string;
  ticketId: string;
  eventId: string;
  actionType: "check_in" | "check_out" | "status_change";
  previousStatus: string;
  newStatus: string;
  gateName: string;
  staffName: string;
  timestamp: string;
  clientSnapshotVersion: string;
  idempotencyKey: string;
};

type ValidatorTicket = {
  id: string;
  code: string;
  event_id: string;
  event_title: string;
  order_id: string;
  buyer_id: string;
  status: "Waiting Entry" | "Inside" | "Outside" | "Cancelled" | "Refunded" | "Blocked" | "Duplicate Scan Attempt";
  order_status: string;
  payment_status: string | null;
  updated_at: string;
  version: string;
  metadata: Record<string, unknown>;
};

type ValidatorEvent = {
  id: string;
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
  spec_values: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
  version: string;
  ticket_count: number;
};

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.validatorRoutesInstalled");

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

function loadCreatorRecord(uid: string) {
  const db = getPaymentDb();
  return db.prepare("SELECT * FROM event_creators WHERE uid = ? LIMIT 1").get(uid) as { uid: string; email: string; display_name: string; organization_name: string; organization_type: string; contact_whatsapp: string | null; event_types: string; status: string; active_until: string | null; approved_at: string | null; created_at: string; updated_at: string } | undefined;
}

function isEventCreatorActive(row: ReturnType<typeof loadCreatorRecord>) {
  if (!row || row.status !== "approved") return false;
  if (!row.active_until) return true;
  return new Date(row.active_until).getTime() >= Date.now();
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

function normalizeTicketCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function loadValidatorEvents(uid: string): ValidatorEvent[] {
  const db = getPaymentDb();
  const rows = db.prepare(`SELECT * FROM events WHERE creator_uid = ? AND deleted_at IS NULL ORDER BY updated_at DESC, created_at DESC, id DESC`).all(uid) as Array<Record<string, unknown>>;
  const ticketCounts = new Map<number, number>();
  const allOrders = db.prepare(`SELECT id FROM orders ORDER BY updated_at DESC, created_at DESC`).all() as Array<{ id: string }>;

  for (const orderRef of allOrders) {
    const order = orderRepository.findById(orderRef.id);
    if (!order) continue;
    for (const item of order.items ?? []) {
      const eventId = typeof item.eventId === "string" ? Number(item.eventId) : Number.NaN;
      if (!Number.isInteger(eventId)) continue;
      if (order.status === "draft" || order.status === "pending_payment") continue;
      ticketCounts.set(eventId, (ticketCounts.get(eventId) ?? 0) + (Number(item.quantity) || 1));
    }
  }

  return rows.map((row) => ({
    id: String(row.id),
    creator_uid: (row.creator_uid as string | null) ?? null,
    event_type: String(row.event_type ?? ""),
    event_title: String(row.event_title ?? ""),
    organizer_name: String(row.organizer_name ?? ""),
    event_date: String(row.event_date ?? ""),
    start_time: String(row.start_time ?? ""),
    venue: String(row.venue ?? ""),
    location: String(row.location ?? ""),
    ticket_mode: String(row.ticket_mode ?? ""),
    ticket_price: row.ticket_price === null || row.ticket_price === undefined ? null : Number(row.ticket_price),
    ticket_link: (row.ticket_link as string | null) ?? null,
    description: String(row.description ?? ""),
    contact_whatsapp: (row.contact_whatsapp as string | null) ?? null,
    poster_alt: (row.poster_alt as string | null) ?? null,
    spec_values: safeParseJsonObject(row.spec_values as string | null),
    status: String(row.status ?? "published"),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    version: String(row.updated_at ?? ""),
    ticket_count: ticketCounts.get(Number(row.id)) ?? 0,
  }));
}

function buildTicketSnapshotsForEvent(uid: string, eventId: string) {
  const events = loadValidatorEvents(uid);
  const event = events.find((entry) => entry.id === eventId);
  if (!event) return null;

  const tickets: ValidatorTicket[] = [];
  const allOrders = getPaymentDb().prepare("SELECT id FROM orders ORDER BY updated_at DESC, created_at DESC").all() as Array<{ id: string }>;

  for (const orderRef of allOrders) {
    const order = orderRepository.findById(orderRef.id);
    if (!order) continue;
    const payment = order.paymentReference ? paymentRepository.findByReference(order.paymentReference) ?? null : null;

    for (const item of order.items ?? []) {
      const itemEventId = typeof item.eventId === "string" ? item.eventId : null;
      if (itemEventId !== event.id) continue;

      const quantity = Math.max(1, Number(item.quantity) || 1);
      const codeSeed = String(item.reference ?? order.paymentReference ?? `${order.id}-${item.title}`).trim();
      const codeBase = normalizeTicketCode(codeSeed || `${order.id}-${event.id}`);

      for (let index = 0; index < quantity; index += 1) {
        const ticketId = `${order.id}:${event.id}:${index + 1}`;
        const updatedAt = payment?.status ? payment.updatedAt : order.updatedAt;
        tickets.push({
          id: ticketId,
          code: `${codeBase}${quantity > 1 ? `-${index + 1}` : ""}`,
          event_id: event.id,
          event_title: event.event_title,
          order_id: order.id,
          buyer_id: order.buyerId,
          status: mapOrderStatusToTicketStatus(order.status, payment?.status ?? null),
          order_status: order.status,
          payment_status: payment?.status ?? null,
          updated_at: updatedAt,
          version: updatedAt,
          metadata: {
            item_title: item.title,
            quantity: 1,
            unit_price: item.unitPrice ?? null,
            order_total: order.total,
            paid_at: order.paidAt ?? payment?.paidAt ?? null,
            fulfilled_at: order.fulfilledAt ?? null,
            payment_reference: order.paymentReference ?? payment?.reference ?? null,
            event_version: event.version,
            organizer_name: event.organizer_name,
            venue: event.venue,
            location: event.location,
          },
        });
      }
    }
  }

  return { event, tickets };
}

function validatorMeHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const creator = loadCreatorRecord(user.uid);
  if (!isEventCreatorActive(creator)) return res.status(403).json({ error: "Approved event creator access is required" });

  const events = loadValidatorEvents(user.uid);
  return res.json({
    success: true,
    identity: {
      uid: user.uid,
      email: user.email,
      email_verified: user.email_verified,
      is_admin: user.is_admin,
      display_name: creator?.display_name ?? creator?.organization_name ?? null,
    },
    creator: creator
      ? {
          uid: creator.uid,
          email: creator.email,
          display_name: creator.display_name,
          organization_name: creator.organization_name,
          organization_type: creator.organization_type,
          contact_whatsapp: creator.contact_whatsapp,
          event_types: creator.event_types,
          status: creator.status,
          active_until: creator.active_until,
          approved_at: creator.approved_at,
          created_at: creator.created_at,
          updated_at: creator.updated_at,
        }
      : null,
    access_scope: {
      can_validate_tickets: true,
      is_admin: user.is_admin,
      role: user.is_admin ? "admin" : "validator",
      source: "buymesho",
      allowed_event_ids: events.map((event) => event.id),
      snapshot_version: events[0]?.version ?? null,
    },
    events,
  });
}

function validatorEventsHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const creator = loadCreatorRecord(user.uid);
  if (!isEventCreatorActive(creator)) return res.status(403).json({ error: "Approved event creator access is required" });
  return res.json({ success: true, events: loadValidatorEvents(user.uid) });
}

function validatorEventTicketsHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const creator = loadCreatorRecord(user.uid);
  if (!isEventCreatorActive(creator)) return res.status(403).json({ error: "Approved event creator access is required" });
  const eventId = normalizeString(req.params.eventId);
  const bundle = buildTicketSnapshotsForEvent(user.uid, eventId);
  if (!bundle) return res.status(404).json({ error: "Event not found" });
  return res.json({ success: true, event: bundle.event, tickets: bundle.tickets, snapshot_version: bundle.event.version });
}

function resolveTicketForCode(userUid: string, code: string) {
  const events = loadValidatorEvents(userUid);
  for (const event of events) {
    const bundle = buildTicketSnapshotsForEvent(userUid, event.id);
    if (!bundle) continue;
    const ticket = bundle.tickets.find((entry) => normalizeTicketCode(entry.code) === code || normalizeTicketCode(entry.id) === code);
    if (ticket) return { event: bundle.event, ticket };
  }
  return null;
}

function writeScanResult(ticket: ValidatorTicket, nextStatus: ValidatorTicket["status"], gateName: string, staffName: string) {
  const nextUpdatedAt = new Date().toISOString();
  return {
    ...ticket,
    status: nextStatus,
    updated_at: nextUpdatedAt,
    version: nextUpdatedAt,
    metadata: {
      ...ticket.metadata,
      last_gate_name: gateName,
      last_staff_name: staffName,
      last_scan_at: nextUpdatedAt,
    },
  };
}

function validatorScanHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const creator = loadCreatorRecord(user.uid);
  if (!isEventCreatorActive(creator)) return res.status(403).json({ error: "Approved event creator access is required" });

  const code = normalizeTicketCode(normalizeString(req.body?.code));
  const eventId = normalizeString(req.body?.eventId);
  const gateName = normalizeString(req.body?.gateName) || "Main Gate";
  const staffName = normalizeString(req.body?.staffName) || "Gate Officer";
  const allowReentry = req.body?.allowReentry === true;
  const clientSnapshotVersion = normalizeString(req.body?.clientSnapshotVersion);

  if (!code || !eventId) return res.status(400).json({ error: "Missing scan code or event id" });

  const bundle = buildTicketSnapshotsForEvent(user.uid, eventId);
  if (!bundle) return res.status(404).json({ error: "Event not found" });

  if (clientSnapshotVersion && clientSnapshotVersion !== bundle.event.version) {
    return res.status(409).json({
      error: "Snapshot outdated",
      result: "rejected",
      reason: "event_snapshot_outdated",
      serverVersion: bundle.event.version,
    });
  }

  const ticket = bundle.tickets.find((entry) => normalizeTicketCode(entry.code) === code || normalizeTicketCode(entry.id) === code);
  if (!ticket) {
    return res.status(404).json({ error: "Ticket not found", result: "rejected", reason: "ticket_not_found" });
  }

  if (ticket.status === "Inside") {
    return res.status(409).json({
      error: "Duplicate scan",
      result: "already_applied",
      reason: "already_inside",
      ticket,
      serverVersion: bundle.event.version,
    });
  }

  if (ticket.status === "Cancelled" || ticket.status === "Refunded" || ticket.status === "Blocked") {
    return res.status(403).json({
      error: "Ticket denied",
      result: "rejected",
      reason: `ticket_${ticket.status.toLowerCase()}`,
      ticket,
      serverVersion: bundle.event.version,
    });
  }

  if (ticket.status === "Outside" && !allowReentry) {
    return res.status(403).json({
      error: "Re-entry not permitted",
      result: "rejected",
      reason: "reentry_not_permitted",
      ticket,
      serverVersion: bundle.event.version,
    });
  }

  const nextTicket = writeScanResult(ticket, "Inside", gateName, staffName);
  return res.json({
    result: "accepted",
    reason: ticket.status === "Outside" ? "reentry_permitted" : "validated",
    ticket: nextTicket,
    serverVersion: bundle.event.version,
  });
}

function validatorStatusHandler(req: Request, res: Response) {
  req.body = { ...req.body, code: req.body?.ticketId };
  return validatorScanHandler(req, res);
}

function validatorBulkSyncHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  const creator = loadCreatorRecord(user.uid);
  if (!isEventCreatorActive(creator)) return res.status(403).json({ error: "Approved event creator access is required" });

  const queue = Array.isArray(req.body?.queue) ? req.body.queue as ValidatorQueueItem[] : [];
  const clientSnapshotVersion = normalizeString(req.body?.clientSnapshotVersion);

  const applied = [];
  const conflicts = [];

  for (const item of queue) {
    const bundle = buildTicketSnapshotsForEvent(user.uid, item.eventId);
    if (!bundle) {
      conflicts.push({ queueId: item.queueId, ticketId: item.ticketId, eventId: item.eventId, reason: "event_not_found" });
      continue;
    }

    if (clientSnapshotVersion && clientSnapshotVersion !== bundle.event.version) {
      conflicts.push({ queueId: item.queueId, ticketId: item.ticketId, eventId: item.eventId, reason: "snapshot_outdated", expectedStatus: item.newStatus, actualStatus: bundle.event.version });
      continue;
    }

    const ticket = bundle.tickets.find((entry) => entry.id === item.ticketId);
    if (!ticket) {
      conflicts.push({ queueId: item.queueId, ticketId: item.ticketId, eventId: item.eventId, reason: "ticket_not_found" });
      continue;
    }

    if (ticket.status === item.newStatus) {
      applied.push({ queueId: item.queueId, ticketId: item.ticketId, eventId: item.eventId, result: "already_applied", reason: "already_in_desired_state", serverTicket: ticket });
      continue;
    }

    if (ticket.status === "Cancelled" || ticket.status === "Refunded" || ticket.status === "Blocked") {
      conflicts.push({ queueId: item.queueId, ticketId: item.ticketId, eventId: item.eventId, reason: `ticket_${ticket.status.toLowerCase()}`, actualStatus: ticket.status });
      continue;
    }

    const nextTicket = writeScanResult(ticket, item.newStatus as ValidatorTicket["status"], item.gateName, item.staffName);
    applied.push({ queueId: item.queueId, ticketId: item.ticketId, eventId: item.eventId, result: "accepted", reason: "synced", serverTicket: nextTicket });
  }

  return res.json({ success: true, applied, conflicts });
}

export function registerValidatorRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;
  app.get("/api/validator/me", verifyBearerIdentity, validatorMeHandler);
  app.get("/api/validator/events", verifyBearerIdentity, validatorEventsHandler);
  app.get("/api/validator/events/:eventId/tickets", verifyBearerIdentity, validatorEventTicketsHandler);
  app.post("/api/validator/scan", verifyBearerIdentity, validatorScanHandler);
  app.post("/api/validator/status", verifyBearerIdentity, validatorStatusHandler);
  app.post("/api/validator/sync", verifyBearerIdentity, validatorBulkSyncHandler);
  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}