import { createHash } from "crypto";

import { sqliteDb } from "../../server/db.js";
import {
  consumeTotpVerifiedSession,
  getTotpEnrollment,
  issueTotpVerifiedSession,
  revokeTotpVerifiedSessions,
  type TotpEnrollmentRecord,
  type TotpVerifiedSession,
} from "./totpStore.js";

export * from "./totpStore.js";
export { revokeTotpVerifiedSessions };
export type { TotpEnrollmentRecord, TotpVerifiedSession };

export function createTotpVerifiedSession(userId: string): TotpVerifiedSession {
  return issueTotpVerifiedSession(userId);
}

export function getTotpEnrollmentSummary(userId: string): TotpEnrollmentRecord | null {
  return getTotpEnrollment(userId);
}

export function verifyTotpVerifiedSession(userId: string, token: string): boolean {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = sqliteDb
    .prepare("SELECT user_id, expires_at FROM totp_verified_sessions WHERE token_hash = ? LIMIT 1")
    .get(tokenHash) as { user_id: string; expires_at: string } | undefined;

  if (!row) return false;
  if (row.user_id !== userId) return false;
  return new Date(row.expires_at).getTime() >= Date.now();
}

export function consumeVerifiedTotpSession(token: string): string | null {
  return consumeTotpVerifiedSession(token);
}
