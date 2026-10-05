import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { createTicketCredential, decodeTicketCredential, verifyTicketCredential } from "../ticketCredential.js";

const ORIGINAL_KEY_ID = process.env.BUYMESHO_TICKET_SIGNING_KEY_ID;
const ORIGINAL_PRIVATE_KEY = process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY;
const ORIGINAL_VERIFY_KEYS = process.env.BUYMESHO_TICKET_VERIFY_PUBLIC_KEYS;

function setSigningKey(
  keyId: string,
  privateKey: string,
) {
  process.env.BUYMESHO_TICKET_SIGNING_KEY_ID = keyId;
  process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY = privateKey.replace(/\n/g, "\\n");
}

test("ticket credentials round-trip through decode and verification", () => {
  const keyPair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });
  setSigningKey("test-ticket-key", keyPair.privateKey);

  const credential = createTicketCredential({
    ticketId: "BM-123",
    eventId: "42",
    orderId: "order-1",
    issuedAt: 1_758_000_000,
  });

  assert.match(credential, /^BM1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeTicketCredential(credential), {
    v: 1,
    kid: "test-ticket-key",
    tid: "BM-123",
    eid: "42",
    oid: "order-1",
    iat: 1_758_000_000,
  });
  assert.deepEqual(verifyTicketCredential(credential), decodeTicketCredential(credential));
});

test("tampering with the credential payload invalidates the signature", () => {
  const keyPair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });
  setSigningKey("test-ticket-key", keyPair.privateKey);

  const credential = createTicketCredential({ ticketId: "BM-TAMPER", eventId: "42", orderId: "order-2" });
  const parts = credential.split(".");
  const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
  payload.tid = "BM-CHANGED";
  parts[1] = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  assert.equal(verifyTicketCredential(parts.join(".")), null);
});

test("historical signing keys continue to verify after rotation", () => {
  const oldKeyPair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });
  const newKeyPair = generateKeyPairSync("ed25519", {
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "der" },
  });

  setSigningKey("test-old-key", oldKeyPair.privateKey);
  const oldCredential = createTicketCredential({
    ticketId: "BM-OLD",
    eventId: "event-1",
    orderId: "order-1",
  });

  setSigningKey("test-new-key", newKeyPair.privateKey);
  process.env.BUYMESHO_TICKET_VERIFY_PUBLIC_KEYS = JSON.stringify({
    "test-old-key": oldKeyPair.publicKey.toString("base64"),
  });

  assert.deepEqual(verifyTicketCredential(oldCredential), {
    v: 1,
    kid: "test-old-key",
    tid: "BM-OLD",
    eid: "event-1",
    oid: "order-1",
    iat: decodeTicketCredential(oldCredential)!.iat,
  });

  const newCredential = createTicketCredential({
    ticketId: "BM-NEW",
    eventId: "event-1",
    orderId: "order-2",
  });
  assert.equal(verifyTicketCredential(newCredential)?.kid, "test-new-key");
});

test.after(() => {
  if (ORIGINAL_KEY_ID === undefined) delete process.env.BUYMESHO_TICKET_SIGNING_KEY_ID;
  else process.env.BUYMESHO_TICKET_SIGNING_KEY_ID = ORIGINAL_KEY_ID;

  if (ORIGINAL_PRIVATE_KEY === undefined) delete process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY;
  else process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY = ORIGINAL_PRIVATE_KEY;

  if (ORIGINAL_VERIFY_KEYS === undefined) delete process.env.BUYMESHO_TICKET_VERIFY_PUBLIC_KEYS;
  else process.env.BUYMESHO_TICKET_VERIFY_PUBLIC_KEYS = ORIGINAL_VERIFY_KEYS;
});
