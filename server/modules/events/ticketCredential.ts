import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export const TICKET_CREDENTIAL_VERSION = "BM1";
const DEFAULT_KEY_ID = "buymesho-ticket-2026";

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
    if (payload.kid !== getKeyId()) return null;
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
  try {
    const signature = Buffer.from(parts[2]!, "base64url");
    const unsigned = `${TICKET_CREDENTIAL_VERSION}.${parts[1]}`;
    return verify(null, Buffer.from(unsigned, "utf8"), createPublicKey(getPrivateKey()), signature) ? payload : null;
  } catch {
    return null;
  }
}
