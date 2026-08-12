import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { getPaymentDb } from "../postgresCompat.js";

type User = { uid: string; email: string | null; email_verified: boolean; is_admin: boolean };
type Creator = { uid: string; status: string; active_until: string | null; display_name?: string | null; organization_name?: string | null };
type TicketStatus = "Waiting Entry" | "Inside" | "Outside" | "Cancelled" | "Refunded" | "Blocked";

const INSTALLED = Symbol.for("buymesho.validatorProjectionRoutesInstalled");

function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing Authorization Bearer token" });
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return res.status(401).json({ error: "Missing Authorization Bearer token" });
  void getFirebaseAdmin().auth().verifyIdToken(token.trim(), true).then((decoded) => {
    req.user = { uid: decoded.uid, email: decoded.email ?? null, email_verified: (decoded as any).email_verified === true, is_admin: (decoded as any).admin === true || (decoded as any).role === "admin" } as User;
    next();
  }).catch(() => res.status(401).json({ error: "Invalid or expired token" }));
}

function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function creatorFor(uid: string) { return getPaymentDb().prepare("SELECT uid,status,active_until,display_name,organization_name FROM event_creators WHERE uid = ? LIMIT 1").get(uid) as Creator | undefined; }
function authorized(req: Request, res: Response) {
  const user = req.user as User | undefined;
  if (!user) { res.status(401).json({ error: "Authentication required" }); return null; }
  const creator = creatorFor(user.uid);
  if (!creator || creator.status !== "approved" || (creator.active_until && new Date(creator.active_until).getTime() < Date.now())) {
    res.status(403).json({ error: "Approved event creator access is required" }); return null; }
  return user;
}

function parseSpec(value: unknown) { try { const parsed = JSON.parse(String(value ?? "{}")); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
function normalizeCode(value: string) { return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, ""); }

function eventFor(uid: string, eventId: string) {
  const db = getPaymentDb();
  const row = db.prepare(`
    SELECT e.*,
      COALESCE(s.tickets_sold,0) AS tickets_sold,
      COALESCE(s.tickets_checked_in,0) AS tickets_checked_in,
      COALESCE(s.tickets_remaining,0) AS tickets_remaining
    FROM events e LEFT JOIN event_ticket_stats s ON s.event_id=e.id
    WHERE e.id=? AND e.creator_uid=? AND e.deleted_at IS NULL LIMIT 1
  `).get(Number(eventId), uid) as any;
  if (!row) return null;
  return {
    id: String(row.id), creator_uid: row.creator_uid, event_type: row.event_type, event_title: row.event_title,
    organizer_name: row.organizer_name, event_date: row.event_date, start_time: row.start_time, venue: row.venue,
    location: row.location, ticket_mode: row.ticket_mode, ticket_price: row.ticket_price == null ? null : Number(row.ticket_price),
    ticket_link: row.ticket_link, description: row.description, contact_whatsapp: row.contact_whatsapp, poster_alt: row.poster_alt,
    spec_values: parseSpec(row.spec_values), status: row.status, publication_status: row.publication_status ?? null,
    publication_mode: row.publication_mode ?? null, publication_at: row.publication_at ?? null, runtime_mode: row.runtime_mode ?? null,
    end_time: row.end_time ?? null, created_at: row.created_at, updated_at: row.updated_at,
    version: String(row.updated_at ?? ""), ticket_count: Number(row.tickets_sold) || 0,
    tickets_sold: Number(row.tickets_sold) || 0, tickets_checked_in: Number(row.tickets_checked_in) || 0,
    tickets_remaining: Number(row.tickets_remaining) || 0,
  };
}

function snapshot(uid: string, eventId: string) {
  const db = getPaymentDb();
  const event = eventFor(uid, eventId);
  if (!event) return null;
  const rows = db.prepare(`SELECT * FROM event_tickets WHERE event_id=? ORDER BY purchase_date ASC, id ASC`).all(Number(eventId)) as any[];
  const maxTicketUpdated = rows.reduce((max, row) => String(row.updated_at ?? "") > max ? String(row.updated_at ?? "") : max, "");
  const tickets = rows.map((row) => ({
    ticketId: String(row.id), code: String(row.code ?? row.id), ticketTitle: String(row.ticket_title ?? event.event_title),
    ticketType: String(row.ticket_type ?? "General Admission"), attendeeName: String(row.holder_name ?? ""),
    attendeeEmail: String(row.holder_email ?? ""), attendeePhone: String(row.holder_phone ?? ""),
    eventDate: String(row.event_date ?? event.event_date ?? ""), startTime: String(row.start_time ?? event.start_time ?? ""),
    venue: String(row.venue ?? event.venue ?? ""), location: String(row.location ?? event.location ?? ""),
    seatOrZone: String(row.seat_or_zone ?? ""), status: String(row.status ?? "Waiting Entry") as TicketStatus,
    purchaseDate: String(row.purchase_date ?? ""), updatedAt: String(row.updated_at ?? ""),
  }));
  return { event, tickets, snapshot_version: `${event.version}:${maxTicketUpdated}` };
}

function refreshStats(eventId: string) {
  const db = getPaymentDb();
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled','Refunded') THEN 1 ELSE 0 END),0) AS sold,
      COALESCE(SUM(CASE WHEN status='Inside' THEN 1 ELSE 0 END),0) AS checked,
      COALESCE(SUM(CASE WHEN status NOT IN ('Cancelled','Refunded','Inside') THEN 1 ELSE 0 END),0) AS remaining
    FROM event_tickets WHERE event_id=?
  `).get(Number(eventId)) as any;
  db.prepare(`INSERT INTO event_ticket_stats(event_id,tickets_sold,tickets_checked_in,tickets_remaining,updated_at)
    VALUES(?,?,?,?,?) ON CONFLICT(event_id) DO UPDATE SET tickets_sold=excluded.tickets_sold,tickets_checked_in=excluded.tickets_checked_in,tickets_remaining=excluded.tickets_remaining,updated_at=excluded.updated_at`).run(Number(eventId), Number(row?.sold ?? 0), Number(row?.checked ?? 0), Number(row?.remaining ?? 0), new Date().toISOString());
}

export function updateTicket(uid: string, eventId: string, ticketId: string, nextStatus: TicketStatus, gateName: string, staffName: string, allowReentry = false) {
  const db = getPaymentDb();
  const event = eventFor(uid, eventId); if (!event) return { error: "Event not found", status: 404 as const };
  const currentRow = db.prepare("SELECT status FROM event_tickets WHERE id=? AND event_id=? LIMIT 1").get(ticketId, Number(eventId)) as { status?: string } | undefined;
  if (!currentRow) return { error: "Ticket not found", status: 404 as const };
  const current = String(currentRow.status ?? "Waiting Entry") as TicketStatus;

  if (["Cancelled","Refunded","Blocked"].includes(current) && !["Cancelled","Refunded","Blocked"].includes(nextStatus)) {
    return { error: `Ticket is ${current}`, status: 403 as const, ticket: snapshot(uid,eventId) };
  }
  if (current === nextStatus) {
    const result = snapshot(uid,eventId);
    const updated = result?.tickets.find((entry) => entry.ticketId === ticketId) ?? null;
    return { result: "already_applied" as const, reason: "already_in_desired_state", ticket: updated, serverVersion: result?.snapshot_version ?? null };
  }
  if (current === "Outside" && nextStatus === "Inside" && !allowReentry) {
    return { error: "Re-entry not permitted", status: 403 as const, ticket: snapshot(uid,eventId) };
  }

  const now = new Date().toISOString();
  const metadata = JSON.stringify({ gate_name: gateName, staff_name: staffName, last_scan_at: now });
  let allowedPreviousStatuses: TicketStatus[];
  if (nextStatus === "Inside") {
    allowedPreviousStatuses = allowReentry ? ["Waiting Entry", "Outside"] : ["Waiting Entry"];
  } else if (nextStatus === "Outside") {
    allowedPreviousStatuses = ["Inside"];
  } else if (nextStatus === "Cancelled" || nextStatus === "Refunded" || nextStatus === "Blocked") {
    allowedPreviousStatuses = ["Waiting Entry", "Outside", "Inside"];
  } else {
    allowedPreviousStatuses = ["Waiting Entry", "Outside", "Inside"];
  }

  const placeholders = allowedPreviousStatuses.map(() => "?").join(",");
  const result = db.prepare(`
    UPDATE event_tickets
    SET status=?,
        scanned_at=CASE WHEN ?='Inside' THEN ? ELSE scanned_at END,
        updated_at=?,
        metadata=?
    WHERE id=? AND event_id=? AND status IN (${placeholders})
  `).run(nextStatus, nextStatus, now, now, metadata, ticketId, Number(eventId), ...allowedPreviousStatuses) as { changes?: number };

  if (Number(result.changes ?? 0) !== 1) {
    const latest = db.prepare("SELECT status FROM event_tickets WHERE id=? AND event_id=? LIMIT 1").get(ticketId, Number(eventId)) as { status?: string } | undefined;
    const latestStatus = String(latest?.status ?? "") as TicketStatus;
    const latestSnapshot = snapshot(uid,eventId);
    const latestTicket = latestSnapshot?.tickets.find((entry) => entry.ticketId === ticketId) ?? null;
    if (latestStatus === nextStatus) {
      return { result: "already_applied" as const, reason: "already_in_desired_state", ticket: latestTicket, serverVersion: latestSnapshot?.snapshot_version ?? null };
    }
    return { error: `Ticket changed to ${latestStatus || "an unknown state"} before this request was applied`, status: 409 as const, result: "rejected" as const, reason: "concurrent_ticket_state_change", ticket: latestTicket, serverVersion: latestSnapshot?.snapshot_version ?? null };
  }

  refreshStats(eventId);
  const updatedSnapshot = snapshot(uid,eventId);
  const updated = updatedSnapshot?.tickets.find((entry) => entry.ticketId === ticketId) ?? null;
  return { result: "accepted" as const, reason: "validated", ticket: updated, serverVersion: updatedSnapshot?.snapshot_version ?? null };
}

function ticketsHandler(req: Request, res: Response) {
  const user = authorized(req,res); if (!user) return;
  const result = snapshot(user.uid, text(req.params.eventId)); if (!result) return res.status(404).json({ error: "Event not found" });
  return res.json({ success:true, event:result.event, tickets:result.tickets, snapshot_version:result.snapshot_version });
}
function scanHandler(req: Request,res: Response) {
  const user=authorized(req,res); if(!user)return;
  const eventId=text(req.body?.eventId), code=normalizeCode(text(req.body?.code));
  const gate=text(req.body?.gateName)||"Main Gate", staff=text(req.body?.staffName)||"Gate Officer";
  if(!eventId||!code)return res.status(400).json({error:"Missing scan code or event id"});
  const result=snapshot(user.uid,eventId); if(!result)return res.status(404).json({error:"Event not found"});
  const expected=text(req.body?.clientSnapshotVersion); if(expected&&expected!==result.snapshot_version)return res.status(409).json({error:"Snapshot outdated",result:"rejected",reason:"event_snapshot_outdated",serverVersion:result.snapshot_version});
  const ticket=result.tickets.find(t=>normalizeCode(t.code)===code||normalizeCode(t.ticketId)===code); if(!ticket)return res.status(404).json({error:"Ticket not found",result:"rejected",reason:"ticket_not_found"});
  if(ticket.status==='Inside')return res.status(409).json({error:"Duplicate scan",result:"already_applied",reason:"already_inside",ticket,serverVersion:result.snapshot_version});
  if(['Cancelled','Refunded','Blocked'].includes(ticket.status))return res.status(403).json({error:"Ticket denied",result:"rejected",reason:`ticket_${ticket.status.toLowerCase()}`,ticket,serverVersion:result.snapshot_version});
  if(ticket.status==='Outside'&&req.body?.allowReentry!==true)return res.status(403).json({error:"Re-entry not permitted",result:"rejected",reason:"reentry_not_permitted",ticket,serverVersion:result.snapshot_version});
  const updated=updateTicket(user.uid,eventId,ticket.ticketId,'Inside',gate,staff,req.body?.allowReentry===true);
  return res.status(updated.status ?? 200).json(updated.status ? {error:updated.error} : updated);
}
function statusHandler(req: Request,res: Response) {
  const user=authorized(req,res); if(!user)return;
  const eventId=text(req.body?.eventId), ticketId=text(req.body?.ticketId), status=text(req.body?.status) as TicketStatus;
  if(!eventId||!ticketId||!status)return res.status(400).json({error:"Missing ticket status data"});
  const allowed:TicketStatus[]=['Waiting Entry','Inside','Outside','Cancelled','Refunded','Blocked']; if(!allowed.includes(status))return res.status(400).json({error:"Invalid ticket status"});
  const result=updateTicket(user.uid,eventId,ticketId,status,text(req.body?.gateName)||'Main Gate',text(req.body?.staffName)||'Gate Officer',req.body?.allowReentry===true);
  return res.status(result.status ?? 200).json(result.status ? {error:result.error} : result);
}
function syncHandler(req: Request,res: Response) {
  const user=authorized(req,res); if(!user)return;
  const queue=Array.isArray(req.body?.queue)?req.body.queue:[]; const applied:any[]=[]; const conflicts:any[]=[];
  for(const item of queue){
    const result=updateTicket(user.uid,text(item.eventId),text(item.ticketId),text(item.newStatus) as TicketStatus,text(item.gateName)||'Main Gate',text(item.staffName)||'Gate Officer',item.allowReentry===true);
    if(result.status) conflicts.push({queueId:item.queueId,ticketId:item.ticketId,eventId:item.eventId,reason:result.error,result:(result as any).result});
    else applied.push({queueId:item.queueId,ticketId:item.ticketId,eventId:item.eventId,result:result.result,reason:result.reason,serverTicket:result.ticket});
  }
  return res.json({success:true,applied,conflicts});
}

export function registerValidatorProjectionRoutes(app: Express){
  if((app as any)[INSTALLED])return;
  app.get('/api/validator/public/events/:eventId/tickets',auth,ticketsHandler);
  app.get('/api/validator/events/:eventId/tickets',auth,ticketsHandler);
  app.post('/api/validator/scan',auth,scanHandler);
  app.post('/api/validator/status',auth,statusHandler);
  app.post('/api/validator/sync',auth,syncHandler);
  (app as any)[INSTALLED]=true;
}
