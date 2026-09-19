import type { Express, RequestHandler } from "express";
import { getEventFinancialReport } from "../modules/events/eventFinancialReporting.js";

export function registerEventFinancialReportingRoutes(
  app: Express,
  deps: { db: any; requireAuth: RequestHandler },
) {
  app.get("/api/event-creator/events/:eventId/financial", deps.requireAuth, (req, res) => {
    try {
      const uid = String(req.user?.uid ?? "").trim();
      const eventId = String(req.params.eventId ?? "").trim();
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      if (!/^\d+$/.test(eventId)) return res.status(400).json({ error: "Invalid event id" });

      const ownership = deps.db.prepare(
        `SELECT id, creator_uid
         FROM events
         WHERE id = ?
         LIMIT 1`,
      ).get(eventId) as { id?: unknown; creator_uid?: unknown } | undefined;

      if (!ownership || String(ownership.creator_uid ?? "") !== uid) {
        return res.status(404).json({ error: "Event financial report not found" });
      }

      const report = getEventFinancialReport(deps.db, eventId);
      if (!report) return res.status(404).json({ error: "Event financial report not found" });

      return res.status(200).json(report);
    } catch (error) {
      console.error("Failed to load event financial report", error);
      return res.status(500).json({ error: "Failed to load event financial report" });
    }
  });
}
