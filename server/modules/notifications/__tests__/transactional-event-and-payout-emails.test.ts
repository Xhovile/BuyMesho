import assert from "node:assert/strict";
import test from "node:test";
import { notifyEventTicketPurchaseCompleted } from "../event-ticket-purchase-completed.notification.js";
import { notifyPayoutCompleted } from "../payout-completed.notification.js";
import { notifyEventCancelled } from "../event-cancelled.notification.js";

const ticket = { email: "buyer@example.com", buyerName: "Ada Buyer", eventName: "Campus Concert", ticketType: "VIP", quantity: 1, orderReference: "ord-event-1", amount: 5000, currency: "MWK", eventDate: "2026-10-01", startTime: "18:00", venue: "Main Hall", location: "Campus", ticketId: "ticket-1", accessUrl: "https://buymesho.app/tickets?ticketId=ticket-1", orderStatus: "paid" };

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

test("unified event ticket purchase notification sends only once per recipient", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);
  const input = {
    ...ticket,
    eventManagerName: "Campus Events",
    tickets: [
      { ticketId: "ticket-1", ticketType: "VIP", holderName: "Ada Buyer", holderEmail: "buyer@example.com", downloadUrl: "https://buymesho.app/tickets?ticketId=ticket-1&download=1" },
      { ticketId: "ticket-2", ticketType: "VIP", holderName: "John Buyer", holderEmail: "john@example.com", downloadUrl: "https://buymesho.app/tickets?ticketId=ticket-2&download=1" },
    ],
    includePaymentDetails: true,
    orderStatus: "paid",
  };

  assert.equal(await notifyEventTicketPurchaseCompleted(input, deps), true);
  assert.equal(await notifyEventTicketPurchaseCompleted(input, deps), false);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "buyer@example.com", name: "Ada Buyer" });
  assert.equal(messages[0].subject, "BuyMesho event ticket purchase confirmed — Campus Concert");
  assert.match(messages[0].text, /Payment reference: ord-event-1/);
  assert.match(messages[0].text, /Amount paid: 5,000\.00 MWK/);
  assert.match(messages[0].text, /ticket-1/);
  assert.match(messages[0].text, /ticket-2/);
  assert.match(messages[0].html, /ticket-1.*download=1/s);
  assert.equal((messages[0].html.match(/Download Ticket PDF/g) || []).length, 2);
  assert.doesNotMatch(messages[0].html, /Download ticket PDF/);
});

test("unified event ticket notification can deliver only the tickets assigned to another holder", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);
  const input = {
    ...ticket,
    email: "john@example.com",
    recipientName: "John Buyer",
    eventManagerName: "Campus Events",
    tickets: [
      { ticketId: "ticket-2", ticketType: "VIP", holderName: "John Buyer", holderEmail: "john@example.com", downloadUrl: "https://buymesho.app/tickets?ticketId=ticket-2&download=1" },
    ],
    includePaymentDetails: false,
    orderStatus: "paid",
  };

  assert.equal(await notifyEventTicketPurchaseCompleted(input, deps), true);
  assert.equal(messages.length, 1);
  assert.match(messages[0].subject, /event ticket is ready/);
  assert.doesNotMatch(messages[0].text, /Payment reference:/);
  assert.match(messages[0].text, /ticket-2/);
});

test("unified event ticket notification releases the claim when delivery fails", async () => {
  let attempts = 0;
  const deps = {
    claim: (key: string) => key === "ord-event-1:buyer@example.com" && attempts === 0,
    markSent: () => undefined,
    release: () => undefined,
    send: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary provider failure");
      return { messageId: "retry-success" };
    },
  };
  const input = {
    ...ticket,
    eventManagerName: "Campus Events",
    tickets: [{ ticketId: "ticket-1", ticketType: "VIP", holderName: "Ada Buyer", holderEmail: "buyer@example.com", downloadUrl: "https://buymesho.app/tickets?ticketId=ticket-1&download=1" }],
    includePaymentDetails: true,
    orderStatus: "paid",
  };

  await assert.rejects(() => notifyEventTicketPurchaseCompleted(input, deps), /temporary provider failure/);
  assert.equal(await notifyEventTicketPurchaseCompleted(input, {
    ...deps,
    claim: () => attempts >= 1,
    release: () => undefined,
  }), true);
  assert.equal(attempts, 2);
});

test("unified event ticket notification rejects unsuccessful orders", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);
  assert.equal(await notifyEventTicketPurchaseCompleted({ ...ticket, eventManagerName: "Campus Events", tickets: [], includePaymentDetails: true, orderStatus: "pending_payment" }, deps), false);
  assert.equal(messages.length, 0);
});

test("payout completed email uses the order item title and masked destination", async () => {
  const messages: any[] = [];
  const input = {
    email: "seller@example.com",
    sellerName: "Ada's Shop",
    amount: 1250,
    currency: "MWK",
    payoutId: "payout-1",
    orderReference: "ord-1",
    orderTitle: "Samsung Galaxy A15",
    destination: "099****8283",
    completedAt: "2026-10-01T12:00:00Z",
    status: "paid",
  };
  const deps = notificationDeps(messages);

  assert.equal(await notifyPayoutCompleted(input, deps), true);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "seller@example.com", name: "Ada's Shop" });
  assert.equal(messages[0].subject, "Your BuyMesho payout has been completed");
  assert.match(messages[0].text, /Your payout of 1,250\.00 MWK for Samsung Galaxy A15 was successfully sent to 099\*\*\*\*8283\./);
  assert.match(messages[0].text, /payout-1/);
  assert.match(messages[0].text, /Items: Samsung Galaxy A15/);
  assert.match(messages[0].text, /Sent to: 099\*\*\*\*8283/);

  assert.equal(await notifyPayoutCompleted(input, deps), false);
  assert.equal(messages.length, 1);
});

test("payout completed email preserves mixed-checkout display titles", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);
  const input = {
    email: "seller@example.com",
    sellerName: "Ada's Shop",
    amount: 3750,
    currency: "MWK",
    payoutId: "payout-mixed",
    orderReference: "ord-mixed",
    orderTitle: "Samsung Galaxy A15, Air Max +2 more",
    destination: "099****8283",
    completedAt: "2026-10-01T12:00:00Z",
    status: "paid",
  };

  assert.equal(await notifyPayoutCompleted(input, deps), true);
  assert.match(messages[0].text, /for Samsung Galaxy A15, Air Max \+2 more was successfully sent to 099\*\*\*\*8283\./);
});

test("payout completed notification releases the claim when delivery fails so the seller can be retried", async () => {
  let attempts = 0;
  const input = { email: "seller@example.com", sellerName: "Ada's Shop", amount: 1250, currency: "MWK", payoutId: "payout-2", orderReference: "ord-2", completedAt: "2026-10-01T12:00:00Z", status: "paid" };
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
      return { messageId: "payout-retry-success" };
    },
  };

  await assert.rejects(() => notifyPayoutCompleted(input, deps), /temporary provider failure/);
  assert.equal(await notifyPayoutCompleted(input, deps), true);
  assert.equal(attempts, 2);
});

test("payout completed email does not send for non-paid statuses", async () => {
  const messages: any[] = [];
  const input = { email: "seller@example.com", sellerName: "Ada's Shop", amount: 1250, currency: "MWK", payoutId: "payout-3", orderReference: "ord-3", completedAt: "2026-10-01T12:00:00Z", status: "paid" };
  const deps = notificationDeps(messages);

  for (const status of ["pending", "processing", "failed"]) {
    assert.equal(await notifyPayoutCompleted({ ...input, status }, deps), false);
  }
  assert.equal(messages.length, 0);
});

test("event cancellation notification sends once with only the recipient's tickets", async () => {
  const messages: any[] = [];
  const deps = notificationDeps(messages);
  const input = {
    email: "buyer@example.com",
    recipientName: "Ada Buyer",
    eventId: "event-9",
    eventTitle: "Campus Concert",
    eventDate: "2026-10-01",
    startTime: "18:00",
    venue: "Main Hall",
    location: "Campus",
    reason: "The organizer cancelled the event.",
    tickets: [
      { ticketId: "ticket-1", ticketType: "VIP" },
      { ticketId: "ticket-2", ticketType: "General" },
    ],
  };

  assert.equal(await notifyEventCancelled(input, deps), true);
  assert.equal(await notifyEventCancelled(input, deps), false);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "transactional");
  assert.deepEqual(messages[0].to, { email: "buyer@example.com", name: "Ada Buyer" });
  assert.equal(messages[0].subject, "Event cancelled: Campus Concert");
  assert.match(messages[0].text, /event-9|Campus Concert/);
  assert.match(messages[0].text, /ticket-1/);
  assert.match(messages[0].text, /ticket-2/);
  assert.match(messages[0].text, /The organizer cancelled the event/);
});

test("event cancellation notification releases the claim when delivery fails so the recipient can be retried", async () => {
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
      return { messageId: "cancellation-retry-success" };
    },
  };
  const input = { email: "buyer@example.com", recipientName: "Ada Buyer", eventId: "event-10", eventTitle: "Campus Concert", tickets: [{ ticketId: "ticket-3", ticketType: "VIP" }] };

  await assert.rejects(() => notifyEventCancelled(input, deps), /temporary provider failure/);
  assert.equal(await notifyEventCancelled(input, deps), true);
  assert.equal(attempts, 2);
});
