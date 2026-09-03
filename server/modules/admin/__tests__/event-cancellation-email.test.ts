import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import test from "node:test";
import express from "express";
import { createAdminEventModerationRouter } from "../admin.events.routes.js";

type EventRow = Record<string, unknown> & {
  id: number;
  creator_uid: string | null;
  event_title: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  status: string;
  deleted_at: string | null;
  ticket_price: number | null;
  spec_values: string;
};

function makeEvent(status = "published"): EventRow {
  return {
    id: 42,
    creator_uid: "creator-42",
    event_type: "concert",
    event_title: "Campus Concert",
    organizer_name: "Campus Events",
    event_date: "2026-10-01",
    start_time: "18:00",
    venue: "Main Hall",
    location: "Campus",
    ticket_mode: "paid",
    ticket_price: 5000,
    ticket_link: null,
    description: "Campus concert",
    contact_whatsapp: null,
    poster_alt: null,
    spec_values: "{}",
    status,
    deleted_at: null,
    created_at: "2026-09-01T10:00:00Z",
    updated_at: "2026-09-01T10:00:00Z",
  };
}

function makeDb(event: EventRow, ticketRows: Array<Record<string, unknown>>) {
  return {
    exec: () => undefined,
    prepare: (sql: string) => ({
      get: (..._params: unknown[]) => {
        if (/SELECT \* FROM events/i.test(sql)) return event;
        return undefined;
      },
      all: (..._params: unknown[]) => {
        if (/SELECT id, ticket_type, holder_name, holder_email/i.test(sql)) {
          return ticketRows.filter((row) => {
            const email = typeof row.holder_email === "string" ? row.holder_email.trim() : "";
            const status = String(row.status ?? "");
            return email !== "" && status !== "Cancelled" && status !== "Refunded";
          });
        }
        return [];
      },
      run: (...params: unknown[]) => {
        if (/UPDATE events\s+SET status/i.test(sql)) {
          event.status = String(params[0]);
        }
        return { changes: 1 };
      },
    }),
  } as any;
}

async function startServer(router: ReturnType<typeof createAdminEventModerationRouter>) {
  const app = express();
  app.use(express.json());
  app.use("/api/admin", router);
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address() as AddressInfo;
  return {
    server,
    url: `http://127.0.0.1:${port}/api/admin/events/42/status`,
  };
}

function nextTurn() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

test("cancelling an event emails each distinct ticket-holder recipient with only that recipient's tickets", async () => {
  const event = makeEvent();
  const ticketRows = [
    { id: "ticket-1", ticket_type: "VIP", holder_name: "Ada Buyer", holder_email: "buyer@example.com", status: "Waiting Entry" },
    { id: "ticket-2", ticket_type: "General", holder_name: "Ada Buyer", holder_email: "buyer@example.com", status: "Waiting Entry" },
    { id: "ticket-3", ticket_type: "VIP", holder_name: "John Buyer", holder_email: "john@example.com", status: "Waiting Entry" },
    { id: "ticket-4", ticket_type: "VIP", holder_name: "Refunded Buyer", holder_email: "refunded@example.com", status: "Refunded" },
    { id: "ticket-5", ticket_type: "VIP", holder_name: "Cancelled Buyer", holder_email: "cancelled@example.com", status: "Cancelled" },
  ];
  const db = makeDb(event, ticketRows);
  const notifications: Array<Record<string, unknown>> = [];

  const router = createAdminEventModerationRouter({
    requireAuth: (req, _res, next) => {
      req.user = { uid: "admin-uid", email: "admin@example.com", is_admin: true };
      next();
    },
    db,
    logAdminAction: () => undefined,
    notifyEventCancelled: async (input) => {
      notifications.push(input as Record<string, unknown>);
      return true;
    },
  });

  const { server, url } = await startServer(router);
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled", reason: "The organizer cancelled the event." }),
    });

    assert.equal(response.status, 200);
    assert.equal(event.status, "cancelled");
    await nextTurn();

    assert.equal(notifications.length, 2);
    const buyer = notifications.find((input) => input.email === "buyer@example.com");
    const john = notifications.find((input) => input.email === "john@example.com");

    assert.ok(buyer);
    assert.equal(buyer.recipientName, "Ada Buyer");
    assert.deepEqual(buyer.tickets, [
      { ticketId: "ticket-1", ticketType: "VIP" },
      { ticketId: "ticket-2", ticketType: "General" },
    ]);
    assert.equal(buyer.reason, "The organizer cancelled the event.");

    assert.ok(john);
    assert.deepEqual(john.tickets, [{ ticketId: "ticket-3", ticketType: "VIP" }]);
  } finally {
    server.close();
  }
});

test("a failed cancellation email can be retried by a later cancelled-status update", async () => {
  const event = makeEvent();
  const ticketRows = [
    { id: "ticket-10", ticket_type: "VIP", holder_name: "Ada Buyer", holder_email: "buyer@example.com", status: "Waiting Entry" },
  ];
  const db = makeDb(event, ticketRows);
  let attempts = 0;

  const router = createAdminEventModerationRouter({
    requireAuth: (req, _res, next) => {
      req.user = { uid: "admin-uid", email: "admin@example.com", is_admin: true };
      next();
    },
    db,
    logAdminAction: () => undefined,
    notifyEventCancelled: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("temporary provider failure");
      return true;
    },
  });

  const { server, url } = await startServer(router);
  try {
    const request = () => fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });

    assert.equal((await request()).status, 200);
    await nextTurn();
    assert.equal(attempts, 1);

    assert.equal((await request()).status, 200);
    await nextTurn();
    assert.equal(attempts, 2);
    assert.equal(event.status, "cancelled");
  } finally {
    server.close();
  }
});
