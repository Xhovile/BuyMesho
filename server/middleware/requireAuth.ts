import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../auth/firebaseAdmin.js";
import { isConfiguredAdmin } from "../auth/adminAccess.js";
import { getTotpEnrollment, verifyTotpVerifiedSession } from "../../src/server/totpStoreCompat.js";
import { readTotpSessionCookie } from "../auth/totpSessionCookie.js";

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

    const decoded = await verifyIdToken(token, true);
    const enrollment = getTotpEnrollment(decoded.uid);
    const totpEnabled = enrollment?.status === "enabled";
    const totpSessionToken = readTotpSessionCookie(req);
    const totpVerified = !totpEnabled || (!!totpSessionToken && verifyTotpVerifiedSession(decoded.uid, totpSessionToken));

    if (!totpVerified) {
      return res.status(401).json({ error: "Two-factor verification required" });
    }

    const uid = decoded.uid;
    const email = decoded.email ?? undefined;
    req.user = {
      uid,
      email: email ?? null,
      email_verified: (decoded as any).email_verified === true,
      is_admin:
        (decoded as any).admin === true ||
        (decoded as any).role === "admin" ||
        isConfiguredAdmin({ uid, email }),
    };

    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function attachOptionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) return next();

    const decoded = await verifyIdToken(token, true);
    const enrollment = getTotpEnrollment(decoded.uid);
    const totpEnabled = enrollment?.status === "enabled";
    const totpSessionToken = readTotpSessionCookie(req);
    const totpVerified = !totpEnabled || (!!totpSessionToken && verifyTotpVerifiedSession(decoded.uid, totpSessionToken));

    if (!totpVerified) return next();

    const uid = decoded.uid;
    const email = decoded.email ?? undefined;
    req.user = {
      uid,
      email: email ?? null,
      email_verified: (decoded as any).email_verified === true,
      is_admin:
        (decoded as any).admin === true ||
        (decoded as any).role === "admin" ||
        isConfiguredAdmin({ uid, email }),
    };

    next();
  } catch {
    return next();
  }
}
