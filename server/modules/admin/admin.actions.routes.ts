import type Database from "better-sqlite3";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";

export function createAdminActionsRouter(params: {
  requireAuth: RequestHandler;
  db: Database.Database;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  router.get("/actions", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const rows = db
        .prepare(
          `SELECT id, admin_uid, admin_email, action_type, target_type, target_id, details, created_at
           FROM admin_actions
           ORDER BY created_at DESC
           LIMIT 100`
        )
        .all();

      return res.json(
        rows.map((row: any) => ({
          ...row,
          details: row.details ? JSON.parse(row.details) : null,
        }))
      );
    } catch (error) {
      console.error("Admin actions fetch error:", error);
      return res.status(500).json({ error: "Failed to load admin actions" });
    }
  });

  return router;
}
