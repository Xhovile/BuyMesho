import type Database from "better-sqlite3";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "./admin.rateLimit.js";

export function createAdminActionsRouter(params: {
  requireAuth: RequestHandler;
  db: Database.Database;
}): express.Router {
  const router = express.Router();
  const { requireAuth, db } = params;

  router.get("/actions", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    try {
      const {
        action_type,
        target_type,
        admin,
        from,
        to,
        q,
        limit: rawLimit,
        offset: rawOffset,
        cursor,
      } = req.query;

      const whereClauses: string[] = [];
      const queryParams: unknown[] = [];

      if (typeof action_type === "string" && action_type.trim()) {
        whereClauses.push("action_type = ?");
        queryParams.push(action_type.trim());
      }

      if (typeof target_type === "string" && target_type.trim()) {
        whereClauses.push("target_type = ?");
        queryParams.push(target_type.trim());
      }

      if (typeof admin === "string" && admin.trim()) {
        whereClauses.push("(admin_email = ? OR admin_uid = ?)");
        const adminValue = admin.trim();
        queryParams.push(adminValue, adminValue);
      }

      if (typeof from === "string" && from.trim()) {
        whereClauses.push("created_at >= ?");
        queryParams.push(from.trim());
      }

      if (typeof to === "string" && to.trim()) {
        whereClauses.push("created_at <= ?");
        queryParams.push(to.trim());
      }

      if (typeof q === "string" && q.trim()) {
        whereClauses.push(
          "(target_id LIKE ? OR admin_email LIKE ? OR COALESCE(details, '') LIKE ?)"
        );
        const searchTerm = `%${q.trim()}%`;
        queryParams.push(searchTerm, searchTerm, searchTerm);
      }

      if (typeof cursor === "string" && cursor.trim()) {
        whereClauses.push("created_at < ?");
        queryParams.push(cursor.trim());
      }

      const DEFAULT_LIMIT = 100;
      const MAX_LIMIT = 500;
      const parsedLimit = Number.parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10);
      const limit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
        : DEFAULT_LIMIT;

      const parsedOffset = Number.parseInt(String(rawOffset ?? 0), 10);
      const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
      const paginationSql =
        typeof cursor === "string" && cursor.trim() ? "LIMIT ?" : "LIMIT ? OFFSET ?";
      const paginationParams =
        typeof cursor === "string" && cursor.trim() ? [limit] : [limit, offset];

      const sql = `SELECT id, admin_uid, admin_email, action_type, target_type, target_id, details, created_at
                   FROM admin_actions
                   ${whereSql}
                   ORDER BY created_at DESC
                   ${paginationSql}`;

      const rows = db.prepare(sql).all(...queryParams, ...paginationParams);

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
