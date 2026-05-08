import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "../auth/firebaseAdmin.js";
import { getTotpEnrollment, verifyTotpVerifiedSession } from "../../src/server/totpStore.js";

const ADMIN_ENV_EMAILS = (
  process.env.ADMIN_EMAILS ||
  process.env.VITE_ADMIN_EMAILS ||
  ""
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_ENV_UIDS = (
  process.env.ADMIN_UIDS ||
  process.env.VITE_ADMIN_UIDS ||
  ""
)
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);

function isEnvAdmin(uid: string | undefined, email: string | undefined): boolean {
  if (uid && ADMIN_ENV_UIDS.includes(uid)) return true;
  if (email && ADMIN_ENV_EMAILS.includes(email.toLowerCase())) return true;
  return false;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token.trim();
}

function getTotpSessionToken(req: Request): string | null {
  const header = req.headers["x-buymesho-totp-session"];
  if (Array.isArray(header)) return header[0]?.trim() || null;
  if (typeof header === "string") return header.trim() || null;
  return null;
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
    const totpSessionToken = getTotpSessionToken(req);
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
        isEnvAdmin(uid, email),
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
    const totpSessionToken = getTotpSessionToken(req);
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
        isEnvAdmin(uid, email),
    };
  } catch {
    // Ignore optional auth failures and continue unauthenticated.
  }

  return next();
}
