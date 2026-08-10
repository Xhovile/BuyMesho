import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

import { validateEventValues, getEventItemConfig } from "../../src/eventSchemas/index.js";

export type EventRouteDeps = { db: any };

type EventRow = {
  id: number;
  creator_uid: string | null;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
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
  publication_status: "draft" | "published" | "paused" | "cancelled";
  publication_mode: "immediate" | "scheduled";
  publication_at: string | null;
  runtime_mode: "automatic" | "force_live" | "force_upcoming";
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type EventCreatorRow = { uid: string; status: string; active_until: string | null };

type ParsedEventInput = {
  eventType: string;
  specValues: Record<string, unknown>;
  eventTitle: string;
  organizerName: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  venue: string;
  location: string;
  ticketMode: string;
  ticketPrice: number | null;
  ticketLink: string | null;
  description: string;
  contactWhatsapp: string | null;
  posterAlt: string | null;
  creatorUid: string | null;
  publicationStatus: "draft" | "published" | "paused" | "cancelled";
  publicationMode: "immediate" | "scheduled";
  publicationAt: string | null;
  runtimeMode: "automatic" | "force_live" | "force_upcoming";
};

type EventActivitySummaryRow = { event_id: number; cart_adds: number; ticket_clicks: number; last_activity_at: string | null };
type EventMessageSummaryRow = { event_id: number; message_threads: number; unread_messages: number; last_message_at: string | null };

function normalizeString(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }
function normalizeOptionalString(value: unknown): string | null { const text = normalizeString(value); return text.length > 0 ? text : null; }
function normalizeNumber(value: unknown): number | null { if (value === null || value === undefined || value === "") return null; const parsed = typeof value === "number" ? value : Number(value); return Number.isFinite(parsed) ? parsed : null; }
function isPlainObject(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function safeParseJsonObject(value: string | null | undefined): Record<string, unknown> { if (!value) return {}; try { const parsed = JSON.parse(value); return isPlainObject(parsed) ? parsed : {}; } catch { return {}; } }

function getPublicationStatusFromLegacy(status: string): "draft" | "published" | "paused" | "cancelled" {
  switch (status.toLowerCase()) {
    case "draft": return "draft";
    case "inactive": return "paused";
    case "cancelled": return "cancelled";
    default: return "published";
  }
}

function getLegacyStatus(publicationStatus: string) {
  return publicationStatus === "paused" ? "inactive" : publicationStatus;
}

function isPubliclyPublished(row: Pick<EventRow, "publication_status" | "publication_mode" | "publication_at">) {
  if (row.publication_status !== "published") return false;
  if (row.publication_mode === "scheduled") {
    if (!row.publication_at) return false;
    return new Date(row.publication_at).getTime() <= Date.now();
  }
  return true;
}

function getRuntimeState(row: Pick<EventRow, "event_date" | "start_time" | "end_time" | "runtime_mode">) {
  if (row.runtime_mode === "force_live") return "Live" as const;
  if (row.runtime_mode === "force_upcoming") return "Upcoming" as const;

  const start = new Date(`${row.event_date}T${row.start_time}`);
  if (Number.isNaN(start.getTime())) return "Upcoming" as const;
  const end = row.end_time ? new Date(`${row.event_date}T${row.end_time}`) : null;
  const now = Date.now();
  if (now < start.getTime()) return "Upcoming" as const;
  if (end && !Number.isNaN(end.getTime()) && now > end.getTime()) return "Ended" as const;
  return "Live" as const;
}

function serializeEventRow(row: EventRow) {
  const publicationStatus = row.publication_status ?? getPublicationStatusFromLegacy(row.status);
  const runtimeMode = row.runtime_mode ?? "automatic";
  return {
    ...row,
    status: getLegacyStatus(publicationStatus),
    publication_status: publicationStatus,
    publication_mode: row.publication_mode ?? "immediate",
    publication_at: row.publication_at ?? null,
    runtime_mode: runtimeMode,
    end_time: row.end_time ?? null,
    runtime_state: getRuntimeState({ event_date: row.event_date, start_time: row.start_time, end_time: row.end_time, runtime_mode: runtimeMode }),
    public_visibility: isPubliclyPublished({ publication_status: publicationStatus, publication_mode: row.publication_mode ?? "immediate", publication_at: row.publication_at ?? null }),
    ticket_price: row.ticket_price === null || row.ticket_price === undefined ? null : Number(row.ticket_price),
    spec_values: safeParseJsonObject(row.spec_values),
  };
}

function parseEventInput(body: any): { data: ParsedEventInput } | { error: string; status: number; validation_errors?: unknown } {
  const eventType = normalizeString(body.event_type);
  const specValues = isPlainObject(body.spec_values) ? body.spec_values : {};
  const config = getEventItemConfig(eventType);
  if (!config) return { status: 400, error: "Invalid event type" };

  const validation = validateEventValues(eventType, specValues);
  if (!validation.isValid) return { status: 400, error: "Please fix the highlighted event fields.", validation_errors: validation.errors };

  const eventTitle = normalizeString(specValues.event_title);
  const organizerName = normalizeString(specValues.organizer_name);
  const eventDate = normalizeString(specValues.event_date);
  const startTime = normalizeString(specValues.start_time);
  const endTime = normalizeOptionalString(specValues.end_time);
  const venue = normalizeString(specValues.venue);
  const location = normalizeString(specValues.location);
  const ticketMode = normalizeString(specValues.ticket_mode);
  const ticketPrice = normalizeNumber(specValues.ticket_price);
  const ticketLink = normalizeOptionalString(specValues.ticket_link);
  const description = normalizeString(specValues.description);
  const contactWhatsapp = normalizeOptionalString(specValues.contact_whatsapp);
  const posterAlt = normalizeOptionalString(specValues.poster_alt);
  const creatorUid = null;
  const rawPublicationStatus = normalizeString(body.publication_status || body.status).toLowerCase();
  const publicationStatus = ["draft", "published", "paused", "cancelled"].includes(rawPublicationStatus) ? rawPublicationStatus as ParsedEventInput["publicationStatus"] : "published";
  const publicationMode = normalizeString(body.publication_mode).toLowerCase() === "scheduled" ? "scheduled" : "immediate";
  const publicationAt = publicationMode === "scheduled" ? normalizeOptionalString(body.publication_at) : null;
  const runtimeModeRaw = normalizeString(body.runtime_mode).toLowerCase();
  const runtimeMode = ["automatic", "force_live", "force_upcoming"].includes(runtimeModeRaw) ? runtimeModeRaw as ParsedEventInput["runtimeMode"] : "automatic";

  if (!eventTitle || !organizerName || !eventDate || !startTime || !venue || !location || !ticketMode || !description) return { status: 400, error: "Event basics are required." };
  if (!endTime) return { status: 400, error: "Event end time is required." };
  if (publicationMode === "scheduled") {
    if (!publicationAt) return { status: 400, error: "A publication date and time are required when scheduling publication." };
    if (Number.isNaN(new Date(publicationAt).getTime())) return { status: 400, error: "Invalid publication date and time." };
  }

  return { data: { eventType, specValues, eventTitle, organizerName, eventDate, startTime, endTime, venue, location, ticketMode, ticketPrice, ticketLink, description, contactWhatsapp, posterAlt, creatorUid, publicationStatus, publicationMode, publicationAt, runtimeMode } };
}

function addDaysIso(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString(); }
function isEventCreatorActive(row: EventCreatorRow | undefined) { if (!row || row.status !== "approved") return false; if (!row.active_until) return true; return new Date(row.active_until).getTime() >= Date.now(); }

function ensureEventManagementSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_creators (
      uid TEXT PRIMARY KEY, email TEXT NOT NULL, display_name TEXT NOT NULL, organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL, contact_whatsapp TEXT, event_types TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved',
      active_until TIMESTAMPTZ, approved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS event_creator_applications (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, applicant_uid TEXT NOT NULL, applicant_email TEXT,
      display_name TEXT NOT NULL, organization_name TEXT NOT NULL, organization_type TEXT NOT NULL, contact_whatsapp TEXT,
      event_types TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'approved', reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS event_activity (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, event_id BIGINT NOT NULL, actor_uid TEXT, activity_type TEXT NOT NULL,
      metadata TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
    ALTER TABLE events ADD COLUMN IF NOT EXISTS end_time TEXT;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'published';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS publication_mode TEXT NOT NULL DEFAULT 'immediate';
    ALTER TABLE events ADD COLUMN IF NOT EXISTS publication_at TIMESTAMPTZ;
    ALTER TABLE events ADD COLUMN IF NOT EXISTS runtime_mode TEXT NOT NULL DEFAULT 'automatic';
  `);
  db.exec(`
    UPDATE events
    SET publication_status = CASE
      WHEN lower(COALESCE(status, 'published')) = 'draft' THEN 'draft'
      WHEN lower(COALESCE(status, 'published')) = 'inactive' THEN 'paused'
      WHEN lower(COALESCE(status, 'published')) = 'cancelled' THEN 'cancelled'
      ELSE 'published'
    END
    WHERE publication_status IS NULL OR publication_status = 'published' AND lower(COALESCE(status, 'published')) <> 'published';

    UPDATE events
    SET publication_mode = 'immediate'
    WHERE publication_mode IS NULL OR publication_mode NOT IN ('immediate', 'scheduled');

    UPDATE events
    SET runtime_mode = 'automatic'
    WHERE runtime_mode IS NULL OR runtime_mode NOT IN ('automatic', 'force_live', 'force_upcoming');
  `);
}

function loadEventMessageSummaries(db: any, creatorUid: string) {
  return db.prepare(`SELECT c.event_id AS event_id, COUNT(*) AS message_threads, COALESCE(SUM(CASE WHEN c.seller_unread_count > 0 THEN c.seller_unread_count ELSE 0 END), 0) AS unread_messages, MAX(c.updated_at) AS last_message_at FROM conversations c WHERE c.event_id IS NOT NULL AND c.seller_uid = ? GROUP BY c.event_id`).all(creatorUid) as EventMessageSummaryRow[];
}
function loadEventActivitySummaries(db: any, creatorUid: string) {
  return db.prepare(`SELECT e.id AS event_id, COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_added_to_cart' THEN 1 ELSE 0 END), 0) AS cart_adds, COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_link_clicked' THEN 1 ELSE 0 END), 0) AS ticket_clicks, MAX(a.created_at) AS last_activity_at FROM events e LEFT JOIN event_activity a ON a.event_id = e.id WHERE e.creator_uid = ? AND e.deleted_at IS NULL GROUP BY e.id`).all(creatorUid) as EventActivitySummaryRow[];

export function registerEventRoutes(app: Express, deps: EventRouteDeps) {
  const { db } = deps;
  ensureEventManagementSchema(db);

  app.get("/api/event-creators/me", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      const latestSubmission = db.prepare(`SELECT * FROM event_creator_applications WHERE applicant_uid = ? ORDER BY created_at DESC, id DESC LIMIT 1`).get(uid);
      return res.json({ creator: creator ?? null, latestSubmission: latestSubmission ?? null, canCreateEvents: isEventCreatorActive(creator) });
    } catch (error) { console.warn("Failed to load event creator profile", error); return res.json({ creator: null, latestSubmission: null, canCreateEvents: false }); }
  });

  app.post("/api/event-creators", requireAuth, (req, res) => {
    const uid = req.user!.uid; const email = req.user?.email || normalizeString(req.body?.email);
    const displayName = normalizeString(req.body?.display_name); const organizationName = normalizeString(req.body?.organization_name);
    const organizationType = normalizeString(req.body?.organization_type); const contactWhatsapp = normalizeOptionalString(req.body?.contact_whatsapp);
    const eventTypes = normalizeString(req.body?.event_types); const reason = normalizeString(req.body?.reason); const activeUntil = addDaysIso(30);
    if (!displayName || !organizationName || !organizationType || !eventTypes || reason.length < 10) return res.status(400).json({ error: "Please complete the event creator onboarding form." });
    try {
      db.prepare(`INSERT INTO event_creator_applications (applicant_uid, applicant_email, display_name, organization_name, organization_type, contact_whatsapp, event_types, reason, status, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)`).run(uid, email, displayName, organizationName, organizationType, contactWhatsapp, eventTypes, reason);
      db.prepare(`INSERT INTO event_creators (uid, email, display_name, organization_name, organization_type, contact_whatsapp, event_types, status, active_until, approved_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT(uid) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, organization_name = excluded.organization_name, organization_type = excluded.organization_type, contact_whatsapp = excluded.contact_whatsapp, event_types = excluded.event_types, status = 'approved', active_until = excluded.active_until, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP`).run(uid, email, displayName, organizationName, organizationType, contactWhatsapp, eventTypes, activeUntil);
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      return res.status(201).json({ success: true, creator, canCreateEvents: true });
    } catch (error) { console.error("Failed to save event creator onboarding", error); return res.status(500).json({ error: "Failed to save event creator onboarding" }); }
  });

  app.get("/api/event-creator/dashboard", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      const events = db.prepare(`SELECT * FROM events WHERE creator_uid = ? AND deleted_at IS NULL ORDER BY created_at DESC, id DESC`).all(uid) as EventRow[];
      const messageMap = new Map(loadEventMessageSummaries(db, uid).map((row) => [row.event_id, row]));
      const activityMap = new Map(loadEventActivitySummaries(db, uid).map((row) => [row.event_id, row]));
      return res.json({ creator: creator ?? null, events: events.map((event) => ({ ...serializeEventRow(event), message_threads: Number(messageMap.get(event.id)?.message_threads || 0), unread_messages: Number(messageMap.get(event.id)?.unread_messages || 0), last_message_at: messageMap.get(event.id)?.last_message_at || null, cart_adds: Number(activityMap.get(event.id)?.cart_adds || 0), ticket_clicks: Number(activityMap.get(event.id)?.ticket_clicks || 0), last_activity_at: activityMap.get(event.id)?.last_activity_at || null })) });
    } catch (error) { console.error("Failed to load event creator dashboard", error); return res.status(500).json({ error: "Failed to load event creator dashboard" }); }
  });

  app.get("/api/event-creator/events/:id", requireAuth, (req, res) => {
    const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });
    try {
      const row = db.prepare(`SELECT * FROM events WHERE id = ? AND creator_uid = ? AND deleted_at IS NULL LIMIT 1`).get(eventId, req.user!.uid) as EventRow | undefined;
      if (!row) return res.status(404).json({ error: "Event not found" });
      return res.json({ event: serializeEventRow(row) });
    } catch (error) { console.error("Failed to load managed event", error); return res.status(500).json({ error: "Failed to load event" }); }
  });

  app.get("/api/events", (_req, res) => {
    try {
      const items = db.prepare(`SELECT * FROM events WHERE deleted_at IS NULL AND publication_status = 'published' AND (publication_mode = 'immediate' OR (publication_mode = 'scheduled' AND publication_at IS NOT NULL AND publication_at <= CURRENT_TIMESTAMP)) ORDER BY created_at DESC, id DESC LIMIT 100`).all() as EventRow[];
      return res.json({ items: items.map(serializeEventRow) });
    } catch (error) { console.error("Failed to load events", error); return res.status(500).json({ error: "Failed to load events" }); }
  });

  app.get("/api/events/:id", (req, res) => {
    const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });
    try {
      const row = db.prepare(`SELECT * FROM events WHERE id = ? AND deleted_at IS NULL AND publication_status = 'published' AND (publication_mode = 'immediate' OR (publication_mode = 'scheduled' AND publication_at IS NOT NULL AND publication_at <= CURRENT_TIMESTAMP)) LIMIT 1`).get(eventId) as EventRow | undefined;
      if (!row) return res.status(404).json({ error: "Event not found" });
      return res.json({ event: serializeEventRow(row) });
    } catch (error) { console.error("Failed to load event", error); return res.status(500).json({ error: "Failed to load event" }); }
  });

  app.post("/api/events/:id/activity", (req, res) => {
    const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });
    const activityType = normalizeString(req.body?.activity_type); const allowedTypes = new Set(["ticket_added_to_cart", "ticket_link_clicked"]);
    if (!allowedTypes.has(activityType)) return res.status(400).json({ error: "Invalid activity type" });
    try {
      const event = db.prepare(`SELECT id FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`).get(eventId); if (!event) return res.status(404).json({ error: "Event not found" });
      const metadata = isPlainObject(req.body?.metadata) ? JSON.stringify(req.body.metadata) : null;
      db.prepare(`INSERT INTO event_activity (event_id, actor_uid, activity_type, metadata, created_at) VALUES (?, NULL, ?, ?, CURRENT_TIMESTAMP)`).run(eventId, activityType, metadata);
      return res.status(201).json({ success: true });
    } catch (error) { console.error("Failed to record event activity", error); return res.status(500).json({ error: "Failed to record event activity" }); }
  });

  const saveEvent = (req: any, res: any, eventId?: number) => {
    try {
      const parsed = parseEventInput(req.body ?? {});
      if ("error" in parsed) return res.status(parsed.status).json(parsed.validation_errors ? { error: parsed.error, validation_errors: parsed.validation_errors } : { error: parsed.error });
      const { data } = parsed; const uid = req.user!.uid;
      const creator = db.prepare(`SELECT uid, status, active_until FROM event_creators WHERE uid = ? LIMIT 1`).get(uid) as EventCreatorRow | undefined;
      if (!isEventCreatorActive(creator)) return res.status(403).json({ error: "Approved event creator access is required to manage events." });

      if (eventId !== undefined) {
        const existing = db.prepare(`SELECT id, creator_uid FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`).get(eventId) as { id: number; creator_uid: string | null } | undefined;
        if (!existing) return res.status(404).json({ error: "Event not found" });
        if (existing.creator_uid !== uid) return res.status(403).json({ error: "Only the event creator can edit this event." });
        db.prepare(`UPDATE events SET event_type = ?, event_title = ?, organizer_name = ?, event_date = ?, start_time = ?, end_time = ?, venue = ?, location = ?, ticket_mode = ?, ticket_price = ?, ticket_link = ?, description = ?, contact_whatsapp = ?, poster_alt = ?, spec_values = ?, publication_status = ?, publication_mode = ?, publication_at = ?, runtime_mode = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(data.eventType, data.eventTitle, data.organizerName, data.eventDate, data.startTime, data.endTime, data.venue, data.location, data.ticketMode, data.ticketPrice, data.ticketLink, data.description, data.contactWhatsapp, data.posterAlt, JSON.stringify(data.specValues), data.publicationStatus, data.publicationMode, data.publicationAt, data.runtimeMode, getLegacyStatus(data.publicationStatus), eventId);
        const row = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as EventRow | undefined;
        return res.json({ success: true, event: row ? serializeEventRow(row) : null });
      }

      const insert = db.prepare(`INSERT INTO events (creator_uid, event_type, event_title, organizer_name, event_date, start_time, end_time, venue, location, ticket_mode, ticket_price, ticket_link, description, contact_whatsapp, poster_alt, spec_values, publication_status, publication_mode, publication_at, runtime_mode, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(uid, data.eventType, data.eventTitle, data.organizerName, data.eventDate, data.startTime, data.endTime, data.venue, data.location, data.ticketMode, data.ticketPrice, data.ticketLink, data.description, data.contactWhatsapp, data.posterAlt, JSON.stringify(data.specValues), data.publicationStatus, data.publicationMode, data.publicationAt, data.runtimeMode, getLegacyStatus(data.publicationStatus));
      const row = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(insert.lastInsertRowid) as EventRow | undefined;
      return res.status(201).json({ success: true, event: row ? serializeEventRow(row) : null });
    } catch (error) { console.error(eventId !== undefined ? "Failed to update event" : "Failed to create event", error); return res.status(500).json({ error: eventId !== undefined ? "Failed to update event" : "Failed to create event" }); }
  };

  app.post("/api/events", requireAuth, (req, res) => saveEvent(req, res));
  app.put("/api/events/:id", requireAuth, (req, res) => { const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" }); return saveEvent(req, res, eventId); });
  app.patch("/api/events/:id", requireAuth, (req, res) => { const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" }); return saveEvent(req, res, eventId); });

  app.patch("/api/event-creator/events/:id/status", requireAuth, (req, res) => {
    const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });
    const requested = normalizeString(req.body?.status || req.body?.publication_status).toLowerCase();
    const nextStatus = requested === "inactive" ? "paused" : requested;
    if (!["published", "draft", "paused", "cancelled"].includes(nextStatus)) return res.status(400).json({ error: "Invalid event publication status" });
    try {
      const existing = db.prepare(`SELECT id, creator_uid FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`).get(eventId) as { id: number; creator_uid: string | null } | undefined;
      if (!existing) return res.status(404).json({ error: "Event not found" });
      if (existing.creator_uid !== req.user!.uid) return res.status(403).json({ error: "Only the event creator can update this event." });
      db.prepare(`UPDATE events SET publication_status = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(nextStatus, getLegacyStatus(nextStatus), eventId);
      const row = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as EventRow | undefined;
      return res.json({ success: true, event: row ? serializeEventRow(row) : null });
    } catch (error) { console.error("Failed to update event publication status", error); return res.status(500).json({ error: "Failed to update event status" }); }
  });

  app.patch("/api/event-creator/events/:id/runtime", requireAuth, (req, res) => {
    const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });
    const runtimeMode = normalizeString(req.body?.runtime_mode).toLowerCase();
    if (!["automatic", "force_live", "force_upcoming"].includes(runtimeMode)) return res.status(400).json({ error: "Invalid runtime mode" });
    try {
      const existing = db.prepare(`SELECT id, creator_uid FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`).get(eventId) as { id: number; creator_uid: string | null } | undefined;
      if (!existing) return res.status(404).json({ error: "Event not found" });
      if (existing.creator_uid !== req.user!.uid) return res.status(403).json({ error: "Only the event creator can update runtime status." });
      db.prepare(`UPDATE events SET runtime_mode = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(runtimeMode, eventId);
      const row = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as EventRow | undefined;
      return res.json({ success: true, event: row ? serializeEventRow(row) : null });
    } catch (error) { console.error("Failed to update event runtime mode", error); return res.status(500).json({ error: "Failed to update runtime mode" }); }
  });

  app.delete("/api/events/:id", requireAuth, (req, res) => {
    const eventId = Number(req.params.id); if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });
    try {
      const existing = db.prepare(`SELECT id, creator_uid FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`).get(eventId) as { id: number; creator_uid: string | null } | undefined;
      if (!existing) return res.status(404).json({ error: "Event not found" });
      if (existing.creator_uid !== req.user!.uid) return res.status(403).json({ error: "Only the event creator can cancel this event." });
      db.prepare(`UPDATE events SET deleted_at = CURRENT_TIMESTAMP, publication_status = 'cancelled', status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(eventId);
      return res.json({ success: true });
    } catch (error) { console.error("Failed to delete event", error); return res.status(500).json({ error: "Failed to delete event" }); }
  });
}
