import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyPayChanguWebhookSignature } from "../paychangu.webhook.auth.js";

const SECRET = "webhook-test-secret";

function sign(raw: string): string {
  return createHmac("sha256", SECRET).update(raw).digest("hex");
}

test("accepts a signature generated from the exact raw webhook body", () => {
  const raw = '{"event_type":"api.charge.payment","reference":"tx_1","status":"success","amount":1000,"currency":"MWK"}';
  assert.equal(
    verifyPayChanguWebhookSignature(Buffer.from(raw), sign(raw), SECRET),
    true,
  );
});

test("rejects a valid signature when the received body bytes differ", () => {
  const signed = '{"event_type":"api.charge.payment","reference":"tx_1","status":"success","amount":1000,"currency":"MWK"}';
  const received = '{ "event_type":"api.charge.payment", "reference":"tx_1", "status":"success", "amount":1000, "currency":"MWK" }';

  assert.notEqual(signed, received);
  assert.equal(
    verifyPayChanguWebhookSignature(Buffer.from(received), sign(signed), SECRET),
    false,
  );
});

test("rejects a signature from a different JSON key order", () => {
  const signed = '{"a":1,"b":2,"c":3}';
  const received = '{"c":3,"b":2,"a":1}';

  assert.equal(
    verifyPayChanguWebhookSignature(Buffer.from(received), sign(signed), SECRET),
    false,
  );
});

test("rejects malformed, missing, or prefixed signatures", () => {
  const raw = '{"status":"success"}';

  assert.equal(verifyPayChanguWebhookSignature(Buffer.from(raw), undefined, SECRET), false);
  assert.equal(verifyPayChanguWebhookSignature(Buffer.from(raw), "not-a-signature", SECRET), false);
  assert.equal(
    verifyPayChanguWebhookSignature(Buffer.from(raw), `sha256=${sign(raw)}`, SECRET),
    false,
  );
});
