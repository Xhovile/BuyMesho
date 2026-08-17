import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { hasAdminAccess } from "./adminAccess.js";
import { getPaymentDb } from "../postgresCompat.js";
import { validatorHandoffHandler, validatorHandoffExchangeHandler } from "../auth/validatorHandoff.js";

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

type ValidatorAccessScope = {
  can_validate_tickets: boolean;
  is_admin: boolean;
  role: "admin" | "validator";
  source: "buymesho";
  allowed_event_ids: string[];
  snapshot_version: string | null;
};

type ValidatorEvent = {
  id: string;
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
  spec_values: Record<string, unknown>;
  status: string;
  publication_status: "draft" | "published" | "paused" | "cancelled";
  publication_mode: "immediate" | "scheduled";
  publication_at: string | null;
  runtime_mode: "automatic" | "force_live" | "force_upcoming";
  created_at: string;
  updated_at: string;
  version: string;
  ticket_count: number;
  tickets_sold: number;
  tickets_checked_in: number;
  tickets_remaining: number;
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

function safeParseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isEventCreatorActive(row: EventCreatorRow | undefined) {
  if (!row || row.status !== "approved") return false;
  if (!row.active_until) return true;
  return new Date(row.active_until).getTime() >= Date.now();
}

function loadCreatorRecord(uid: string) {
  return getPaymentDb()
    .prepare("SELECT * FROM event_creators WHERE uid = ? LIMIT 1")
    .get(uid) as EventCreatorRow | undefined;
}

function loadValidatorEvents(uid: string): ValidatorEvent[] {
  const db = getPaymentDb();
  const rows = db
    .prepare(`
      SELECT
        e.*,
        COALESCE(s.tickets_sold, 0) AS tickets_sold,
        COALESCE(s.tickets_checked_in, 0) AS tickets_checked_in,
        COALESCE(s.tickets_remaining, 0) AS tickets_remaining,
        COALESCE(s.tickets_sold, 0) AS ticket_count
      FROM events e
      LEFT JOIN event_ticket_stats s ON s.event_id = e.id
      WHERE e.creator_uid = ?
        AND e.deleted_at IS NULL
      ORDER BY e.updated_at DESC, e.created_at DESC, e.id DESC
    `)
    .all(uid) as Array<Record<string, unknown>>;

  return rows.map((row) => ({
    id: String(row.id),
    creator_uid: (row.creator_uid as string | null) ?? null,
    event_type: String(row.event_type ?? ""),
    event_title: String(row.event_title ?? ""),
    organizer_name: String(row.organizer_name ?? ""),
    event_date: String(row.event_date ?? ""),
    start_time: String(row.start_time ?? ""),
    end_time: (row.end_time as string | null) ?? null,
    venue: String(row.venue ?? ""),
    location: String(row.location ?? ""),
    ticket_mode: String(row.ticket_mode ?? ""),
    ticket_price: row.ticket_price == null ? null : Number(row.ticket_price),
    ticket_link: (row.ticket_link as string | null) ?? null,
    description: String(row.description ?? ""),
    contact_whatsapp: (row.contact_whatsapp as string | null) ?? null,
    poster_alt: (row.poster_alt as string | null) ?? null,
    spec_values: safeParseJsonObject(row.spec_values as string | null | undefined),
    status: String(row.status ?? "published"),
    publication_status: (row.publication_status as ValidatorEvent["publication_status"]) ?? "published",
    publication_mode: (row.publication_mode as ValidatorEvent["publication_mode"]) ?? "immediate",
    publication_at: (row.publication_at as string | null) ?? null,
    runtime_mode: (row.runtime_mode as ValidatorEvent["runtime_mode"]) ?? "automatic",
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    version: String(row.updated_at ?? ""),
    ticket_count: Number(row.ticket_count) || 0,
    tickets_sold: Number(row.tickets_sold) || 0,
    tickets_checked_in: Number(row.tickets_checked_in) || 0,
    tickets_remaining: Number(row.tickets_remaining) || 0,
  }));
}

function buildValidatorAccessScope(user: VerifiedRequestUser, events: ValidatorEvent[]): ValidatorAccessScope {
  const isAdmin = hasAdminAccess({
    email: user.email,
    uid: user.uid,
    is_admin: user.is_admin,
  });

  return {
    can_validate_tickets: true,
    is_admin: isAdmin,
    role: isAdmin ? "admin" : "validator",
    source: "buymesho",
    allowed_event_ids: events.map((event) => event.id),
    snapshot_version: events.length > 0 ? events[0].version : null,
  };
}

function validatorMeHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });

  const creator = loadCreatorRecord(user.uid);
  if (!creator || !isEventCreatorActive(creator)) {
    return res.status(403).json({ error: "Approved event creator access is required" });
  }

  const events = loadValidatorEvents(user.uid);

  return res.json({
    success: true,
    identity: {
      uid: user.uid,
      email: user.email,
      email_verified: user.email_verified,
      is_admin: user.is_admin,
      display_name: creator.display_name ?? creator.organization_name ?? null,
    },
    creator: {
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
    },
    access_scope: buildValidatorAccessScope(user, events),
    events,
  });
}

function validatorEventsHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) return res.status(401).json({ error: "Authentication required" });
  if (!isEventCreatorActive(loadCreatorRecord(user.uid))) {
    return res.status(403).json({ error: "Approved event creator access is required" });
  }
  return res.json({ success: true, events: loadValidatorEvents(user.uid) });
}

function validatorSessionHandler(req: Request, res: Response) {
  return validatorHandoffExchangeHandler(req, res);
}

export function registerValidatorRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  // Cross-domain authentication uses a short-lived, single-use handoff code.
  // The Firebase ID token remains inside BuyMesho and never enters a URL.
  app.post("/api/validator/handoff", verifyBearerIdentity, validatorHandoffHandler);
  app.post("/api/validator/session", validatorSessionHandler);
  app.get("/api/validator/me", verifyBearerIdentity, validatorMeHandler);
  app.get("/api/validator/events", verifyBearerIdentity, validatorEventsHandler);

  // Event tickets, Attendees, Scanner, status changes and offline sync are
  // owned by validatorProjection.routes.ts. Keeping them out of this module
  // prevents the legacy order-scanning implementation from competing with the
  // event_tickets projection.
  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
