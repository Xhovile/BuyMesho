import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "../auth/firebaseAdmin.js";
import { hasAdminAccess } from "../auth/adminAccess.js";
import { getPaymentDb } from "../postgresCompat.js";
import { orderRepository } from "../modules/orders/order.repository.js";
import { paymentRepository } from "../modules/payments/payment.repository.js";

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

type ValidatorAccessScope = {
  can_validate_tickets: boolean;
  is_admin: boolean;
  role: "admin" | "validator";
  source: "buymesho";
  allowed_event_ids: string[];
  snapshot_version: string | null;
};

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

type OrderItem = {
  eventId?: string | number;
  title: string;
  quantity: number;
  unitPrice: { amount: number; currency: string };
  reference?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  seatOrZone?: string;
  reentryAllowed?: boolean;
};

type OrderState = {
  id: string;
  buyerId: string;
  sellerId: string;
  source: string;
  status: string;
  currency: string;
  total: { amount: number; currency: string };
  items: OrderItem[];
  placedAt?: string | null;
  paidAt?: string | null;
  fulfilledAt?: string | null;
  paymentReference?: string | null;
  updatedAt: string;
  createdAt: string;
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
  checked_in_count: number;
};

type ValidatorTicket = {
  id: string;
  qrPayload: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  ticketTier: string;
  seatOrZone?: string;
  price: number;
  purchaseDate: string;
  status: "Waiting Entry" | "Inside" | "Outside" | "Cancelled" | "Refunded" | "Blocked";
  lastCheckedInTime?: string;
  lastCheckedOutTime?: string;
  lastGateName?: string;
  lastStaffName?: string;
  notes?: string;
  scanCount: number;
  reentryAllowed: boolean;
  lastScanAt?: string;
  orderId: string;
  buyerId: string;
  codeNormalized: string;
  metadata: Record<string, unknown>;
};

type ValidatorAuditEntry = {
  id: number;
  ticket_id: string;
  event_id: string;
  ticket_code: string;
  action: string;
  result: string;
  status_before: string;
  status_after: string;
  gate_name: string;
  staff_name: string;
  staff_uid: string;
  created_at: string;
  details: string | null;
};

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.validatorRoutesInstalled");

function db() { return getPaymentDb(); }
function now() { return new Date().toISOString(); }
function norm(v: unknown): string { return typeof v === "string" ? v.trim() : ""; }
function normOpt(v: unknown): string | null { const text = norm(v); return text ? text : null; }
function code(v: string) { return norm(v).toUpperCase().replace(/[^A-Z0-9]+/g, ""); }
function num(v: unknown, d = 0) { const n = typeof v === "number" ? v : Number(v); return Number.isFinite(n) ? n : d; }
function parseObj(v: string | null | undefined) { try { const p = v ? JSON.parse(v) : {}; return p && typeof p === "object" && !Array.isArray(p) ? p : {}; } catch { return {}; } }

function ensureSchema() {
  db().exec(`
    CREATE TABLE IF NOT EXISTS validator_ticket_state (
      ticket_id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      event_title TEXT NOT NULL,
      ticket_code TEXT NOT NULL,
      status TEXT NOT NULL,
      reentry_allowed INTEGER NOT NULL DEFAULT 0,
      scan_count INTEGER NOT NULL DEFAULT 0,
      last_scan_at TEXT,
      last_gate_name TEXT,
      last_staff_name TEXT,
      last_scanned_by_uid TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS validator_ticket_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      ticket_code TEXT NOT NULL,
      action TEXT NOT NULL,
      result TEXT NOT NULL,
      status_before TEXT NOT NULL,
      status_after TEXT NOT NULL,
      gate_name TEXT NOT NULL,
      staff_name TEXT NOT NULL,
      staff_uid TEXT NOT NULL,
      created_at TEXT NOT NULL,
      details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_validator_ticket_audit_event_id ON validator_ticket_audit(event_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_validator_ticket_state_event_id ON validator_ticket_state(event_id);
    CREATE INDEX IF NOT EXISTS idx_validator_ticket_state_code ON validator_ticket_state(ticket_code);
  `);
}

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return res.status(401).json({ error: "Missing Authorization Bearer token" });
  void (async () => {
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token, true);
      req.user = { uid: decoded.uid, email: decoded.email ?? null, email_verified: (decoded as any).email_verified === true, is_admin: (decoded as any).admin === true || (decoded as any).role === "admin" } as VerifiedRequestUser;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  })();
}

function creatorRecord(uid: string) {
  return db().prepare("SELECT * FROM event_creators WHERE uid = ? LIMIT 1").get(uid) as EventCreatorRow | undefined;
}
function creatorOk(row: EventCreatorRow | undefined) { return !!row && row.status === "approved" && (!row.active_until || new Date(row.active_until).getTime() >= Date.now()); }

function checkedInCounts() {
  const rows = db().prepare("SELECT event_id, COUNT(*) AS n FROM validator_ticket_state WHERE status = 'Inside' GROUP BY event_id").all() as Array<{ event_id: string; n: number }>;
  const map = new Map<string, number>();
  for (const row of rows) map.set(String(row.event_id), num(row.n));
  return map;
}

function validatorEvents(uid: string): ValidatorEvent[] {
  const rows = db().prepare("SELECT * FROM events WHERE creator_uid = ? AND deleted_at IS NULL ORDER BY updated_at DESC, created_at DESC, id DESC").all(uid) as EventRow[];
  const sold = new Map<string, number>();
  const counts = checkedInCounts();

  const orders = db().prepare("SELECT id FROM orders ORDER BY updated_at DESC, created_at DESC").all() as Array<{ id: string }>;
  for (const ref of orders) {
    const order = orderRepository.findById(ref.id) as unknown as OrderState | undefined;
    if (!order || order.status === "draft" || order.status === "pending_payment") continue;
    for (const item of order.items ?? []) {
      const eventId = String(item.eventId ?? "");
      if (!eventId) continue;
      sold.set(eventId, (sold.get(eventId) ?? 0) + Math.max(1, num(item.quantity, 1)));
    }
  }

  return rows.map((row) => ({
    id: String(row.id),
    creator_uid: row.creator_uid,
    event_type: row.event_type,
    event_title: row.event_title,
    organizer_name: row.organizer_name,
    event_date: row.event_date,
    start_time: row.start_time,
    venue: row.venue,
    location: row.location,
    ticket_mode: row.ticket_mode,
    ticket_price: row.ticket_price === null ? null : Number(row.ticket_price),
    ticket_link: row.ticket_link,
    description: row.description,
    contact_whatsapp: row.contact_whatsapp,
    poster_alt: row.poster_alt,
    spec_values: parseObj(row.spec_values),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    version: row.updated_at,
    ticket_count: sold.get(String(row.id)) ?? 0,
    checked_in_count: counts.get(String(row.id)) ?? 0,
  }));
}

function ticketRows(uid: string, eventId: string) {
  const event = validatorEvents(uid).find((e) => e.id === eventId);
  if (!event) return null;

  const stateRows = db().prepare("SELECT * FROM validator_ticket_state WHERE event_id = ?").all(eventId) as Array<Record<string, unknown>>;
  const state = new Map<string, Record<string, unknown>>(stateRows.map((row) => [String(row.ticket_id), row]));
  const tickets: ValidatorTicket[] = [];
  const orders = db().prepare("SELECT id FROM orders ORDER BY updated_at DESC, created_at DESC").all() as Array<{ id: string }>;

  for (const ref of orders) {
    const order = orderRepository.findById(ref.id) as unknown as OrderState | undefined;
    if (!order) continue;
    const payment = order.paymentReference ? paymentRepository.findByReference(order.paymentReference) ?? null : null;

    for (const item of order.items ?? []) {
      if (String(item.eventId ?? "") !== event.id) continue;
      const quantity = Math.max(1, num(item.quantity, 1));
      const base = code(item.reference ?? order.paymentReference ?? `${order.id}-${item.title}`) || code(`${order.id}-${event.id}`);

      for (let i = 0; i < quantity; i++) {
        const ticketId = `${order.id}:${event.id}:${i + 1}`;
        const normalized = `${base}${quantity > 1 ? `-${i + 1}` : ""}`;
        const st = state.get(ticketId);
        const status = (st ? String(st.status) : String(order.status).toLowerCase() === "refunded" || String(payment?.status ?? "").toLowerCase() === "refunded" ? "Refunded" : String(order.status).toLowerCase() === "cancelled" ? "Cancelled" : String(order.status).toLowerCase() === "disputed" || String(order.status).toLowerCase() === "closed" ? "Blocked" : String(order.status).toLowerCase() === "fulfilled" ? "Inside" : String(order.status).toLowerCase() === "in_escrow" ? "Outside" : "Waiting Entry") as ValidatorTicket["status"];
        tickets.push({
          id: ticketId,
          qrPayload: normalized,
          eventId: event.id,
          attendeeName: typeof item.attendeeName === "string" ? item.attendeeName : item.title,
          attendeeEmail: typeof item.attendeeEmail === "string" ? item.attendeeEmail : "",
          attendeePhone: typeof item.attendeePhone === "string" ? item.attendeePhone : "",
          ticketTier: item.title,
          seatOrZone: item.seatOrZone,
          price: Number(item.unitPrice?.amount ?? 0),
          purchaseDate: order.createdAt ?? order.placedAt ?? event.created_at,
          status,
          lastCheckedInTime: st?.last_scan_at as string | undefined,
          lastCheckedOutTime: st?.last_scan_at as string | undefined,
          lastGateName: st?.last_gate_name as string | undefined,
          lastStaffName: st?.last_staff_name as string | undefined,
          notes: st ? "Synced from BuyMesho" : undefined,
          scanCount: num(st?.scan_count, 0),
          reentryAllowed: Boolean(st?.reentry_allowed ?? item.reentryAllowed),
          lastScanAt: st?.last_scan_at as string | undefined,
          orderId: order.id,
          buyerId: order.buyerId,
          codeNormalized: code(normalized),
          metadata: {
            item_title: item.title,
            quantity: 1,
            unit_price: item.unitPrice ?? null,
            event_title: event.event_title,
            organizer_name: event.organizer_name,
            venue: event.venue,
            location: event.location,
            paid_at: order.paidAt ?? payment?.paidAt ?? null,
            reentry_allowed: Boolean(item.reentryAllowed),
          },
        });
      }
    }
  }

  return { event, tickets };
}

function audit(eventId: string, limit = 50) {
  return db().prepare("SELECT * FROM validator_ticket_audit WHERE event_id = ? ORDER BY created_at DESC, id DESC LIMIT ?").all(eventId, limit) as ValidatorAuditEntry[];
}

function saveState(ticket: ValidatorTicket, status: ValidatorTicket["status"], gateName: string, staffName: string, staffUid: string, action: string) {
  const d = db();
  const ts = now();
  const prev = d.prepare("SELECT * FROM validator_ticket_state WHERE ticket_id = ? LIMIT 1").get(ticket.id) as Record<string, unknown> | undefined;
  const count = num(prev?.scan_count, 0) + 1;

  d.prepare(`
    INSERT INTO validator_ticket_state (
      ticket_id, order_id, buyer_id, event_id, event_title, ticket_code,
      status, reentry_allowed, scan_count, last_scan_at, last_gate_name,
      last_staff_name, last_scanned_by_uid, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(ticket_id) DO UPDATE SET
      status = excluded.status,
      reentry_allowed = excluded.reentry_allowed,
      scan_count = excluded.scan_count,
      last_scan_at = excluded.last_scan_at,
      last_gate_name = excluded.last_gate_name,
      last_staff_name = excluded.last_staff_name,
      last_scanned_by_uid = excluded.last_scanned_by_uid,
      updated_at = excluded.updated_at
  `).run(ticket.id, ticket.orderId, ticket.buyerId, ticket.eventId, String(ticket.metadata.event_title ?? ticket.eventId), ticket.codeNormalized, status, ticket.reentryAllowed ? 1 : 0, count, ts, gateName, staffName, staffUid, prev?.created_at ?? ts, ts);

  d.prepare(`
    INSERT INTO validator_ticket_audit (
      ticket_id, event_id, ticket_code, action, result,
      status_before, status_after, gate_name, staff_name, staff_uid,
      created_at, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(ticket.id, ticket.eventId, ticket.codeNormalized, action, status, prev?.status ?? ticket.status, status, gateName, staffName, staffUid, ts, JSON.stringify({ ticket_id: ticket.id, order_id: ticket.orderId }));

  d.prepare(`
    INSERT INTO event_activity (
      event_id, actor_uid, activity_type, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(Number(ticket.eventId), staffUid, "ticket_validation", JSON.stringify({ ticket_id: ticket.id, ticket_code: ticket.codeNormalized, status, gate_name: gateName, staff_name: staffName, action }), ts);

  return { scanCount: count, lastScanAt: ts };
}

function identity(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) { res.status(401).json({ error: "Authentication required" }); return null; }
  const row = creatorRecord(user.uid);
  if (!creatorOk(row)) { res.status(403).json({ error: "Approved event creator access is required" }); return null; }
  const events = validatorEvents(user.uid);
  const scope: ValidatorAccessScope = {
    can_validate_tickets: true,
    is_admin: hasAdminAccess({ email: user.email, uid: user.uid, is_admin: user.is_admin }),
    role: hasAdminAccess({ email: user.email, uid: user.uid, is_admin: user.is_admin }) ? "admin" : "validator",
    source: "buymesho",
    allowed_event_ids: events.map((e) => e.id),
    snapshot_version: events[0]?.version ?? null,
  };
  return { user, row, events, scope };
}

function findTicket(uid: string, codeOrId: string, eventId?: string) {
  const events = eventId ? validatorEvents(uid).filter((e) => e.id === eventId) : validatorEvents(uid);
  const wanted = code(codeOrId);
  for (const event of events) {
    const rows = ticketRows(uid, event.id)?.tickets ?? [];
    const ticket = rows.find((entry) => entry.codeNormalized === wanted || code(entry.id) === wanted);
    if (ticket) return { event, ticket };
  }
  return null;
}

function validateScan(ticket: ValidatorTicket, allowReentry: boolean) {
  if (["Cancelled", "Refunded", "Blocked"].includes(ticket.status)) return { allowed: false, result: ticket.status, reason: `Ticket is ${ticket.status.toLowerCase()}` };
  if (ticket.status === "Inside") return { allowed: false, result: "Inside", reason: "Duplicate scan" };
  if (ticket.status === "Outside" && !ticket.reentryAllowed && !allowReentry) return { allowed: false, result: "Outside", reason: "Re-entry not permitted" };
  return { allowed: true, result: "Inside", reason: ticket.status === "Outside" ? "Re-entry permitted" : "Validated" };
}

function me(req: Request, res: Response) {
  const payload = identity(req, res); if (!payload) return;
  res.json({
    success: true,
    identity: {
      uid: payload.user.uid,
      email: payload.user.email,
      email_verified: payload.user.email_verified,
      is_admin: payload.user.is_admin,
      display_name: payload.row?.display_name ?? payload.row?.organization_name ?? null,
    },
    creator: payload.row,
    access_scope: payload.scope,
    events: payload.events,
  });
}

function eventsHandler(req: Request, res: Response) { const payload = identity(req, res); if (!payload) return; res.json({ success: true, events: payload.events }); }

function ticketsHandler(req: Request, res: Response) {
  const payload = identity(req, res); if (!payload) return;
  const bundle = ticketRows(payload.user.uid, norm(req.params.eventId));
  if (!bundle) return res.status(404).json({ error: "Event not found" });
  res.json({ success: true, event: bundle.event, tickets: bundle.tickets, audit_logs: audit(bundle.event.id), snapshot_version: bundle.event.version });
}

function resolveHandler(req: Request, res: Response) {
  const payload = identity(req, res); if (!payload) return;
  const c = norm(req.query.code); if (!c) return res.status(400).json({ error: "Missing ticket code" });
  const match = findTicket(payload.user.uid, c, norm(req.query.eventId) || undefined);
  if (!match) return res.status(404).json({ error: "Ticket not found" });
  res.json({ success: true, event: match.event, ticket: match.ticket, matched_on: code(c) });
}

function scanHandler(req: Request, res: Response) {
  const payload = identity(req, res); if (!payload) return;
  const c = norm(req.body?.code ?? req.query.code); if (!c) return res.status(400).json({ error: "Missing ticket code" });
  const gateName = norm(req.body?.gateName) || "Main Gate";
  const staffName = norm(req.body?.staffName) || "Gate Officer";
  const allowReentry = Boolean(req.body?.allowReentry);
  const match = findTicket(payload.user.uid, c, norm(req.body?.eventId) || undefined);
  if (!match) return res.status(404).json({ success: false, result: "Unknown / Invalid code", reason: "Ticket not found" });

  const decision = validateScan(match.ticket, allowReentry);
  if (!decision.allowed) {
    return res.status(decision.result === "Inside" ? 409 : 403).json({ success: true, allowed: false, result: decision.result, reason: decision.reason, ticket: match.ticket, event: match.event });
  }

  const state = saveState(match.ticket, "Inside", gateName, staffName, payload.user.uid, "scan");
  const updated = ticketRows(payload.user.uid, match.event.id)?.tickets.find((t) => t.id === match.ticket.id) ?? { ...match.ticket, status: "Inside", lastCheckedInTime: state.lastScanAt, lastGateName: gateName, lastStaffName: staffName, lastScanAt: state.lastScanAt, scanCount: state.scanCount };
  res.json({ success: true, allowed: true, result: "Inside", reason: decision.reason, ticket: updated, event: match.event, audit_entry: audit(match.event.id, 1)[0] ?? null });
}

function statusHandler(req: Request, res: Response) {
  const payload = identity(req, res); if (!payload) return;
  const ticketId = norm(req.params.ticketId);
  const status = norm(req.body?.status);
  const allowed = new Set(["Waiting Entry", "Inside", "Outside", "Cancelled", "Refunded", "Blocked"]);
  if (!ticketId || !allowed.has(status)) return res.status(400).json({ error: "Invalid ticket status" });

  const rows = payload.events.flatMap((e) => ticketRows(payload.user.uid, e.id)?.tickets ?? []);
  const ticket = rows.find((t) => t.id === ticketId);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  saveState(ticket, status as ValidatorTicket["status"], norm(req.body?.gateName) || "Main Gate", norm(req.body?.staffName) || "Gate Officer", payload.user.uid, "manual_status_change");
  const event = ticketRows(payload.user.uid, ticket.eventId);
  const updated = event?.tickets.find((t) => t.id === ticket.id) ?? { ...ticket, status, lastScanAt: now(), scanCount: ticket.scanCount + 1 };
  res.json({ success: true, ticket: updated, event: event?.event ?? null, audit_entry: audit(ticket.eventId, 1)[0] ?? null });
}

export function registerValidatorRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;
  ensureSchema();
  app.get("/api/auth/validator/me", auth, me);
  app.get("/api/validator/me", auth, me);
  app.get("/api/validator/events", auth, eventsHandler);
  app.get("/api/validator/events/:eventId/tickets", auth, ticketsHandler);
  app.get("/api/validator/tickets/resolve", auth, resolveHandler);
  app.post("/api/validator/scan", auth, scanHandler);
  app.post("/api/validator/tickets/:ticketId/status", auth, statusHandler);
  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
