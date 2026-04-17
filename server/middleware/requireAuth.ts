import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../auth/firebaseAdmin.js";
function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token.trim();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const decoded = await verifyIdToken(token);

    // Attach verified identity to request (server-trusted)
    req.user = {
  uid: decoded.uid,
  email: decoded.email ?? null,
  email_verified: (decoded as any).email_verified === true,
  is_admin: (decoded as any).admin === true || (decoded as any).role === "admin",
};

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
