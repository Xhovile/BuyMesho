import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { createTicketCredential, decodeTicketCredential, verifyTicketCredential } from "../ticketCredential.js";

const keys = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

process.env.BUYMESHO_TICKET_SIGNING_KEY_ID = "test-ticket-key";
process.env.BUYMESHO_TICKET_SIGNING_PRIVATE_KEY = keys.privateKey.replace(/\n/g, "\\n");

test("signed ticket credential round-trips and verifies", () => {
  const credential = createTicketCredential({
    ticketId: "BM-6513D50ED8",
    eventId: "42",
    orderId: "order-1",
    issuedAt: 1790000000,
  });

  assert.match(credential, /^BM1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeTicketCredential(credential), {
    v: 1,
    kid: "test-ticket-key",
    tid: "BM-6513D50ED8",
    eid: "42",
    oid: "order-1",
    iat: 1790000000,
  });
  assert.deepEqual(verifyTicketCredential(credential), decodeTicketCredential(credential));
});

test("tampered ticket credential does not verify", () => {
  const credential = createTicketCredential({ ticketId: "BM-TAMPER", eventId: "42", orderId: "order-2" });
  const parts = credential.split(".");
  const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as Record<string, unknown>;
  payload.tid = "BM-FORGED";
  parts[1] = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  assert.equal(verifyTicketCredential(parts.join(".")), null);
});
