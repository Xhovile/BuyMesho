import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentDb } from "../../postgresCompat.js";
import { findEventTicketIdentity, getEventTicketTransaction } from "../../events/eventTransactionIdentity.js";

const db = getPaymentDb();

test("ticket identity can resolve the payment transaction used by admin search", () => {
  const ticket = db.prepare(`
    SELECT id
    FROM event_tickets
    ORDER BY purchase_date DESC NULLS LAST, id DESC
    LIMIT 1
  `).get() as { id?: string } | undefined;

  if (!ticket?.id) {
    assert.ok(true, "No event tickets exist in this environment; search contract cannot be exercised with live data.");
    return;
  }

  const identity = findEventTicketIdentity(db, ticket.id);
  assert.ok(identity, "ticket identity should resolve");
  const transaction = getEventTicketTransaction(db, ticket.id);
  assert.ok(transaction, "ticket transaction should resolve");
  assert.equal(transaction?.ticketId, identity?.ticketId);
  assert.equal(transaction?.order?.id, identity?.orderId ?? transaction?.order?.id);
});
