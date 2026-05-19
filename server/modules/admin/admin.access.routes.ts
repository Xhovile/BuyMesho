import express, { type RequestHandler } from "express";
import { hasAdminAccess } from "../../auth/adminAccess.js";

export function createAdminAccessRouter(requireAuth: RequestHandler): express.Router {
  const router = express.Router();

  router.get("/access", requireAuth, (req, res) => {
    if (!hasAdminAccess(req.user)) {
      return res.status(403).json({ error: "Forbidden: admin access required" });
    }

    return res.json({ isAdmin: true });
  });

  return router;
}
