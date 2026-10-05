import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";

export const TICKET_CREDENTIAL_VERSION = "BM1";
const DEFAULT_KEY_ID = "buymesho-ticket-2026";
const VERIFY_PUBLIC_KEYS_ENV = "BUYMESHO_TICKET_VERIFY_PUBLIC_KEYS";

export type TicketCredentialPayload = {
  v: 1;
  kid: string;
  tid: string;
  eid: string;
  oid: string;
  iat: number;
};

function base64UrlEncode(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function getPrivateKey() {
  const configured = process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY?.trim();
  if (!configured) throw new Error("BUYMESHO_TICKET_SIGNING_PRIVATE_KEY is not configured");
  return createPrivateKey({ key: normalizePem(configured), format: "pem" });
}

function getKeyId() {
  return process.env.BUYMESHO_TICKET_SIGNING_KEY_ID?.trim() || DEFAULT_KEY_ID;
}

function createPublicKeyFromConfiguredValue(value: string): KeyObject {
  const normalized = normalizePem(value.trim());
  if (normalized.includes("BEGIN PUBLIC KEY")) {
    return createPublicKey({ key: normalized, format: "pem" });
  }
  return createPublicKey({
    key: Buffer.from(normalized, "base64"),
    format: "der",
    type: "spki",
  });
}

function getConfiguredVerificationKeys(): Map<string, KeyObject> {
  const keys = new Map<string, KeyObject>();
  const raw = process.env[VERIFY_PUBLIC_KEYS_ENV]?.trim();
  if (!raw) return keys;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("verification key registry must be a JSON object");
    }
    for (const [kid, value] of Object.entries(parsed)) {
      if (typeof value !== "string" || !value.trim() || !kid.trim()) continue;
      try {
        keys.set(kid.trim(), createPublicKeyFromConfiguredValue(value));
      } catch (error) {
        console.warn("[ticket-credential] ignoring invalid configured verification key", kid, error);
      }
    }
    return keys;
  } catch {
    // Backward-friendly fallback: kid=base64,kid2=base64
    for (const entry of raw.split(",")) {
      const separator = entry.indexOf("=");
      if (separator <= 0) continue;
      const kid = entry.slice(0, separator).trim();
      const value = entry.slice(separator + 1).trim();
      if (!kid || !value) continue;
      try {
        keys.set(kid, createPublicKeyFromConfiguredValue(value));
      } catch (error) {
        console.warn("[ticket-credential] ignoring invalid configured verification key", kid, error);
      }
    }
    return keys;
  }
}

function getVerificationKey(kid: string): KeyObject | null {
  if (kid === getKeyId()) {
    try {
      return createPublicKey(getPrivateKey());
    } catch {
      return null;
    }
  }
  return getConfiguredVerificationKeys().get(kid) ?? null;
}

function decodePayload(value: string): TicketCredentialPayload | null {
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== TICKET_CREDENTIAL_VERSION) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Partial<TicketCredentialPayload>;
    if (
      payload.v !== 1 ||
      typeof payload.kid !== "string" ||
      typeof payload.tid !== "string" ||
      typeof payload.eid !== "string" ||
      typeof payload.oid !== "string" ||
      !Number.isFinite(payload.iat)
    ) return null;
    return payload as TicketCredentialPayload;
  } catch {
    return null;
  }
}

export function createTicketCredential(input: {
  ticketId: string;
  eventId: string;
  orderId: string;
  issuedAt?: number;
}): string {
  const ticketId = input.ticketId.trim();
  const eventId = input.eventId.trim();
  const orderId = input.orderId.trim();
  if (!ticketId || !eventId || !orderId) throw new Error("Ticket credential requires ticketId, eventId and orderId");

  const payload: TicketCredentialPayload = {
    v: 1,
    kid: getKeyId(),
    tid: ticketId,
    eid: eventId,
    oid: orderId,
    iat: input.issuedAt ?? Math.floor(Date.now() / 1000),
  };
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const unsigned = `${TICKET_CREDENTIAL_VERSION}.${encodedPayload}`;
  const signature = sign(null, Buffer.from(unsigned, "utf8"), getPrivateKey());
  return `${unsigned}.${base64UrlEncode(signature)}`;
}

export function getConfiguredTicketPublicKey(): string {
  return createPublicKey(getPrivateKey()).export({ type: "spki", format: "der" }).toString("base64");
}

export function isTicketCredential(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(`${TICKET_CREDENTIAL_VERSION}.`);
}

export function decodeTicketCredential(value: string): TicketCredentialPayload | null {
  if (!isTicketCredential(value)) return null;
  return decodePayload(value);
}

export function verifyTicketCredential(value: string): TicketCredentialPayload | null {
  if (!isTicketCredential(value)) return null;
  const payload = decodePayload(value);
  if (!payload) return null;
  const parts = value.split(".");
  const verificationKey = getVerificationKey(payload.kid);
  if (!verificationKey) return null;
  try {
    const signature = Buffer.from(parts[2]!, "base64url");
    const unsigned = `${TICKET_CREDENTIAL_VERSION}.${parts[1]}`;
    return verify(null, Buffer.from(unsigned, "utf8"), verificationKey, signature) ? payload : null;
  } catch {
    return null;
  }
}
