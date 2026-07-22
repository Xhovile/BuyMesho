import type { Express } from "express";

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

function serializeEventRow(row: EventRow) {
  return {
    ...row,
    ticket_price: row.ticket_price === null || row.ticket_price === undefined ? null : Number(row.ticket_price),
    spec_values: JSON.parse(row.spec_values || "{}"),
  };
}

export function registerEventRoutes(app: Express, deps: EventRouteDeps) {
  const { db } = deps;

  app.get("/api/events", (_req, res) => {
    try {
      const items = db
        .prepare(
          `
            SELECT *
            FROM events
            WHERE deleted_at IS NULL
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

  app.delete("/api/events/:id", (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    try {
      const existing = db
        .prepare(
          `
            SELECT id
            FROM events
            WHERE id = ? AND deleted_at IS NULL
            LIMIT 1
          `
        )
        .get(eventId) as { id: number } | undefined;

      if (!existing) {
        return res.status(404).json({ error: "Event not found" });
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

  app.post("/api/events", (req, res) => {
    try {
      const body = req.body ?? {};
      const eventType = normalizeString(body.event_type);
      const specValues = isPlainObject(body.spec_values) ? body.spec_values : {};
      const config = getEventItemConfig(eventType);

      if (!config) {
        return res.status(400).json({ error: "Invalid event type" });
      }

      const validation = validateEventValues(eventType, specValues);
      if (!validation.isValid) {
        return res.status(400).json({
          error: "Please fix the highlighted event fields.",
          validation_errors: validation.errors,
        });
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
      const creatorUid = normalizeOptionalString(body.creator_uid);
      const status = normalizeString(body.status).toLowerCase() === "draft" ? "draft" : "published";

      if (!eventTitle || !organizerName || !eventDate || !startTime || !venue || !location || !ticketMode || !description) {
        return res.status(400).json({ error: "Event basics are required." });
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
          creatorUid,
          eventType,
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
          JSON.stringify(specValues),
          status
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
      console.error("Failed to create event", error);
      return res.status(500).json({ error: "Failed to create event" });
    }
  });
}
