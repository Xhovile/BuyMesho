import type { RequestHandler } from "express";
import express from "express";

import { postgresDb } from "../db.js";
import {
  assertUsableEventCreatorPayoutDestination,
  listEventCreatorPayoutDestinations,
} from "../modules/payouts/event-creator-payout-destinations.js";

export function createEventPayoutProtectionRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get("/events/:id/payout-destination", requireAuth, (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });

    try {
      const event = postgresDb.prepare(`
        SELECT id, creator_uid, payout_destination_id, payout_destination_locked_at, payout_destination_locked_by, payout_destination_lock_reason
        FROM events
        WHERE id = ? AND deleted_at IS NULL
        LIMIT 1
      `).get(eventId) as {
        id: number;
        creator_uid: string | null;
        payout_destination_id: string | null;
        payout_destination_locked_at: string | null;
        payout_destination_locked_by: string | null;
        payout_destination_lock_reason: string | null;
      } | undefined;

      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.creator_uid !== req.user!.uid) return res.status(403).json({ error: "Only the event creator can view this payout setting" });

      const locked = Boolean(event.payout_destination_locked_at);
      return res.json({
        eventId,
        payoutDestinationId: event.payout_destination_id,
        locked,
        lockedAt: event.payout_destination_locked_at,
        lockReason: event.payout_destination_lock_reason,
        canChange: !locked,
        destinations: listEventCreatorPayoutDestinations(req.user!.uid),
      });
    } catch (error) {
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to load event payout protection status" });
    }
  });

  router.post("/events/:id/payout-destination/replace", requireAuth, (req, res) => {
    const eventId = Number(req.params.id);
    if (!Number.isInteger(eventId)) return res.status(400).json({ error: "Invalid event id" });

    const destinationId = typeof req.body?.destinationId === "string" ? req.body.destinationId.trim() : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!destinationId) return res.status(400).json({ error: "A replacement payout destination is required" });
    if (reason.length < 10) return res.status(400).json({ error: "A replacement reason of at least 10 characters is required" });
    if (req.body?.confirmAfterSale !== true) return res.status(400).json({ error: "Explicit after-sale replacement confirmation is required" });

    try {
      const uid = req.user!.uid;
      const event = postgresDb.prepare(`
        SELECT id, creator_uid, payout_destination_id, payout_destination_locked_at
        FROM events
        WHERE id = ? AND deleted_at IS NULL
        LIMIT 1
      `).get(eventId) as {
        id: number;
        creator_uid: string | null;
        payout_destination_id: string | null;
        payout_destination_locked_at: string | null;
      } | undefined;

      if (!event) return res.status(404).json({ error: "Event not found" });
      if (event.creator_uid !== uid) return res.status(403).json({ error: "Only the event creator can replace this payout destination" });
      if (!event.payout_destination_locked_at) return res.status(409).json({ error: "The event payout destination is not locked; use the normal event payout settings flow" });

      const destination = assertUsableEventCreatorPayoutDestination(uid, destinationId);
      if (event.payout_destination_id === destination.id) return res.status(409).json({ error: "The replacement destination must differ from the current destination" });

      const now = new Date().toISOString();
      postgresDb.transaction(() => {
        postgresDb.prepare(`SELECT set_config('buymesho.allow_event_payout_replacement', '1', true)`).get();
        postgresDb.prepare(`
          UPDATE events
          SET payout_destination_id = ?,
              payout_destination_locked_at = COALESCE(payout_destination_locked_at, ?),
              payout_destination_locked_by = COALESCE(payout_destination_locked_by, ?),
              payout_destination_lock_reason = COALESCE(payout_destination_lock_reason, 'first_successful_sale'),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND creator_uid = ?
        `).run(destination.id, now, uid, eventId, uid);
        postgresDb.prepare(`
          INSERT INTO event_activity (event_id, actor_uid, activity_type, metadata, created_at)
          VALUES (?, ?, 'payout_destination_replaced_after_sale', ?, ?)
        `).run(eventId, uid, JSON.stringify({ replacedFromId: event.payout_destination_id, replacedToId: destination.id, reason }), now);
      })();

      return res.status(200).json({
        success: true,
        eventId,
        payoutDestinationId: destination.id,
        locked: true,
        lockReason: 'first_successful_sale',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to replace event payout destination";
      const status = /locked after the first successful/i.test(message) ? 409 : /not found|inactive|not verified|usable/i.test(message) ? 400 : 500;
      return res.status(status).json({ error: message });
    }
  });

  return router;
}
