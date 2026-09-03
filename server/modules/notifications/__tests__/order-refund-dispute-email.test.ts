import assert from "node:assert/strict";
import test from "node:test";
import { notifyOrderRefunded } from "../order-refunded.notification.js";
import { notifyOrderDisputed } from "../order-disputed.notification.js";
import type { StoredOrder } from "../../orders/order.repository.js";

const order = {
  id: "order-42",
  buyerId: "buyer-1",
  sellerId: "seller-1",
  source: "listing",
  status: "refunded",
  deliveryStatus: "action_required",
  currency: "MWK",
  subtotal: { amount: 10000, currency: "MWK" },
  total: { amount: 10000, currency: "MWK" },
  items: [],
  buyerDetails: {
    fullName: "Ada Buyer",
    phone: "0999000000",
    addressLine: "1 Main Street",
    area: "Area 1",
    townOrDistrict: "Lilongwe",
    landmark: "Post Office",
  },
  createdAt: "2026-09-03T00:00:00.000Z",
  updatedAt: "2026-09-03T00:00:00.000Z",
} as StoredOrder;

function makeDependencies(failFirstSend = false) {
  const claimed = new Set<string>();
  const sent = new Set<string>();
  const released: string[] = [];
  const messages: Array<Record<string, unknown>> = [];
  let shouldFail = failFirstSend;

  return {
    claimed,
    sent,
    released,
    messages,
    claim: (_type: string, key: string) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    markSent: (_type: string, key: string) => sent.add(key),
    release: (_type: string, key: string) => {
      claimed.delete(key);
      released.push(key);
    },
    lookupUser: async (uid: string) => uid === "buyer-1"
      ? { email: "buyer@example.com", displayName: "Ada Buyer" }
      : { email: "seller@example.com", displayName: "Seller Owner" },
    lookupSellerBusinessName: async () => "Ada's Shop",
    send: async (message: Record<string, unknown>) => {
      messages.push(message);
      if (shouldFail) {
        shouldFail = false;
        throw new Error("provider unavailable");
      }
      return { messageId: "brevo-message-id" };
    },
  };
}

test("refund notification sends one email per recipient and suppresses duplicates", async () => {
  const deps = makeDependencies();

  await notifyOrderRefunded({ order, reason: "Refund approved by BuyMesho" }, deps);
  await notifyOrderRefunded({ order, reason: "Refund approved by BuyMesho" }, deps);

  assert.equal(deps.messages.length, 2);
  assert.deepEqual(
    deps.messages.map((message) => message.to),
    [
      { email: "buyer@example.com", name: "Ada Buyer" },
      { email: "seller@example.com", name: "Ada's Shop" },
    ],
  );
  assert.equal(deps.sent.size, 2);
});

test("refund notification releases failed claims so the recipients can be retried", async () => {
  const deps = makeDependencies(true);

  await notifyOrderRefunded({ order, reason: "Refund approved by BuyMesho" }, deps);
  assert.equal(deps.messages.length, 2);
  assert.equal(deps.released.length, 2);

  await notifyOrderRefunded({ order, reason: "Refund approved by BuyMesho" }, deps);
  assert.equal(deps.messages.length, 4);
  assert.equal(deps.sent.size, 2);
});

test("dispute notification sends one email per recipient and suppresses duplicates by dispute id", async () => {
  const deps = makeDependencies();
  const input = {
    orderId: "order-42",
    disputeId: "dispute-7",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    reason: "Buyer says the item was not as described",
  };

  await notifyOrderDisputed(input, deps);
  await notifyOrderDisputed(input, deps);

  assert.equal(deps.messages.length, 2);
  assert.equal(deps.sent.size, 2);
  assert.match(String(deps.messages[0].text), /not as described/);
  assert.match(String(deps.messages[1].html), /not as described/);
});

test("dispute notification retries after provider failure", async () => {
  const deps = makeDependencies(true);
  const input = {
    orderId: "order-42",
    disputeId: "dispute-8",
    buyerId: "buyer-1",
    sellerId: "seller-1",
    reason: "Delivery issue",
  };

  await notifyOrderDisputed(input, deps);
  assert.equal(deps.released.length, 2);

  await notifyOrderDisputed(input, deps);
  assert.equal(deps.messages.length, 4);
  assert.equal(deps.sent.size, 2);
});
