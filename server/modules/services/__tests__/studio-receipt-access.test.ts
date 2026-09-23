import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  createXhovileStudioReceiptAccessToken,
  verifyXhovileStudioReceiptAccessToken,
} from "../studio-receipt-access.js";

test("Studio receipt token verifies for the same reference", () => {
  const previous = process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
  process.env.XHOVILE_STUDIO_RECEIPT_SECRET = "studio-receipt-test-secret";

  try {
    const reference = "PAYCHANGU-svc-test-123";
    const token = createXhovileStudioReceiptAccessToken(
      reference,
      Math.floor(Date.now() / 1000) + 300,
    );

    assert.equal(verifyXhovileStudioReceiptAccessToken(reference, token), true);
    assert.equal(
      verifyXhovileStudioReceiptAccessToken("PAYCHANGU-svc-other-123", token),
      false,
    );
    assert.equal(
      verifyXhovileStudioReceiptAccessToken(reference, `${token}x`),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
    else process.env.XHOVILE_STUDIO_RECEIPT_SECRET = previous;
  }
});

test("expired Studio receipt tokens are rejected by the verifier", () => {
  const previous = process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
  const secret = "studio-receipt-test-secret";
  process.env.XHOVILE_STUDIO_RECEIPT_SECRET = secret;

  try {
    const reference = "PAYCHANGU-svc-test-expired";
    const expiresAt = Math.floor(Date.now() / 1000) - 1;
    const signature = createHmac("sha256", secret)
      .update(`${reference}.${expiresAt}`)
      .digest("base64url");
    const expired = `${expiresAt}.${signature}`;

    assert.equal(
      verifyXhovileStudioReceiptAccessToken(reference, expired),
      false,
    );
  } finally {
    if (previous === undefined) delete process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
    else process.env.XHOVILE_STUDIO_RECEIPT_SECRET = previous;
  }
});

test("receipt token creation still rejects expired expirations", () => {
  const previous = process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
  process.env.XHOVILE_STUDIO_RECEIPT_SECRET = "studio-receipt-test-secret";

  try {
    const reference = "PAYCHANGU-svc-test-expired-creation";
    assert.throws(
      () =>
        createXhovileStudioReceiptAccessToken(
          reference,
          Math.floor(Date.now() / 1000) - 1,
        ),
      /Receipt token expiration must be in the future/,
    );
  } finally {
    if (previous === undefined) delete process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
    else process.env.XHOVILE_STUDIO_RECEIPT_SECRET = previous;
  }
});