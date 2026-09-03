import type { PgCompatDatabase } from "../../db.js";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "./admin.rateLimit.js";
import { notifyEventCancelled } from "../notifications/event-cancelled.notification.js";
import {
  ADMIN_ACTION_TYPES,
  ADMIN_TARGET_TYPES,
  type AdminActionType,
  type AdminTargetType,
} from "../../../src/modules/admin/shared/adminAuditTypes.js";

type LogAdminAction = (entry: {
  admin_uid?: string | null;
  admin_email?: string | null;
  action_type: AdminActionType;
  target_type: AdminTargetType;
  target_id?: string | null;
  details?: unknown;
}) => void;

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

type EventCreatorApplicationRow = {
  id: number;
  applicant_uid: string;
  applicant_email: string | null;
  display_name: string;
  organization_name: string;
  organization_type: string;
  contact_whatsapp: string | null;
  event_types: string;
  reason: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
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

type OverviewCreatorRow = EventCreatorRow & {
  submission_count: number;
  latest_submission_status: string | null;
  latest_submission_created_at: string | null;
  latest_submission_reason: string | null;
  event_count: number;
  published_event_count: number;
  inactive_event_count: number;
  cancelled_event_count: number;
  message_threads: number;
  unread_messages: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
  last_event_at: string | null;
};

type OverviewEventRow = EventRow & {
  creator_email: string | null;
  creator_display_name: string | null;
  creator_status: string | null;
  message_threads: number;
  unread_messages: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
  last_message_at: string | null;
  purchase_count: number;
};

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function serializeEventRow(row: EventRow) {
  return {
    ...row,
    ticket_price: row.ticket_price === null || row.ticket_price === undefined ? null : Number(row.ticket_price),
    spec_values: parseJsonObject(row.spec_values),
  };
}

function addDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEventCreatorStatus(value: string): value is "approved" | "suspended" {
  return value === "approved" || value === "suspended";
}

function isEventStatus(value: string): value is "published" | "inactive" | "cancelled" {
  return value === "published" || value === "inactive" || value === "cancelled";
}

function ensureAdminEventSchema(db: PgCompatDatabase) {
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

function loadEventMessageSummaries(db: PgCompatDatabase) {
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
        GROUP BY c.event_id
      `
    )
    .all() as EventMessageSummaryRow[];
}

function loadEventActivitySummaries(db: PgCompatDatabase) {
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
        WHERE e.deleted_at IS NULL
        GROUP BY e.id
      `
    )
    .all() as EventActivitySummaryRow[];
}

function loadCreatorsOverview(db: PgCompatDatabase): OverviewCreatorRow[] {
  const creators = db.prepare(`SELECT * FROM event_creators ORDER BY updated_at DESC, created_at DESC`).all() as EventCreatorRow[];
  const applications = db.prepare(`SELECT * FROM event_creator_applications ORDER BY created_at DESC, id DESC`).all() as EventCreatorApplicationRow[];
  const events = db.prepare(`SELECT * FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC`).all() as EventRow[];
  const messageSummaries = loadEventMessageSummaries(db);
  const activitySummaries = loadEventActivitySummaries(db);

  const messageMap = new Map(messageSummaries.map((row) => [row.event_id, row]));
  const activityMap = new Map(activitySummaries.map((row) => [row.event_id, row]));
  const latestApplicationsByUid = new Map<string, EventCreatorApplicationRow>();
  for (const application of applications) {
    if (!latestApplicationsByUid.has(application.applicant_uid)) {
      latestApplicationsByUid.set(application.applicant_uid, application);
    }
  }

  const aggregates = new Map<
    string,
    {
      event_count: number;
      published_event_count: number;
      inactive_event_count: number;
      cancelled_event_count: number;
      message_threads: number;
      unread_messages: number;
      cart_adds: number;
      ticket_clicks: number;
      last_activity_at: string | null;
      last_event_at: string | null;
    }
  >();

  for (const event of events) {
    if (!event.creator_uid) continue;
    const message = messageMap.get(event.id);
    const activity = activityMap.get(event.id);
    const current = aggregates.get(event.creator_uid) ?? {
      event_count: 0,
      published_event_count: 0,
      inactive_event_count: 0,
      cancelled_event_count: 0,
      message_threads: 0,
      unread_messages: 0,
      cart_adds: 0,
      ticket_clicks: 0,
      last_activity_at: null,
      last_event_at: null,
    };

    current.event_count += 1;
    if (event.status === "published") current.published_event_count += 1;
    if (event.status === "inactive") current.inactive_event_count += 1;
    if (event.status === "cancelled") current.cancelled_event_count += 1;
    current.message_threads += Number(message?.message_threads ?? 0);
    current.unread_messages += Number(message?.unread_messages ?? 0);
    current.cart_adds += Number(activity?.cart_adds ?? 0);
    current.ticket_clicks += Number(activity?.ticket_clicks ?? 0);
    current.last_activity_at = current.last_activity_at ?? activity?.last_activity_at ?? message?.last_message_at ?? null;
    current.last_event_at = current.last_event_at ?? event.updated_at ?? event.created_at ?? null;

    aggregates.set(event.creator_uid, current);
  }

  return creators.map((creator) => {
    const aggregate = aggregates.get(creator.uid) ?? {
      event_count: 0,
      published_event_count: 0,
      inactive_event_count: 0,
      cancelled_event_count: 0,
      message_threads: 0,
      unread_messages: 0,
      cart_adds: 0,
      ticket_clicks: 0,
      last_activity_at: null,
      last_event_at: null,
    };
    const latestApplication = latestApplicationsByUid.get(creator.uid) ?? null;
    const submissionsForCreator = applications.filter((application) => application.applicant_uid === creator.uid);

    return {
      ...creator,
      submission_count: submissionsForCreator.length,
      latest_submission_status: latestApplication?.status ?? null,
      latest_submission_created_at: latestApplication?.created_at ?? null,
      latest_submission_reason: latestApplication?.reason ?? null,
      event_count: aggregate.event_count,
      published_event_count: aggregate.published_event_count,
      inactive_event_count: aggregate.inactive_event_count,
      cancelled_event_count: aggregate.cancelled_event_count,
      message_threads: aggregate.message_threads,
      unread_messages: aggregate.unread_messages,
      cart_adds: aggregate.cart_adds,
      ticket_clicks: aggregate.ticket_clicks,
      last_activity_at: aggregate.last_activity_at,
      last_event_at: aggregate.last_event_at,
    };
  });
}

function loadEventsOverview(db: PgCompatDatabase): OverviewEventRow[] {
  const events = db.prepare(`SELECT * FROM events WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC`).all() as EventRow[];
  const creators = db.prepare(`SELECT uid, email, display_name, status FROM event_creators`).all() as Array<{
    uid: string;
    email: string;
    display_name: string;
    status: string;
  }>;
  const creatorMap = new Map(creators.map((row) => [row.uid, row]));
  const messageSummaries = loadEventMessageSummaries(db);
  const activitySummaries = loadEventActivitySummaries(db);
  const messageMap = new Map(messageSummaries.map((row) => [row.event_id, row]));
  const activityMap = new Map(activitySummaries.map((row) => [row.event_id, row]));

  return events.map((event) => {
    const creator = event.creator_uid ? creatorMap.get(event.creator_uid) ?? null : null;
    const message = messageMap.get(event.id);
    const activity = activityMap.get(event.id);

    return {
      ...event,
      creator_email: creator?.email ?? null,
      creator_display_name: creator?.display_name ?? null,
      creator_status: creator?.status ?? null,
      message_threads: Number(message?.message_threads ?? 0),
      unread_messages: Number(message?.unread_messages ?? 0),
      cart_adds: Number(activity?.cart_adds ?? 0),
      ticket_clicks: Number(activity?.ticket_clicks ?? 0),
      last_activity_at: activity?.last_activity_at ?? message?.last_message_at ?? null,
      last_message_at: message?.last_message_at ?? null,
      purchase_count: 0,
    };
  });
}

function safeLoadPurchaseRecords(db: PgCompatDatabase, event: EventRow) {
  const purchaseRecords: Array<Record<string, unknown>> = [];
  try {
    const rows = db
      .prepare(
        `
          SELECT
            o.id,
            o.buyer_id,
            o.seller_id,
            o.source,
            o.status,
            o.currency,
            o.total_amount,
            o.total_currency,
            o.paid_at,
            o.fulfilled_at,
            o.created_at,
            o.updated_at,
            o.items,
            p.provider,
            p.status AS payment_status,
            p.reference AS payment_reference
          FROM orders o
          LEFT JOIN payments p ON p.order_id = o.id
          WHERE o.items LIKE ?
             OR o.items LIKE ?
             OR o.items LIKE ?
          ORDER BY o.created_at DESC
          LIMIT 50
        `
      )
      .all(`%\"eventId\":${event.id}%`, `%\"event_id\":${event.id}%`, `%${event.event_title}%`) as Array<Record<string, unknown>>;

    purchaseRecords.push(...rows);
  } catch {
    // Some deployments may not have order/payment tables for event tickets yet.
  }
  return purchaseRecords;
}

async function notifyCancelledEventTicketHolders(db: PgCompatDatabase, event: EventRow, reason: string): Promise<void> {
  const rows = db
    .prepare(
      `
        SELECT id, ticket_type, holder_name, holder_email
        FROM event_tickets
        WHERE event_id = ?
          AND TRIM(COALESCE(holder_email, '')) <> ''
          AND status NOT IN ('Cancelled', 'Refunded')
        ORDER BY holder_email ASC, id ASC
      `
    )
    .all(event.id) as Array<{
      id: string;
      ticket_type: string;
      holder_name: string | null;
      holder_email: string | null;
    }>;

  const recipients = new Map<string, { email: string; recipientName: string; tickets: Array<{ ticketId: string; ticketType: string }> }>();
  for (const row of rows) {
    const email = normalizeString(row.holder_email).toLowerCase();
    if (!email) continue;
    const existing = recipients.get(email) ?? {
      email,
      recipientName: normalizeString(row.holder_name) || "there",
      tickets: [],
    };
    existing.tickets.push({ ticketId: String(row.id), ticketType: normalizeString(row.ticket_type) || "Event Ticket" });
    recipients.set(email, existing);
  }

  for (const recipient of recipients.values()) {
    try {
      await notifyEventCancelled({
        email: recipient.email,
        recipientName: recipient.recipientName,
        eventId: String(event.id),
        eventTitle: event.event_title,
        eventDate: event.event_date,
        startTime: event.start_time,
        venue: event.venue,
        location: event.location,
        reason: reason || null,
        tickets: recipient.tickets,
      });
    } catch (error) {
      console.warn("[notification] event cancellation email delivery failed", {
        eventId: event.id,
        email: recipient.email,
        error,
      });
    }
  }
}

export function createAdminEventModerationRouter(params: {
  requireAuth: RequestHandler;
  db: PgCompatDatabase;
  logAdminAction: LogAdminAction;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db, logAdminAction } = params;

  ensureAdminEventSchema(db);

  router.get("/events/overview", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const creators = loadCreatorsOverview(db);
      const events = loadEventsOverview(db);
      const submissions = db
        .prepare(`SELECT * FROM event_creator_applications ORDER BY created_at DESC, id DESC`)
        .all() as EventCreatorApplicationRow[];

      const summary = {
        creatorCount: creators.length,
        suspendedCreatorCount: creators.filter((row) => row.status === "suspended").length,
        submissionCount: submissions.length,
        eventCount: events.length,
        publishedEventCount: events.filter((row) => row.status === "published").length,
        inactiveEventCount: events.filter((row) => row.status === "inactive").length,
        cancelledEventCount: events.filter((row) => row.status === "cancelled").length,
        totalMessageThreads: events.reduce((sum, row) => sum + Number(row.message_threads || 0), 0),
        totalUnreadMessages: events.reduce((sum, row) => sum + Number(row.unread_messages || 0), 0),
        totalCartAdds: events.reduce((sum, row) => sum + Number(row.cart_adds || 0), 0),
        totalTicketClicks: events.reduce((sum, row) => sum + Number(row.ticket_clicks || 0), 0),
      };

      return res.json({ creators, events, submissions, summary });
    } catch (error) {
      console.error("Admin event moderation overview fetch error:", error);
      return res.status(500).json({ error: "Failed to load event moderation overview" });
    }
  });

  router.patch("/events/creators/:uid/status", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const uid = normalizeString(req.params.uid);
    const status = normalizeString(req.body?.status).toLowerCase();
    const note = normalizeString(req.body?.note);

    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }

    if (!isEventCreatorStatus(status)) {
      return res.status(400).json({ error: "status must be approved or suspended" });
    }

    try {
      const creator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid) as EventCreatorRow | undefined;
      if (!creator) {
        return res.status(404).json({ error: "Event creator not found" });
      }

      const now = new Date().toISOString();
      const activeUntil = status === "approved" ? addDaysIso(30) : null;
      db.prepare(
        `
          UPDATE event_creators
          SET status = ?,
              active_until = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE uid = ?
        `
      ).run(status, activeUntil, uid);

      if (status === "suspended") {
        db.prepare(
          `
            UPDATE events
            SET status = 'inactive',
                updated_at = CURRENT_TIMESTAMP
            WHERE creator_uid = ?
              AND deleted_at IS NULL
              AND status = 'published'
          `
        ).run(uid);
      }

      logAdminAction({
        admin_uid: req.user?.uid ?? null,
        admin_email: req.user?.email ?? null,
        action_type: status === "suspended" ? ADMIN_ACTION_TYPES.SUSPEND_EVENT_CREATOR : ADMIN_ACTION_TYPES.UNSUSPEND_EVENT_CREATOR,
        target_type: ADMIN_TARGET_TYPES.EVENT_CREATOR,
        target_id: uid,
        details: {
          status,
          note: note || null,
          active_until: activeUntil,
          updated_at: now,
        },
      });

      const updatedCreator = db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(uid) as EventCreatorRow | undefined;
      return res.json({ success: true, creator: updatedCreator ?? null });
    } catch (error) {
      console.error("Admin event creator status update error:", error);
      return res.status(500).json({ error: "Failed to update event creator status" });
    }
  });

  router.patch("/events/:id/status", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const eventId = Number(req.params.id);
    const status = normalizeString(req.body?.status).toLowerCase();
    const reason = normalizeString(req.body?.reason);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    if (!isEventStatus(status)) {
      return res.status(400).json({ error: "status must be published, inactive, or cancelled" });
    }

    try {
      const event = db.prepare(`SELECT * FROM events WHERE id = ? AND deleted_at IS NULL LIMIT 1`).get(eventId) as EventRow | undefined;
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const wasCancelled = event.status === "cancelled";

      db.prepare(
        `
          UPDATE events
          SET status = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      ).run(status, eventId);

      const actionType =
        status === "published"
          ? ADMIN_ACTION_TYPES.PUBLISH_EVENT
          : status === "inactive"
            ? ADMIN_ACTION_TYPES.HIDE_EVENT
            : ADMIN_ACTION_TYPES.CANCEL_EVENT;

      logAdminAction({
        admin_uid: req.user?.uid ?? null,
        admin_email: req.user?.email ?? null,
        action_type: actionType,
        target_type: ADMIN_TARGET_TYPES.EVENT,
        target_id: String(eventId),
        details: {
          status,
          reason: reason || null,
          creator_uid: event.creator_uid,
        },
      });

      if (status === "cancelled" && !wasCancelled) {
        void notifyCancelledEventTicketHolders(db, event, reason);
      }

      const updatedEvent = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as EventRow | undefined;
      return res.json({ success: true, event: updatedEvent ? serializeEventRow(updatedEvent) : null });
    } catch (error) {
      console.error("Admin event status update error:", error);
      return res.status(500).json({ error: "Failed to update event status" });
    }
  });

  router.delete("/events/:id", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const eventId = Number(req.params.id);
    const reason = normalizeString(req.body?.reason);

    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    try {
      const event = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as EventRow | undefined;
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const now = new Date().toISOString();
      db.prepare(
        `
          UPDATE events
          SET deleted_at = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `
      ).run(now, eventId);

      logAdminAction({
        admin_uid: req.user?.uid ?? null,
        admin_email: req.user?.email ?? null,
        action_type: ADMIN_ACTION_TYPES.DELETE_EVENT,
        target_type: ADMIN_TARGET_TYPES.EVENT,
        target_id: String(eventId),
        details: {
          reason: reason || null,
          creator_uid: event.creator_uid,
        },
      });

      return res.json({ success: true, deleted_at: now });
    } catch (error) {
      console.error("Admin event delete error:", error);
      return res.status(500).json({ error: "Failed to delete event" });
    }
  });

  router.get("/events/:id/records", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    try {
      const event = db.prepare(`SELECT * FROM events WHERE id = ? LIMIT 1`).get(eventId) as EventRow | undefined;
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      const creator = event.creator_uid
        ? (db.prepare(`SELECT * FROM event_creators WHERE uid = ? LIMIT 1`).get(event.creator_uid) as EventCreatorRow | undefined)
        : null;
      const activities = db
        .prepare(
          `
            SELECT id, event_id, actor_uid, activity_type, metadata, created_at
            FROM event_activity
            WHERE event_id = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 100
          `
        )
        .all(eventId) as Array<Record<string, unknown>>;
      const conversations = db
        .prepare(
          `
            SELECT
              id,
              buyer_uid,
              seller_uid,
              listing_id,
              event_id,
              last_message_preview,
              buyer_unread_count,
              seller_unread_count,
              created_at,
              updated_at,
              last_message_at
            FROM conversations
            WHERE event_id = ?
            ORDER BY updated_at DESC, id DESC
            LIMIT 100
          `
        )
        .all(eventId) as Array<Record<string, unknown>>;

      const purchaseRecords = safeLoadPurchaseRecords(db, event);

      return res.json({
        event: {
          ...serializeEventRow(event),
        },
        creator,
        activities: activities.map((activity) => ({
          ...activity,
          metadata: parseJsonObject(String(activity.metadata ?? "")),
        })),
        conversations,
        purchaseRecords,
      });
    } catch (error) {
      console.error("Admin event records fetch error:", error);
      return res.status(500).json({ error: "Failed to load event records" });
    }
  });

  return router;
}