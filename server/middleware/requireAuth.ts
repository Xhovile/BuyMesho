import type { Request, Response, NextFunction } from "express";
import { getTotpEnrollment, verifyTotpVerifiedSession } from "../../src/server/totpStoreCompat.js";
import { readTotpSessionCookie } from "../auth/totpSessionCookie.js";
import { resolveCanonicalIdentity } from "../auth/canonicalAuth.js";

function shouldRequireAdminStepUp(req: Request) {
  const baseUrl = String(req.baseUrl || "");
  const isAdminRoute = baseUrl === "/api/admin" || baseUrl.startsWith("/api/admin/");
  return isAdminRoute && !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
}

export async function requireTotpVerification(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: "Invalid or missing authentication token" });
  }

  try {
    const enrollment = getTotpEnrollment(user.uid);
    const totpEnabled = enrollment?.status === "enabled";
    if (!totpEnabled) return next();

    const totpSessionToken = readTotpSessionCookie(req);
    const totpVerified =
      !!totpSessionToken && verifyTotpVerifiedSession(user.uid, totpSessionToken);

    if (!totpVerified) {
      return res.status(401).json({
        error: "Two-factor verification required",
        code: "TOTP_STEP_UP_REQUIRED",
      });
    }

    return next();
  } catch {
    return res.status(401).json({ error: "Unable to verify two-factor authentication" });
  }
}

export async function requireStepUpAuth(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, async () => requireTotpVerification(req, res, next));
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await resolveCanonicalIdentity(req);
    if (!user) {
      return res.status(401).json({ error: "Invalid or missing authentication token" });
    }

    req.user = user;

    // Ordinary authenticated access no longer expires when the 15-minute
    // step-up TOTP session expires. Admin mutations remain step-up protected.
    if (shouldRequireAdminStepUp(req)) {
      return requireTotpVerification(req, res, next);
    }

    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export async function attachOptionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await resolveCanonicalIdentity(req);
    if (!user) return next();

    req.user = user;
    return next();
  } catch {
    return next();
  }
}
