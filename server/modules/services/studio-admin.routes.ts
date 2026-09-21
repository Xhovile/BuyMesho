import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "../admin/admin.rateLimit.js";
import { getStudioAdminSnapshot } from "./studio-admin.repository.js";

export function createXhovileStudioAdminRouter(
  requireAuth: RequestHandler,
): express.Router {
  const router = express.Router();

  router.get("/", adminApiLimiter, requireAuth, async (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    const rawLimit = Number(req.query.limit ?? 100);
    const limit = Number.isFinite(rawLimit) ? rawLimit : 100;

    try {
      const snapshot = await getStudioAdminSnapshot(limit);
      res.setHeader("Cache-Control", "no-store");
      return res.json({
        success: true,
        ...snapshot,
      });
    } catch (error) {
      console.error("[XhovileStudio] Admin snapshot failed:", error);
      return res.status(500).json({
        error: "Failed to load Xhovilé Studio admin data",
      });
    }
  });

  return router;
}
