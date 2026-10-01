import assert from "node:assert/strict";
import test from "node:test";
import { notifyOrderPaid } from "../order-paid.notification.js";

function buildEventOrder() {
  return {
    id: "ord-event-duplicate",
    buyerId: "buyer-1",
    sellerId: "creator-1",
    source: "event",
    currency: "MWK",
    buyerDetails: { fullName: "Ada Buyer" },
    total: { amount: 5000, currency: "MWK" },
    items: [
      {
        kind: "event_ticket",
        eventId: "event-1",
        title: "Campus Concert",
      },
    ],
  } as any;
}

function deps(messages: any[]) {
  const claimed = new Set<string>();
  return {
    resolveRecipient: async (uid: string) => ({
      email: uid === "buyer-1" ? "buyer@example.com" : "creator@example.com",
      displayName: uid === "buyer-1" ? "Ada Buyer" : "Campus Events",
    }),
    getSellerBusinessName: async () => "Legacy Seller",
    getEventCreatorDisplayName: async () => "Campus Events",
    claim: (notificationType: string, key: string) => {
      const claimKey = `${notificationType}:${key}`;
      if (claimed.has(claimKey)) return false;
      claimed.add(claimKey);
      return true;
    },
    markSent: () => undefined,
    release: (notificationType: string, key: string) => {
      claimed.delete(`${notificationType}:${key}`);
    },
    send: async (message: any) => {
      messages.push(message);
      return { messageId: String(messages.length) };
    },
  };
}

test("paid event email is sent once per recipient role across repeated callbacks", async () => {
  const messages: any[] = [];
  const notificationDeps = deps(messages);
  const order = buildEventOrder();

  await notifyOrderPaid(order, notificationDeps);
  await notifyOrderPaid(order, notificationDeps);

  assert.equal(messages.length, 2);
  assert.deepEqual(
    messages.map((message) => message.to.email).sort(),
    ["buyer@example.com", "creator@example.com"],
  );

  const buyerMessage = messages.find((message) => message.to.email === "buyer@example.com");
  const creatorMessage = messages.find((message) => message.to.email === "creator@example.com");

  assert.equal(buyerMessage.subject, "BuyMesho event payment confirmed — Campus Concert");
  assert.match(buyerMessage.text, /Event Manager: Campus Events/);
  assert.match(buyerMessage.text, /Event: Campus Concert/);

  assert.equal(creatorMessage.subject, "BuyMesho — new event ticket purchase for Campus Concert");
  assert.match(creatorMessage.text, /Buyer: Ada Buyer/);
  assert.match(creatorMessage.text, /Event: Campus Concert/);
  assert.match(creatorMessage.text, /https:\/\/buymesho\.app\/explore\/events\/manage\?event=event-1/);
});
