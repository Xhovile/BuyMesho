import type { Express, NextFunction, Request, Response } from "express";
import { getFirebaseAdmin } from "./firebaseAdmin.js";
import { revokeTotpVerifiedSessions } from "../../src/server/totpStore.js";

type VerifiedRequestUser = {
  uid: string;
  email: string | null;
  email_verified: boolean;
  is_admin: boolean;
};

const ROUTES_INSTALLED_FLAG = Symbol.for("buymesho.sessionRoutesInstalled");

function verifyBearerIdentity(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Missing Authorization Bearer token" });
  }

  void (async () => {
    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token.trim(), true);
      req.user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        email_verified: (decoded as any).email_verified === true,
        is_admin: (decoded as any).admin === true || (decoded as any).role === "admin",
      } as VerifiedRequestUser;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  })();
}

async function revokeSessionsHandler(req: Request, res: Response) {
  const user = req.user as VerifiedRequestUser | undefined;
  if (!user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const admin = getFirebaseAdmin();
    await admin.auth().revokeRefreshTokens(user.uid);
    revokeTotpVerifiedSessions(user.uid);

    return res.json({
      success: true,
      message: "All sessions have been revoked.",
    });
  } catch (error) {
    console.error("Failed to revoke sessions:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to revoke sessions",
    });
  }
}

export function registerSessionRoutes(app: Express) {
  if ((app as any)[ROUTES_INSTALLED_FLAG]) return;

  app.post("/api/auth/revoke-sessions", verifyBearerIdentity, revokeSessionsHandler);

  (app as any)[ROUTES_INSTALLED_FLAG] = true;
}
