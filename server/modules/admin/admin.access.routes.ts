import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";
import { adminApiLimiter } from "./admin.rateLimit.js";
import { postgresDb as db } from "../../db.js";
import { createAdminMessagesRouter } from "../../routes/adminMessages.routes.js";

export function createAdminAccessRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get("/access", adminApiLimiter, requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    return res.json({ isAdmin: true });
  });

  router.use(createAdminMessagesRouter({ requireAuth, db }));

  return router;
}
