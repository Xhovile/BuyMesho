import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { hasAdminAccess } from "./adminAccess.js";
import { getPaymentDb } from "../postgresCompat.js";

type User = { uid: string; email: string | null; email_verified: boolean; is_admin: boolean };
type TicketStatus = "Waiting Entry" | "Inside" | "Outside" | "Cancelled" | "Refunded" | "Blocked" | "Duplicate Scan Attempt";

const TICKET_ALLOWED_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  "Waiting Entry": ["Waiting Entry", "Inside", "Cancelled", "Refunded", "Blocked", "Duplicate Scan Attempt"],
  Inside: ["Inside", "Outside", "Cancelled", "Refunded", "Blocked", "Duplicate Scan Attempt"],
  Outside: ["Outside", "Inside", "Cancelled", "Refunded", "Blocked", "Duplicate Scan Attempt"],
  Cancelled: ["Cancelled"],
  Refunded: ["Refunded"],
  Blocked: ["Blocked"],
  "Duplicate Scan Attempt": ["Duplicate Scan Attempt"],
} as const;

function assertTicketStatusTransition(from: TicketStatus, to: TicketStatus): void {
  if (TICKET_ALLOWED_TRANSITIONS[from].includes(to)) return;
  throw new Error(`Illegal ticket state transition: ${from} -> ${to}`);
}

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization Bearer token" });
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Missing Authorization Bearer token" });
  void (async () => {
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token.trim(), true);
      req.user = { uid: decoded.uid, email: decoded.email ?? null, email_verified: (decoded as any).email_verified === true, is_admin: (decoded as any).admin === true || (decoded as any).role === "admin" } as User;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  })();
}

function user(req: Request): User | null { return (req.user as User | undefined) ?? null; }
function creatorIsActive(uid: string): boolean {
  const row = getPaymentDb().prepare(`SELECT status, active_until FROM event_creators WHERE uid = ? LIMIT 1`).get(uid) as { status?: string; active_until?: string | null } | undefined;
  if (!row || row.status !== "approved") return false;
  return !row.active_until || new Date(row.active_until).getTime() >= Date.now();
}
function normalize(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function normalizeCode(value: unknown): string { return normalize(value).toUpperCase().replace(/[^A-Z0-9]+/g, ""); }
function allowedEvent(uid: string, eventId: string) {
  return getPaymentDb().prepare(`SELECT * FROM events WHERE id = ? AND creator_uid = ? AND deleted_at IS NULL LIMIT 1`).get(eventId, uid) as Record<string, unknown> | undefined;
}
function mapStatus(orderStatus: string): TicketStatus {
  const status = orderStatus.toLowerCase();
  if (status === "refunded") return "Refunded";
  if (status === "cancelled") return "Cancelled";
  if (status === "disputed" || status === "closed") return "Blocked";
  return "Waiting Entry";
}
function eventVersion(event: Record<string, unknown>): string { return String(event.updated_at ?? ""); }
function mapTicket(row: Record<string, unknown>) {
  let metadata: Record<string, unknown> = {};
  try { metadata = JSON.parse(String(row.metadata ?? "{}")); } catch { metadata = {}; }
  return {
    id: String(row.id),
    code: String(row.code),
    event_id: String(row.event_id),
    event_title: String(row.event_title ?? ""),
    ticket_title: String(row.ticket_title ?? ""),
    ticket_type: String(row.ticket_type ?? "General Admission"),
    holder_name: String(row.holder_name ?? ""),
    holder_email: String(row.holder_email ?? ""),
    holder_phone: String(row.holder_phone ?? ""),
    event_date: String(row.event_date ?? ""),
    start_time: String(row.start_time ?? ""),
    end_time: row.end_time == null ? null : String(row.end_time),
    venue: String(row.venue ?? ""),
    location: String(row.location ?? ""),
    seat_or_zone: row.seat_or_zone == null ? null : String(row.seat_or_zone),
    status: String(row.status ?? "Waiting Entry") as TicketStatus,
    order_status: String(row.order_status ?? ""),
    payment_status: row.payment_status == null ? null : String(row.payment_status),
    updated_at: String(row.updated_at ?? ""),
    version: String(row.updated_at ?? ""),
    metadata,
  };
}
function refreshStats(eventId: string) {
  const db = getPaymentDb();
  db.prepare(`
    INSERT INTO event_ticket_stats(event_id, tickets_sold, tickets_checked_in, tickets_remaining, updated_at)
    SELECT ?, COUNT(*) FILTER (WHERE status NOT IN ('Cancelled','Refunded','Blocked'))::INTEGER,
           COUNT(*) FILTER (WHERE status IN ('Inside','Outside'))::INTEGER,
           COUNT(*) FILTER (WHERE status = 'Waiting Entry')::INTEGER,
           CURRENT_TIMESTAMP
    ON CONFLICT(event_id) DO UPDATE SET
      tickets_sold = excluded.tickets_sold,
      tickets_checked_in = excluded.tickets_checked_in,
      tickets_remaining = excluded.tickets_remaining,
      updated_at = CURRENT_TIMESTAMP
  `).run(eventId);
}
function ticketRows(eventId: string) {
  return getPaymentDb().prepare(`
    SELECT t.*, o.status AS order_status,
      (SELECT p.status FROM payments p WHERE p.order_id = t.order_id ORDER BY p.updated_at DESC LIMIT 1) AS payment_status
    FROM event_tickets t
    LEFT JOIN orders o ON o.id = t.order_id
    WHERE t.event_id = ?
    ORDER BY t.updated_at DESC, t.id DESC
  `).all(eventId) as Record<string, unknown>[];
}

function ticketsHandler(req: Request, res: Response) {
  const current = user(req); if (!current) return res.status(401).json({ error: "Authentication required" });
  if (!creatorIsActive(current.uid)) return res.status(403).json({ error: "Approved event creator access is required" });
  const eventId = normalize(req.params.eventId); const event = allowedEvent(current.uid, eventId);
  if (!event) return res.status(404).json({ error: "Event not found" });
  const rows = ticketRows(eventId);
  return res.json({ success: true, event: { id: eventId, event_title: String(event.event_title ?? ""), event_date: String(event.event_date ?? ""), start_time: String(event.start_time ?? ""), end_time: event.end_time == null ? null : String(event.end_time), venue: String(event.venue ?? ""), location: String(event.location ?? ""), updated_at: String(event.updated_at ?? "") }, tickets: rows.map(mapTicket), snapshot_version: eventVersion(event) });
}

function scanHandler(req: Request, res: Response) {
  const current = user(req); if (!current) return res.status(401).json({ error: "Authentication required" });
  if (!creatorIsActive(current.uid)) return res.status(403).json({ error: "Approved event creator access is required" });
  const eventId = normalize(req.body?.eventId); const code = normalizeCode(req.body?.code); const gateName = normalize(req.body?.gateName) || "Main Gate"; const staffName = normalize(req.body?.staffName) || "Gate Officer"; const allowReentry = req.body?.allowReentry === true; const clientVersion = normalize(req.body?.clientSnapshotVersion);
  const event = allowedEvent(current.uid, eventId); if (!event) return res.status(404).json({ error: "Event not found" });
  if (!eventId || !code) return res.status(400).json({ error: "Missing scan code or event id" });
  if (clientVersion && clientVersion !== eventVersion(event)) return res.status(409).json({ error: "Snapshot outdated", result: "rejected", reason: "event_snapshot_outdated", serverVersion: eventVersion(event) });
  const rows = ticketRows(eventId);
  const row = rows.find((candidate) => normalizeCode(candidate.code) === code || normalizeCode(candidate.id) === code);
  if (!row) return res.status(404).json({ error: "Ticket not found", result: "rejected", reason: "ticket_not_found" });
  const ticket = mapTicket(row);
  if (ticket.status === "Inside") return res.status(409).json({ error: "Duplicate scan", result: "already_applied", reason: "already_inside", ticket, serverVersion: eventVersion(event) });
  if (["Cancelled", "Refunded", "Blocked"].includes(ticket.status)) return res.status(403).json({ error: "Ticket denied", result: "rejected", reason: `ticket_${ticket.status.toLowerCase()}`, ticket, serverVersion: eventVersion(event) });
  if (ticket.status === "Outside" && !allowReentry) return res.status(403).json({ error: "Re-entry not permitted", result: "rejected", reason: "reentry_not_permitted", ticket, serverVersion: eventVersion(event) });

  const now = new Date().toISOString();
  const nextStatus: TicketStatus = "Inside";
  assertTicketStatusTransition(ticket.status, nextStatus);
  const metadata = { ...(ticket.metadata ?? {}), last_gate_name: gateName, last_staff_name: staffName, last_scan_at: now };
  getPaymentDb().prepare(`UPDATE event_tickets SET status = 'Inside', scanned_at = ?, updated_at = ?, metadata = ? WHERE id = ? AND event_id = ?`).run(now, now, JSON.stringify(metadata), ticket.id, eventId);
  refreshStats(eventId);
  const updated = mapTicket(getPaymentDb().prepare(`SELECT t.*, o.status AS order_status, (SELECT p.status FROM payments p WHERE p.order_id=t.order_id ORDER BY p.updated_at DESC LIMIT 1) AS payment_status FROM event_tickets t LEFT JOIN orders o ON o.id=t.order_id WHERE t.id=?`).get(ticket.id) as Record<string, unknown>);
  return res.json({ result: "accepted", reason: ticket.status === "Outside" ? "reentry_permitted" : "validated", ticket: updated, serverVersion: eventVersion(event) });
}

function statusHandler(req: Request, res: Response) {
  const current = user(req); if (!current) return res.status(401).json({ error: "Authentication required" });
  if (!creatorIsActive(current.uid)) return res.status(403).json({ error: "Approved event creator access is required" });
  const eventId = normalize(req.body?.eventId); const ticketId = normalize(req.body?.ticketId); const status = normalize(req.body?.status) as TicketStatus;
  const event = allowedEvent(current.uid, eventId); if (!event) return res.status(404).json({ error: "Event not found" });
  const allowed: TicketStatus[] = ["Waiting Entry", "Inside", "Outside", "Cancelled", "Refunded", "Blocked", "Duplicate Scan Attempt"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid ticket status" });
  const existing = getPaymentDb().prepare(`SELECT id, status FROM event_tickets WHERE id = ? AND event_id = ? LIMIT 1`).get(ticketId, eventId) as { id?: string; status?: TicketStatus } | undefined;
  if (!existing) return res.status(404).json({ error: "Ticket not found" });
  const now = new Date().toISOString();
  assertTicketStatusTransition(existing.status ?? "Waiting Entry", status);
  getPaymentDb().prepare(`UPDATE event_tickets SET status = ?, scanned_at = CASE WHEN ? IN ('Inside','Outside') THEN COALESCE(scanned_at, ?) ELSE scanned_at END, updated_at = ? WHERE id = ? AND event_id = ?`).run(status, status, now, now, ticketId, eventId);
  refreshStats(eventId);
  return res.json({ success: true, status, ticketId, serverVersion: eventVersion(event) });
}

function syncHandler(req: Request, res: Response) {
  const current = user(req); if (!current) return res.status(401).json({ error: "Authentication required" });
  if (!creatorIsActive(current.uid)) return res.status(403).json({ error: "Approved event creator access is required" });
  const queue = Array.isArray(req.body?.queue) ? req.body.queue : [];
  const applied: unknown[] = []; const conflicts: unknown[] = [];
  for (const item of queue) {
    const eventId = normalize(item?.eventId); const ticketId = normalize(item?.ticketId); const status = normalize(item?.newStatus) as TicketStatus;
    const event = allowedEvent(current.uid, eventId); if (!event) { conflicts.push({ queueId: item?.queueId, ticketId, eventId, reason: "event_not_found" }); continue; }
    const ticket = getPaymentDb().prepare(`SELECT id, status FROM event_tickets WHERE id = ? AND event_id = ? LIMIT 1`).get(ticketId, eventId) as { id?: string; status?: TicketStatus } | undefined;
    if (!ticket) { conflicts.push({ queueId: item?.queueId, ticketId, eventId, reason: "ticket_not_found" }); continue; }
    if (ticket.status === status) { applied.push({ queueId: item?.queueId, ticketId, eventId, result: "already_applied", reason: "already_in_desired_state" }); continue; }
    if (["Cancelled", "Refunded", "Blocked"].includes(ticket.status ?? "")) { conflicts.push({ queueId: item?.queueId, ticketId, eventId, reason: `ticket_${String(ticket.status).toLowerCase()}`, actualStatus: ticket.status }); continue; }
    if (!TICKET_ALLOWED_TRANSITIONS[ticket.status as TicketStatus]?.includes(status)) {
      conflicts.push({ queueId: item?.queueId, ticketId, eventId, reason: "illegal_ticket_transition", actualStatus: ticket.status, requestedStatus: status });
      continue;
    }
    const now = new Date().toISOString();
    getPaymentDb().prepare(`UPDATE event_tickets SET status = ?, updated_at = ? WHERE id = ? AND event_id = ?`).run(status, now, ticketId, eventId);
    refreshStats(eventId);
    applied.push({ queueId: item?.queueId, ticketId, eventId, result: "accepted", reason: "synced" });
  }
  return res.json({ success: true, applied, conflicts });
}

export function registerValidatorProjectionRoutes(app: Express) {
  app.get("/api/validator/events/:eventId/tickets", auth, ticketsHandler);
  app.post("/api/validator/scan", auth, scanHandler);
  app.post("/api/validator/status", auth, statusHandler);
  app.post("/api/validator/sync", auth, syncHandler);
}
