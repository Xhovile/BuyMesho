import type { Express } from "express";
import { requireAuth } from "../middleware/requireAuth.js";

import { validateEventValues, getEventItemConfig } from "../../src/eventSchemas/index.js";

export type EventRouteDeps = {
  db: any;
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

type EventCreatorRow = { uid: string; status: string; active_until: string | null };

type ParsedEventInput = {
  eventType: string;
  specValues: Record<string, unknown>;
  eventTitle: string;
  organizerName: string;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  ticketMode: string;
  ticketPrice: number | null;
  ticketLink: string | null;
  description: string;
  contactWhatsapp: string | null;
  posterAlt: string | null;
  creatorUid: string | null;
  status: string;
};

type EventActivitySummaryRow = {
  event_id: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
};

type EventMessageSummaryRow = {
  event_id: number;
  message_threads: number;
  unread_messages: number;
  last_message_at: string | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalString(value: unknown): string | null {
  const text = normalizeString(value);
  return text.length > 0 ? text : null;
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function serializeEventRow(row: EventRow) {
  return {
    ...row,
    ticket_price: row.ticket_price === null || row.ticket_price === undefined ? null : Number(row.ticket_price),
    spec_values: safeParseJsonObject(row.spec_values),
  };
}

function parseEventInput(body: any): { data: ParsedEventInput } | { error: string; status: number; validation_errors?: unknown } {
  const eventType = normalizeString(body.event_type);
  const specValues = isPlainObject(body.spec_values) ? body.spec_values : {};
  const config = getEventItemConfig(eventType);

  if (!config) {
    return { status: 400, error: "Invalid event type" };
  }

  const validation = validateEventValues(eventType, specValues);
  if (!validation.isValid) {
    return {
      status: 400,
      error: "Please fix the highlighted event fields.",
      validation_errors: validation.errors,
    };
  }

  const eventTitle = normalizeString(specValues.event_title);
  const organizerName = normalizeString(specValues.organizer_name);
  const eventDate = normalizeString(specValues.event_date);
  const startTime = normalizeString(specValues.start_time);
  const venue = normalizeString(specValues.venue);
  const location = normalizeString(specValues.location);
  const ticketMode = normalizeString(specValues.ticket_mode);
  const ticketPrice = normalizeNumber(specValues.ticket_price);
  const ticketLink = normalizeOptionalString(specValues.ticket_link);
  const description = normalizeString(specValues.description);
  const contactWhatsapp = normalizeOptionalString(specValues.contact_whatsapp);
  const posterAlt = normalizeOptionalString(specValues.poster_alt);
  const creatorUid = null;
  const status = normalizeString(body.status).toLowerCase() === "draft" ? "draft" : "published";

  if (!eventTitle || !organizerName || !eventDate || !startTime || !venue || !location || !ticketMode || !description) {
    return { status: 400, error: "Event basics are required." };
  }

  return {
    data: {
      eventType,
      specValues,
      eventTitle,
      organizerName,
      eventDate,
      startTime,
      venue,
      location,
      ticketMode,
      ticketPrice,
      ticketLink,
      description,
      contactWhatsapp,
      posterAlt,
      creatorUid,
      status,
    },
  };
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function isEventCreatorActive(row: EventCreatorRow | undefined) {
  if (!row || row.status !== "approved") return false;
  if (!row.active_until) return true;
  return new Date(row.active_until).getTime() >= Date.now();
}

function ensureEventManagementSchema(db: any) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS event_creators (
      uid TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      contact_whatsapp TEXT,
      event_types TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      active_until TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_creator_applications (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      applicant_uid TEXT NOT NULL,
      applicant_email TEXT,
      display_name TEXT NOT NULL,
      organization_name TEXT NOT NULL,
      organization_type TEXT NOT NULL,
      contact_whatsapp TEXT,
      event_types TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS event_activity (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_id BIGINT NOT NULL,
      actor_uid TEXT,
      activity_type TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );
  `);
}

function loadEventMessageSummaries(db: any, creatorUid: string) {
  return db
    .prepare(
      `
        SELECT
          c.event_id AS event_id,
          COUNT(*) AS message_threads,
          COALESCE(SUM(CASE WHEN c.seller_unread_count > 0 THEN c.seller_unread_count ELSE 0 END), 0) AS unread_messages,
          MAX(c.updated_at) AS last_message_at
        FROM conversations c
        WHERE c.event_id IS NOT NULL
          AND c.seller_uid = ?
        GROUP BY c.event_id
      `
    )
    .all(creatorUid) as EventMessageSummaryRow[];
}

function loadEventActivitySummaries(db: any, creatorUid: string) {
  return db
    .prepare(
      `
        SELECT
          e.id AS event_id,
          COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_added_to_cart' THEN 1 ELSE 0 END), 0) AS cart_adds,
          COALESCE(SUM(CASE WHEN a.activity_type = 'ticket_link_clicked' THEN 1 ELSE 0 END), 0) AS ticket_clicks,
          MAX(a.created_at) AS last_activity_at
        FROM events e
        LEFT JOIN event_activity a ON a.event_id = e.id
        WHERE e.creator_uid = ?
          AND e.deleted_at IS NULL
        GROUP BY e.id
      `
    )
    .all(creatorUid) as EventActivitySummaryRow[];
}

export function registerEventRoutes(app: Express, deps: EventRouteDeps) {
  const { db } = deps;

  ensureEventManagementSchema(db);

  app.get("/api/event-creators/me", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      const latestSubmission = db
        .prepare(`SELECT * FROM event_creator_applications WHERE applicant_uid = ? ORDER BY created_at DESC, id DESC LIMIT 1`)
        .get(uid);
      return res.json({ creator: creator ?? null, latestSubmission: latestSubmission ?? null, canCreateEvents: isEventCreatorActive(creator) });
    } catch (error) {
      console.warn("Failed to load event creator profile", error);
      return res.json({ creator: null, latestSubmission: null, canCreateEvents: false });
    }
  });

  app.post("/api/event-creators", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    const email = req.user?.email || normalizeString(req.body?.email);
    const displayName = normalizeString(req.body?.display_name);
    const organizationName = normalizeString(req.body?.organization_name);
    const organizationType = normalizeString(req.body?.organization_type);
    const contactWhatsapp = normalizeOptionalString(req.body?.contact_whatsapp);
    const eventTypes = normalizeString(req.body?.event_types);
    const reason = normalizeString(req.body?.reason);
    const activeUntil = addDaysIso(30);

    if (!displayName || !organizationName || !organizationType || !eventTypes || reason.length < 10) {
      return res.status(400).json({ error: "Please complete the event creator onboarding form." });
    }

    try {
      db.prepare(`
        INSERT INTO event_creator_applications (
          applicant_uid, applicant_email, display_name, organization_name, organization_type,
          contact_whatsapp, event_types, reason, status, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', CURRENT_TIMESTAMP)
      `).run(uid, email, displayName, organizationName, organizationType, contactWhatsapp, eventTypes, reason);

      db.prepare(`
        INSERT INTO event_creators (
          uid, email, display_name, organization_name, organization_type, contact_whatsapp,
          event_types, status, active_until, approved_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(uid) DO UPDATE SET
          email = excluded.email,
          display_name = excluded.display_name,
          organization_name = excluded.organization_name,
          organization_type = excluded.organization_type,
          contact_whatsapp = excluded.contact_whatsapp,
          event_types = excluded.event_types,
          status = 'approved',
          active_until = excluded.active_until,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `).run(uid, email, displayName, organizationName, organizationType, contactWhatsapp, eventTypes, activeUntil);

      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      return res.status(201).json({ success: true, creator, canCreateEvents: true });
    } catch (error) {
      console.error("Failed to save event creator onboarding", error);
      return res.status(500).json({ error: "Failed to save event creator onboarding" });
    }
  });

  app.get("/api/event-creator/dashboard", requireAuth, (req, res) => {
    const uid = req.user!.uid;
    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid);
      const events = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE creator_uid = ?
              AND deleted_at IS NULL
            ORDER BY created_at DESC, id DESC
          `
        )
        .all(uid) as EventRow[];

      const messageSummaries = loadEventMessageSummaries(db, uid);
      const activitySummaries = loadEventActivitySummaries(db, uid);
      const messageMap = new Map(messageSummaries.map((row) => [row.event_id, row]));
      const activityMap = new Map(activitySummaries.map((row) => [row.event_id, row]));

      return res.json({
        creator: creator ?? null,
        events: events.map((event) => {
          const messages = messageMap.get(event.id);
          const activity = activityMap.get(event.id);
          return {
            ...serializeEventRow(event),
            message_threads: Number(messages?.message_threads || 0),
            unread_messages: Number(messages?.unread_messages || 0),
            last_message_at: messages?.last_message_at || null,
            cart_adds: Number(activity?.cart_adds || 0),
            ticket_clicks: Number(activity?.ticket_clicks || 0),
            last_activity_at: activity?.last_activity_at || null,
          };
        }),
      });
    } catch (error) {
      console.error("Failed to load event creator dashboard", error);
      return res.status(500).json({ error: "Failed to load event creator dashboard" });
    }
  });

  app.get("/api/events", (_req, res) => {
    try {
      const items = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE deleted_at IS NULL
              AND status = 'published'
            ORDER BY created_at DESC, id DESC
            LIMIT 100
          `
        )
        .all() as EventRow[];

      return res.json({ items: items.map(serializeEventRow) });
    } catch (error) {
      console.error("Failed to load events", error);
      return res.status(500).json({ error: "Failed to load events" });
    }
  });

  app.get("/api/events/:id", (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    try {
      const row = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE id = ? AND deleted_at IS NULL
            LIMIT 1
          `
        )
        .get(eventId) as EventRow | undefined;

      if (!row) {
        return res.status(404).json({ error: "Event not found" });
      }

      return res.json({ event: serializeEventRow(row) });
    } catch (error) {
      console.error("Failed to load event", error);
      return res.status(500).json({ error: "Failed to load event" });
    }
  });

  app.post("/api/events/:id/activity", (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const activityType = normalizeString(req.body?.activity_type);
    const allowedTypes = new Set(["ticket_added_to_cart", "ticket_link_clicked"]);
    if (!allowedTypes.has(activityType)) {
      return res.status(400).json({ error: "Invalid activity type" });
    }

    try {
      const event = db
        .prepare(
          `
            SELECT id
            FROM events
            WHERE id = ? AND deleted_at IS NULL
            LIMIT 1
          `
        )
        .get(eventId);

      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const metadata = isPlainObject(req.body?.metadata) ? JSON.stringify(req.body.metadata) : null;
      db.prepare(
        `
          INSERT INTO event_activity (
            event_id,
            actor_uid,
            activity_type,
            metadata,
            created_at
          ) VALUES (?, NULL, ?, ?, CURRENT_TIMESTAMP)
        `
      ).run(eventId, activityType, metadata);

      return res.status(201).json({ success: true });
    } catch (error) {
      console.error("Failed to record event activity", error);
      return res.status(500).json({ error: "Failed to record event activity" });
    }
  });

  const saveEvent = (req: any, res: any, eventId?: number) => {
    try {
      const parsed = parseEventInput(req.body ?? {});
      if ("error" in parsed) {
        return res.status(parsed.status).json(
          parsed.validation_errors ? { error: parsed.error, validation_errors: parsed.validation_errors } : { error: parsed.error }
        );
      }

      const { data } = parsed;
      const uid = req.user!.uid;
      const creator = db.prepare(`SELECT uid, status, active_until FROM event_creators WHERE uid = ? LIMIT 1`).get(uid) as EventCreatorRow | undefined;
      if (!isEventCreatorActive(creator)) {
        return res.status(403).json({ error: "Approved event creator access is required to publish events." });
      }

      if (eventId !== undefined) {
        const existing = db
          .prepare(
            `
              SELECT id, creator_uid
              FROM events
              WHERE id = ? AND deleted_at IS NULL
              LIMIT 1
            `
          )
          .get(eventId) as { id: number; creator_uid: string | null } | undefined;

        if (!existing) {
          return res.status(404).json({ error: "Event not found" });
        }
        if (existing.creator_uid !== uid) {
          return res.status(403).json({ error: "Only the event creator can edit this event." });
        }

        db.prepare(
          `
            UPDATE events
            SET
              event_type = ?,
              event_title = ?,
              organizer_name = ?,
              event_date = ?,
              start_time = ?,
              venue = ?,
              location = ?,
              ticket_mode = ?,
              ticket_price = ?,
              ticket_link = ?,
              description = ?,
              contact_whatsapp = ?,
              poster_alt = ?,
              spec_values = ?,
              status = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `
        ).run(
          data.eventType,
          data.eventTitle,
          data.organizerName,
          data.eventDate,
          data.startTime,
          data.venue,
          data.location,
          data.ticketMode,
          data.ticketPrice,
          data.ticketLink,
          data.description,
          data.contactWhatsapp,
          data.posterAlt,
          JSON.stringify(data.specValues),
          data.status,
          eventId
        );

        const row = db
          .prepare(
            `
              SELECT *
              FROM events
              WHERE id = ?
              LIMIT 1
            `
          )
          .get(eventId) as EventRow | undefined;

        return res.json({
          success: true,
          event: row ? serializeEventRow(row) : null,
        });
      }

      const insert = db
        .prepare(
          `
            INSERT INTO events (
              creator_uid,
              event_type,
              event_title,
              organizer_name,
              event_date,
              start_time,
              venue,
              location,
              ticket_mode,
              ticket_price,
              ticket_link,
              description,
              contact_whatsapp,
              poster_alt,
              spec_values,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          uid,
          data.eventType,
          data.eventTitle,
          data.organizerName,
          data.eventDate,
          data.startTime,
          data.venue,
          data.location,
          data.ticketMode,
          data.ticketPrice,
          data.ticketLink,
          data.description,
          data.contactWhatsapp,
          data.posterAlt,
          JSON.stringify(data.specValues),
          data.status
        );

      const row = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE id = ?
            LIMIT 1
          `
        )
        .get(insert.lastInsertRowid) as EventRow | undefined;

      return res.status(201).json({
        success: true,
        event: row ? serializeEventRow(row) : null,
      });
    } catch (error) {
      console.error(eventId !== undefined ? "Failed to update event" : "Failed to create event", error);
      return res.status(500).json({ error: eventId !== undefined ? "Failed to update event" : "Failed to create event" });
    }
  };

  app.post("/api/events", requireAuth, (req, res) => saveEvent(req, res));
  app.put("/api/events/:id", requireAuth, (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    return saveEvent(req, res, eventId);
  });
  app.patch("/api/events/:id", requireAuth, (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    return saveEvent(req, res, eventId);
  });

  app.patch("/api/event-creator/events/:id/status", requireAuth, (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const status = normalizeString(req.body?.status).toLowerCase();
    if (!["published", "inactive"].includes(status)) {
      return res.status(400).json({ error: "Invalid event status" });
    }

    try {
      const existing = db
        .prepare(
          `
            SELECT id, creator_uid
            FROM events
            WHERE id = ? AND deleted_at IS NULL
            LIMIT 1
          `
        )
        .get(eventId) as { id: number; creator_uid: string | null } | undefined;

      if (!existing) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (existing.creator_uid !== req.user!.uid) {
        return res.status(403).json({ error: "Only the event creator can update this event." });
      }

      db.prepare(
        `
          UPDATE events
          SET status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      ).run(status, eventId);

      const row = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE id = ?
            LIMIT 1
          `
        )
        .get(eventId) as EventRow | undefined;

      return res.json({ success: true, event: row ? serializeEventRow(row) : null });
    } catch (error) {
      console.error("Failed to update event status", error);
      return res.status(500).json({ error: "Failed to update event status" });
    }
  });

  app.delete("/api/events/:id", requireAuth, (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    try {
      const existing = db
        .prepare(
          `
            SELECT id, creator_uid
            FROM events
            WHERE id = ? AND deleted_at IS NULL
            LIMIT 1
          `
        )
        .get(eventId) as { id: number; creator_uid: string | null } | undefined;

      if (!existing) {
        return res.status(404).json({ error: "Event not found" });
      }
      if (existing.creator_uid !== req.user!.uid) {
        return res.status(403).json({ error: "Only the event creator can cancel this event." });
      }

      db.prepare(
        `
          UPDATE events
          SET deleted_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      ).run(eventId);

      return res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete event", error);
      return res.status(500).json({ error: "Failed to delete event" });
    }
  });
}
