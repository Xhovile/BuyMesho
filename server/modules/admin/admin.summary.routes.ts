import type Database from "better-sqlite3";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";

export function createAdminSummaryRouter(params: {
  requireAuth: RequestHandler;
  db: Database.Database;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  router.get("/summary", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const contentOpenRow = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'open'").get() as { count: number } | undefined;
      const messageOpenRow = db.prepare("SELECT COUNT(*) as count FROM message_reports WHERE status = 'open'").get() as { count: number } | undefined;
      const sellerPendingRow = db.prepare("SELECT COUNT(*) as count FROM seller_applications WHERE status = 'pending'").get() as { count: number } | undefined;

      return res.json({
        contentOpen: Number(contentOpenRow?.count ?? 0),
        messageOpen: Number(messageOpenRow?.count ?? 0),
        sellerPending: Number(sellerPendingRow?.count ?? 0),
      });
    } catch (error) {
      console.error("Admin summary fetch error:", error);
      return res.status(500).json({ error: "Failed to load admin summary" });
    }
  });

  return router;
}
