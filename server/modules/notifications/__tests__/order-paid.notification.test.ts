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

test("event order_paid notification is manager-only because buyer uses unified ticket notification", async () => {
  const messages: any[] = [];
  const notificationDeps = deps(messages);
  const order = buildEventOrder();

  await notifyOrderPaid(order, notificationDeps);
  await notifyOrderPaid(order, notificationDeps);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].to.email, "creator@example.com");
  assert.equal(messages[0].subject, "BuyMesho — new event ticket purchase for Campus Concert");
  assert.match(messages[0].text, /Buyer: Ada Buyer/);
  assert.match(messages[0].text, /Event: Campus Concert/);
  assert.match(messages[0].text, /https:\/\/buymesho\.app\/explore\/events\/manage\?event=event-1/);
});
