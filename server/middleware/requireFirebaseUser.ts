import type { NextFunction, Request, Response } from "express";
import { isConfiguredAdmin } from "../auth/adminAccess.js";
import { verifyIdToken } from "../auth/firebaseAdmin.js";

type DecodedFirebaseTokenClaims = {
  uid: string;
  email?: string;
  email_verified?: boolean;
  admin?: boolean;
  role?: string;
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token.trim();
}

export async function requireFirebaseUser(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const decoded = (await verifyIdToken(token, true)) as DecodedFirebaseTokenClaims;
    const uid = decoded.uid;
    const email = decoded.email ?? null;

    req.user = {
      uid,
      email,
      email_verified: decoded.email_verified === true,
      is_admin:
        decoded.admin === true ||
        decoded.role === "admin" ||
        isConfiguredAdmin({ uid, email }),
    };

    return next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown token verification failure";
    console.warn("[auth] requireFirebaseUser token verification failed:", message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
