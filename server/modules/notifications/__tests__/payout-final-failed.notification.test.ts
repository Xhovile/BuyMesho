import assert from "node:assert/strict";
import test from "node:test";
import { notifyPayoutFinalFailed } from "../payout-final-failed.notification.js";
import { PAYOUT_POLICY } from "../../payouts/payout.policy.js";

function notificationDeps(messages: any[], claimed = new Set<string>()) {
  return {
    claim: (key: string) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    markSent: () => undefined,
    release: (key: string) => claimed.delete(key),
    send: async (message: any) => {
      messages.push(message);
      return { messageId: String(messages.length) };
    },
  };
}

const input = {
  email: "seller@example.com",
  sellerName: "Ada's Shop",
  amount: 1250,
  currency: "MWK",
  payoutId: "payout-final-1",
  orderReference: "ord-1",
  orderTitle: "Samsung Galaxy A15",
  destination: "099****8283",
  attemptNo: PAYOUT_POLICY.maxRetryCount,
  failureReason: "provider_unavailable",
  failedAt: "2026-10-01T12:00:00Z",
};

test("final payout failure emails the seller on the max retry attempt", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);

  assert.equal(await notifyPayoutFinalFailed(input, deps), true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "seller@example.com", name: "Ada's Shop" });
  assert.equal(messages[0].subject, "Your BuyMesho payout could not be completed");
  assert.match(messages[0].text, /after 16 attempts/);
  assert.match(messages[0].text, /Samsung Galaxy A15/);
  assert.match(messages[0].text, /099\*\*\*\*8283/);
  assert.match(messages[0].text, /Attempts: 16/);
  assert.match(messages[0].text, /Failure reason: provider_unavailable/);
  assert.match(messages[0].text, /manual review/);

  assert.equal(await notifyPayoutFinalFailed(input, deps), false);
  assert.equal(messages.length, 1);
});

test("final payout failure does not email before the retry limit", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);

  assert.equal(
    await notifyPayoutFinalFailed({ ...input, payoutId: "payout-before-limit", attemptNo: PAYOUT_POLICY.maxRetryCount - 1 }, deps),
    false,
  );
  assert.equal(messages.length, 0);
});

test("final payout failure releases the claim when email delivery fails", async () => {
  let attempts = 0;
  let claimed = false;
  const deps = {
    claim: () => {
      if (claimed) return false;
      claimed = true;
      return true;
    },
    markSent: () => undefined,
    release: () => { claimed = false; },
    send: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary provider failure");
      return { messageId: "final-failure-retry-success" };
    },
  };

  await assert.rejects(() => notifyPayoutFinalFailed(input, deps), /temporary provider failure/);
  assert.equal(await notifyPayoutFinalFailed(input, deps), true);
  assert.equal(attempts, 2);
});
