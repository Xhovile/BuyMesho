import type { PgCompatDatabase } from "../../db.js";
import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "./admin.rateLimit.js";

type AdminActionRow = {
  id: number;
  admin_uid: string | null;
  admin_email: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: string | null;
  created_at: string;
};

type AdminActionsCursor = {
  createdAt: string;
  id: number | null;
};

function parseCursorId(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseAdminActionsCursor(cursor: unknown, cursorId: unknown): AdminActionsCursor | null {
  if (typeof cursor !== "string" || !cursor.trim()) return null;

  const trimmedCursor = cursor.trim();
  const explicitCursorId = parseCursorId(cursorId);
  if (explicitCursorId !== null) {
    return { createdAt: trimmedCursor, id: explicitCursorId };
  }

  const separatorIndex = trimmedCursor.lastIndexOf("|");
  if (separatorIndex > -1) {
    const createdAt = trimmedCursor.slice(0, separatorIndex).trim();
    const inlineCursorId = parseCursorId(trimmedCursor.slice(separatorIndex + 1));
    if (createdAt && inlineCursorId !== null) {
      return { createdAt, id: inlineCursorId };
    }
  }

  return { createdAt: trimmedCursor, id: null };
}

function encodeAdminActionsCursor(row: AdminActionRow): string {
  return `${row.created_at}|${row.id}`;
}

export function createAdminActionsRouter(params: {
  requireAuth: RequestHandler;
  db: PgCompatDatabase;
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
        cursor_id,
      } = req.query;

      const parsedCursor = parseAdminActionsCursor(cursor, cursor_id);

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

      if (parsedCursor) {
        if (parsedCursor.id !== null) {
          whereClauses.push("(created_at < ? OR (created_at = ? AND id < ?))");
          queryParams.push(parsedCursor.createdAt, parsedCursor.createdAt, parsedCursor.id);
        } else {
          whereClauses.push("created_at < ?");
          queryParams.push(parsedCursor.createdAt);
        }
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
      const paginationSql = parsedCursor ? "LIMIT ?" : "LIMIT ? OFFSET ?";
      const paginationParams = parsedCursor ? [limit] : [limit, offset];

      const sql = `SELECT id, admin_uid, admin_email, action_type, target_type, target_id, details, created_at
                   FROM admin_actions
                   ${whereSql}
                   ORDER BY created_at DESC, id DESC
                   ${paginationSql}`;

      const rows = db.prepare(sql).all(...queryParams, ...paginationParams) as AdminActionRow[];
      const totalRow = db
        .prepare(
          `SELECT COUNT(*) AS total
           FROM admin_actions
           ${whereSql}`
        )
        .get(...queryParams) as { total: number } | undefined;
      const total = Number(totalRow?.total ?? 0);

      const normalizedRows = rows.map((row) => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : null,
      }));
      const hasMore = parsedCursor
        ? normalizedRows.length === limit
        : offset + normalizedRows.length < total;
      const lastRow = rows.at(-1);
      const nextCursor = hasMore && lastRow ? encodeAdminActionsCursor(lastRow) : null;

      return res.json(
        {
          rows: normalizedRows,
          total,
          limit,
          offset,
          hasMore,
          nextCursor,
        }
      );
    } catch (error) {
      console.error("Admin actions fetch error:", error);
      return res.status(500).json({ error: "Failed to load admin actions" });
    }
  });

  return router;
}
