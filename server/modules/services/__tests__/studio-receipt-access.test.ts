import assert from "node:assert/strict";
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

test("expired Studio receipt token is rejected", () => {
  const previous = process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
  process.env.XHOVILE_STUDIO_RECEIPT_SECRET = "studio-receipt-test-secret";

  try {
    const reference = "PAYCHANGU-svc-test-expired";
    const expired = createXhovileStudioReceiptAccessToken(
      reference,
      Math.floor(Date.now() / 1000) - 1,
    );
    assert.fail("Expected token creation to reject an expired expiry.");
  } catch (error) {
    assert.match(String(error), /Receipt token expiration must be in the future/);
  } finally {
    if (previous === undefined) delete process.env.XHOVILE_STUDIO_RECEIPT_SECRET;
    else process.env.XHOVILE_STUDIO_RECEIPT_SECRET = previous;
  }
});