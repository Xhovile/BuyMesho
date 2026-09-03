import assert from "node:assert/strict";
import test from "node:test";
import { notifyTicketDelivery, notifyTicketPurchaseConfirmation } from "../event-ticket.notification.js";
import { notifyPayoutCompleted } from "../payout-completed.notification.js";

const ticket = { email: "buyer@example.com", buyerName: "Ada Buyer", eventName: "Campus Concert", ticketType: "VIP", quantity: 1, orderReference: "ord-event-1", amount: 5000, currency: "MWK", eventDate: "2026-10-01", startTime: "18:00", venue: "Main Hall", location: "Campus", ticketId: "ticket-1", accessUrl: "https://buymesho.app/orders/ord-event-1", orderStatus: "paid" };

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

test("ticket purchase confirmation sends only once for the order and only for a successful order", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);

  assert.equal(await notifyTicketPurchaseConfirmation(ticket, deps), true);
  assert.equal(await notifyTicketPurchaseConfirmation(ticket, deps), false);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "buyer@example.com", name: "Ada Buyer" });
  assert.equal(messages[0].subject, "Your BuyMesho ticket purchase is confirmed");
  assert.match(messages[0].text, /Campus Concert/);
  assert.match(messages[0].text, /ord-event-1/);
  assert.match(messages[0].text, /Quantity: 1/);
  assert.equal(await notifyTicketPurchaseConfirmation({ ...ticket, orderStatus: "pending_payment" }, deps), false);
});

test("ticket purchase confirmation supports multiple tickets in one order", async () => {
  const messages: any[] = [];
  const tickets = [
    { ticketId: "ticket-1", ticketType: "VIP", holderName: "Ada Buyer", holderEmail: "buyer@example.com" },
    { ticketId: "ticket-2", ticketType: "VIP", holderName: "John Buyer", holderEmail: "john@example.com" },
  ];
  const deps = notificationDeps(messages);

  assert.equal(
    await notifyTicketPurchaseConfirmation(
      { ...ticket, quantity: tickets.length, tickets },
      deps,
    ),
    true,
  );
  assert.equal(messages.length, 1);
  assert.match(messages[0].text, /Quantity: 2/);
  assert.match(messages[0].text, /ticket-1/);
  assert.match(messages[0].text, /ticket-2/);
  assert.match(messages[0].text, /Holder: Ada Buyer/);
  assert.match(messages[0].text, /Holder: John Buyer/);
});

test("ticket purchase confirmation releases the claim when delivery fails so a retry can succeed", async () => {
  const claimed = new Set<string>();
  let attempts = 0;
  const deps = {
    claim: (key: string) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    markSent: () => undefined,
    release: (key: string) => claimed.delete(key),
    send: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary provider failure");
      return { messageId: "retry-success" };
    },
  };

  await assert.rejects(() => notifyTicketPurchaseConfirmation(ticket, deps), /temporary provider failure/);
  assert.equal(await notifyTicketPurchaseConfirmation(ticket, deps), true);
  assert.equal(attempts, 2);
});

test("ticket delivery sends once per recipient and includes the issued pass identifier", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);
  assert.equal(
    await notifyTicketDelivery(
      {
        ...ticket,
        quantity: 2,
        tickets: [
          { ticketId: "ticket-1", ticketType: "VIP", holderName: "Ada Buyer", holderEmail: "buyer@example.com" },
          { ticketId: "ticket-2", ticketType: "VIP", holderName: "Ada Buyer", holderEmail: "buyer@example.com" },
        ],
      },
      deps,
    ),
    true,
  );
  assert.equal(await notifyTicketDelivery({ ...ticket, ticketId: "ticket-2", quantity: 1 }, deps), false);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.equal(messages[0].subject, "Your BuyMesho event ticket is ready");
  assert.match(messages[0].text, /ticket-1/);
  assert.match(messages[0].text, /ticket-2/);
  assert.match(messages[0].text, /Quantity: 2/);
});

test("ticket delivery releases the claim when delivery fails so a retry can succeed", async () => {
  const claimed = new Set<string>();
  let attempts = 0;
  const deps = {
    claim: (key: string) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    },
    markSent: () => undefined,
    release: (key: string) => claimed.delete(key),
    send: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary provider failure");
      return { messageId: "delivery-retry-success" };
    },
  };

  await assert.rejects(() => notifyTicketDelivery(ticket, deps), /temporary provider failure/);
  assert.equal(await notifyTicketDelivery(ticket, deps), true);
  assert.equal(attempts, 2);
});

test("issued ticket delivery will not send before the order is successful", async () => {
  const messages: any[] = [];
  assert.equal(await notifyTicketDelivery({ ...ticket, orderStatus: "failed" }, { send: async message => { messages.push(message); return { messageId: "must-not-send" }; } }), false);
  assert.equal(messages.length, 0);
});

test("payout completed email sends only when the authoritative payout status is paid", async () => {
  const messages: any[] = [];
  const input = { email: "seller@example.com", sellerName: "Ada's Shop", amount: 1250, currency: "MWK", payoutId: "payout-1", orderReference: "ord-1", completedAt: "2026-10-01T12:00:00Z", status: "paid" };
  assert.equal(await notifyPayoutCompleted(input, { send: async message => { messages.push(message); return { messageId: "3" }; } }), true);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "seller@example.com", name: "Ada's Shop" });
  assert.equal(messages[0].subject, "Your BuyMesho payout has been completed");
  assert.match(messages[0].text, /payout-1/);
  assert.match(messages[0].text, /1,250.00 MWK/);
  for (const status of ["pending", "processing", "failed"]) {
    assert.equal(await notifyPayoutCompleted({ ...input, status }, { send: async () => { throw new Error("must not send"); } }), false);
  }
});
