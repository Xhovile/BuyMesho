import assert from "node:assert/strict";
import test from "node:test";
import { findEventTicketIdentity, getEventTicketTransaction } from "../eventTransactionIdentity.js";

test("event ticket identity resolves ticket id to event and order", () => {
  const db = {
    prepare(sql: string) {
      return {
        get: (...args: unknown[]) => {
          assert.match(sql, /FROM event_tickets/);
          assert.deepEqual(args, ["TICKET-001", "TICKET-001"]);
          return { id: "TICKET-001", event_id: 123, order_id: "ORDER-001" };
        },
      };
    },
  } as any;

  assert.deepEqual(findEventTicketIdentity(db, "TICKET-001"), {
    ticketId: "TICKET-001",
    eventId: "123",
    orderId: "ORDER-001",
  });
});

test("event ticket transaction resolves payment and dispute through the existing order relationship", () => {
  const db = {
    prepare(sql: string) {
      if (/FROM event_tickets WHERE id = \? OR code = \?/.test(sql)) {
        return { get: () => ({ id: "TICKET-002", event_id: 456, order_id: "ORDER-002" }) };
      }
      if (/SELECT\n        et\.id,/.test(sql)) {
        return {
          get: () => ({
            id: "TICKET-002",
            event_id: 456,
            order_id: "ORDER-002",
            ticket_title: "Concert Ticket",
            ticket_type: "VIP",
            status: "Waiting Entry",
            holder_name: "Buyer",
            holder_email: "buyer@example.com",
            holder_phone: "0990000000",
            purchase_date: "2026-08-19T10:00:00.000Z",
            event_title: "Test Concert",
            event_date: "2026-08-25",
            canonical_event_title: "Test Concert",
            canonical_event_date: "2026-08-25",
          }),
        };
      }
      if (/FROM payments/.test(sql)) {
        return {
          get: () => ({
            id: "PAYMENT-002",
            provider: "PayChangu",
            method: "mobile_money",
            status: "captured",
            reference: "REF-002",
            provider_reference: "PC-002",
            currency: "MWK",
            amount: 5000,
            paid_at: "2026-08-19T10:02:00.000Z",
            verified: 1,
          }),
        };
      }
      if (/FROM disputes/.test(sql)) {
        return {
          get: () => ({
            id: "DISPUTE-002",
            status: "open",
            reason: "Ticket issue",
            opened_by: "buyer-uid",
            created_at: "2026-08-19T11:00:00.000Z",
            updated_at: "2026-08-19T11:00:00.000Z",
          }),
        };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  } as any;

  const result = getEventTicketTransaction(db, "TICKET-002");

  assert.equal(result?.ticketId, "TICKET-002");
  assert.equal(result?.eventId, "456");
  assert.equal(result?.orderId, "ORDER-002");
  assert.equal(result?.payment?.reference, "REF-002");
  assert.equal(result?.payment?.verified, true);
  assert.equal(result?.dispute?.id, "DISPUTE-002");
});
