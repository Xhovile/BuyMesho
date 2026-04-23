import { Router, type Request, type Response } from "express";
import {
  buildOtpAuthUri,
  generateTotpSecret,
  normalizeTotpCode,
  verifyTotpCode,
} from "./totpService";
import {
  confirmTotpEnrollment,
  disableTotpEnrollment,
  getTotpEnrollment,
  getTotpEnrollmentSummary,
  setTotpStatus,
  upsertTotpEnrollment,
} from "./totpStore";
import { getTotpDisplayName, type TotpMfaStatus } from "../lib/totp";

export type AuthUserContext = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
};

export type TotpAuthRoutesDeps = {
  resolveUser: (req: Request) => Promise<AuthUserContext | null> | AuthUserContext | null;
};

type JsonResponse = {
  ok: true;
  data?: unknown;
};

type ErrorResponse = {
  ok: false;
  error: string;
};

function sendOk(res: Response, data?: unknown) {
  return res.json({ ok: true, data } satisfies JsonResponse);
}

function sendError(res: Response, status: number, error: string) {
  return res.status(status).json({ ok: false, error } satisfies ErrorResponse);
}

function requireString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getUserContext(
  req: Request,
  resolveUser: TotpAuthRoutesDeps["resolveUser"]
): Promise<AuthUserContext | null> {
  const resolved = await resolveUser(req);
  return resolved ?? null;
}

export function createTotpAuthRouter(deps: TotpAuthRoutesDeps) {
  const router = Router();

  router.get("/status", async (req, res) => {
    const user = await getUserContext(req, deps.resolveUser);
    if (!user) return sendError(res, 401, "Login required.");

    const summary = getTotpEnrollmentSummary(user.uid);
    return sendOk(res, {
      status: summary?.status ?? ("disabled" satisfies TotpMfaStatus),
      enrolledAt: summary?.enrolledAt ?? null,
      confirmedAt: summary?.confirmedAt ?? null,
      issuer: summary?.issuer ?? null,
      accountName: summary?.accountName ?? getTotpDisplayName(user.displayName ?? null, user.email ?? null),
      hasSecret: !!summary,
    });
  });

  router.post("/enroll/start", async (req, res) => {
    const user = await getUserContext(req, deps.resolveUser);
    if (!user) return sendError(res, 401, "Login required.");

    const accountName = requireString(req.body?.accountName) || getTotpDisplayName(user.displayName ?? null, user.email ?? null);
    const issuer = requireString(req.body?.issuer) || undefined;

    const secret = generateTotpSecret();
    const record = upsertTotpEnrollment({
      userId: user.uid,
      email: user.email ?? null,
      secret,
      issuer,
      accountName,
    });

    const otpauthUri = buildOtpAuthUri({
      issuer: record.issuer,
      accountName: record.accountName,
      secret: record.secret,
    });

    return sendOk(res, {
      status: record.status,
      secret: record.secret,
      otpauthUri,
      issuer: record.issuer,
      accountName: record.accountName,
      enrolledAt: record.enrolledAt,
      confirmedAt: record.confirmedAt,
    });
  });

  router.post("/enroll/confirm", async (req, res) => {
    const user = await getUserContext(req, deps.resolveUser);
    if (!user) return sendError(res, 401, "Login required.");

    const code = normalizeTotpCode(requireString(req.body?.code));
    if (!code) return sendError(res, 400, "A 6-digit code is required.");

    const record = getTotpEnrollment(user.uid);
    if (!record) return sendError(res, 404, "No pending TOTP enrollment found.");

    const result = verifyTotpCode({ secret: record.secret, code });
    if (!result.ok) {
      return sendError(res, 400, "Invalid code. Try the current code from your authenticator app.");
    }

    const confirmed = confirmTotpEnrollment(user.uid);
    if (!confirmed) return sendError(res, 500, "Could not confirm TOTP enrollment.");

    return sendOk(res, {
      status: confirmed.status,
      issuer: confirmed.issuer,
      accountName: confirmed.accountName,
      enrolledAt: confirmed.enrolledAt,
      confirmedAt: confirmed.confirmedAt,
    });
  });

  router.post("/disable", async (req, res) => {
    const user = await getUserContext(req, deps.resolveUser);
    if (!user) return sendError(res, 401, "Login required.");

    const removed = disableTotpEnrollment(user.uid);
    if (!removed) return sendError(res, 404, "No TOTP enrollment found.");

    return sendOk(res, { status: "disabled" });
  });

  router.post("/challenge/verify", async (req, res) => {
    const user = await getUserContext(req, deps.resolveUser);
    if (!user) return sendError(res, 401, "Login required.");

    const code = normalizeTotpCode(requireString(req.body?.code));
    if (!code) return sendError(res, 400, "A 6-digit code is required.");

    const record = getTotpEnrollment(user.uid);
    if (!record || record.status !== "enabled") {
      return sendError(res, 404, "No active TOTP factor is enabled.");
    }

    const result = verifyTotpCode({ secret: record.secret, code });
    if (!result.ok) {
      return sendError(res, 401, "Invalid authenticator code.");
    }

    return sendOk(res, {
      verified: true,
      status: record.status,
    });
  });

  router.post("/status/set", async (req, res) => {
    const user = await getUserContext(req, deps.resolveUser);
    if (!user) return sendError(res, 401, "Login required.");

    const status = requireString(req.body?.status) as TotpMfaStatus;
    if (status !== "disabled" && status !== "pending" && status !== "enabled") {
      return sendError(res, 400, "Invalid status.");
    }

    const updated = setTotpStatus(user.uid, status);
    if (!updated) return sendError(res, 404, "No TOTP enrollment found.");

    return sendOk(res, {
      status: updated.status,
      enrolledAt: updated.enrolledAt,
      confirmedAt: updated.confirmedAt,
    });
  });

  return router;
}
