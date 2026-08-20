import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { getPaymentDb } from "../../../postgresCompat.js";
import { getEventTicketTransaction } from "../eventTransactionIdentity.js";

const db = getPaymentDb();
const eventId = 990021;
const orderId = "event_ticket_dispute_identity_order";
const ticketId = "event_ticket_dispute_identity_ticket";
const creatorUid = "creator_dispute_identity_test";

beforeEach(() => {
  db.prepare("DELETE FROM disputes WHERE order_id = ?").run(orderId);
  db.prepare("DELETE FROM payments WHERE order_id = ?").run(orderId);
  db.prepare("DELETE FROM event_tickets WHERE id = ?").run(ticketId);
  db.prepare("DELETE FROM orders WHERE id = ?").run(orderId);
  db.prepare("DELETE FROM events WHERE id = ?").run(eventId);
  db.prepare("DELETE FROM event_creators WHERE uid = ?").run(creatorUid);

  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO event_creators (
      uid, email, display_name, organization_name, organization_type, contact_whatsapp,
      event_types, status, created_at, updated_at
    ) VALUES (?, 'creator@example.com', 'Test Creator', 'Test Creator Org', 'events', '0990000000', 'concert', 'approved', ?, ?)
  `).run(creatorUid, now, now);

  db.prepare(`
    INSERT INTO events (
      id, creator_uid, event_type, event_title, organizer_name, event_date, start_time,
      venue, location, ticket_mode, ticket_price, description, spec_values, status, created_at, updated_at
    ) VALUES (?, ?, 'concert', 'Dispute Identity Event', 'Test Creator', '2026-08-20', '18:00', 'Test Venue', 'Lilongwe', 'paid', 5000, 'Test', '{}', 'published', ?, ?)
  `).run(eventId, creatorUid, now, now);

  db.prepare(`
    INSERT INTO orders (
      id, buyer_id, seller_id, source, status, currency, subtotal_amount, subtotal_currency,
      fees_amount, fees_currency, total_amount, total_currency, items, created_at, updated_at
    ) VALUES (?, 'buyer_dispute_identity_test', 'seller_dispute_identity_test', 'event', 'paid', 'MWK', 5000, 'MWK', 0, 'MWK', 5000, 'MWK', ?, ?, ?)
  `).run(orderId, JSON.stringify([{ kind: "event_ticket", eventId: String(eventId), quantity: 1 }]), now, now);

  db.prepare(`
    INSERT INTO payments (
      id, order_id, provider, method, status, reference, currency, amount, verified, created_at, updated_at
    ) VALUES ('payment_event_ticket_dispute_identity', ?, 'paychangu', 'mobile_money', 'captured', 'REF-EVENT-TICKET-DISPUTE-IDENTITY', 'MWK', 5000, 1, ?, ?)
  `).run(orderId, now, now);

  db.prepare(`
    INSERT INTO event_tickets (
      id, event_id, order_id, code, ticket_title, ticket_type, holder_name, holder_email, holder_phone,
      status, purchase_date, updated_at, event_title, event_date, start_time, venue, location, metadata
    ) VALUES (?, ?, ?, 'TICKET-DISPUTE-IDENTITY-1', 'Dispute Identity Event', 'General Admission', 'Buyer', 'buyer@example.com', '0990000000', 'Waiting Entry', ?, ?, 'Dispute Identity Event', '2026-08-20', '18:00', 'Test Venue', 'Lilongwe', '{}')
  `).run(ticketId, eventId, orderId, now, now);
});

test('ticket transaction lookup resolves the dispute attached to that ticket before legacy order disputes', () => {
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO disputes (id, order_id, ticket_id, opened_by, reason, status, created_at, updated_at)
    VALUES ('legacy-order-dispute', ?, NULL, 'buyer_dispute_identity_test', 'Legacy order issue', 'open', ?, ?)
  `).run(orderId, now, now);

  db.prepare(`
    INSERT INTO disputes (id, order_id, ticket_id, opened_by, reason, status, created_at, updated_at)
    VALUES ('ticket-specific-dispute', ?, ?, 'buyer_dispute_identity_test', 'Ticket-specific issue', 'open', ?, ?)
  `).run(orderId, ticketId, now, now);

  const transaction = getEventTicketTransaction(db, ticketId);

  assert.equal(transaction?.ticketId, ticketId);
  assert.equal(transaction?.orderId, orderId);
  assert.equal(transaction?.payment?.reference, 'REF-EVENT-TICKET-DISPUTE-IDENTITY');
  assert.equal(transaction?.dispute?.id, 'ticket-specific-dispute');
  assert.equal(transaction?.dispute?.reason, 'Ticket-specific issue');
});
