import {
  buildTotpRecord,
  getIssuerLabel,
  type TotpEnrollmentRecord,
} from "./totpService";
import type { TotpMfaStatus } from "../lib/totp";

const enrollmentStore = new Map<string, TotpEnrollmentRecord>();

export type TotpEnrollmentInput = {
  userId: string;
  email?: string | null;
  secret: string;
  issuer?: string;
  accountName?: string;
};

export type TotpEnrollmentSummary = {
  userId: string;
  email: string | null;
  status: TotpMfaStatus;
  issuer: string;
  accountName: string;
  enrolledAt: string | null;
  confirmedAt: string | null;
};

export function getTotpEnrollment(userId: string): TotpEnrollmentRecord | null {
  return enrollmentStore.get(userId) ?? null;
}

export function listTotpEnrollments(): TotpEnrollmentRecord[] {
  return Array.from(enrollmentStore.values());
}

export function upsertTotpEnrollment(input: TotpEnrollmentInput): TotpEnrollmentRecord {
  const existing = enrollmentStore.get(input.userId);
  const next = existing
    ? {
        ...existing,
        email: input.email ?? existing.email,
        secret: input.secret,
        issuer: input.issuer ? getIssuerLabel(input.issuer) : existing.issuer,
        accountName: input.accountName?.trim() || existing.accountName,
      }
    : buildTotpRecord({
        userId: input.userId,
        email: input.email ?? null,
        secret: input.secret,
        issuer: input.issuer,
        accountName: input.accountName,
      });

  enrollmentStore.set(input.userId, next);
  return next;
}

export function confirmTotpEnrollment(userId: string): TotpEnrollmentRecord | null {
  const existing = enrollmentStore.get(userId);
  if (!existing) return null;

  const confirmed: TotpEnrollmentRecord = {
    ...existing,
    status: "enabled",
    confirmedAt: new Date().toISOString(),
  };

  enrollmentStore.set(userId, confirmed);
  return confirmed;
}

export function disableTotpEnrollment(userId: string): boolean {
  return enrollmentStore.delete(userId);
}

export function setTotpStatus(userId: string, status: TotpMfaStatus): TotpEnrollmentRecord | null {
  const existing = enrollmentStore.get(userId);
  if (!existing) return null;

  const next: TotpEnrollmentRecord = {
    ...existing,
    status,
    confirmedAt: status === "enabled" ? existing.confirmedAt || new Date().toISOString() : existing.confirmedAt,
  };

  enrollmentStore.set(userId, next);
  return next;
}

export function getTotpEnrollmentSummary(userId: string): TotpEnrollmentSummary | null {
  const record = enrollmentStore.get(userId);
  if (!record) return null;

  return {
    userId: record.userId,
    email: record.email,
    status: record.status,
    issuer: record.issuer,
    accountName: record.accountName,
    enrolledAt: record.enrolledAt,
    confirmedAt: record.confirmedAt,
  };
}

export function clearTotpStore(): void {
  enrollmentStore.clear();
}
