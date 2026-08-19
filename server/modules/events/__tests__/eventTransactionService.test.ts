import assert from "node:assert/strict";
import test from "node:test";
import { getPaymentDb } from "../../postgresCompat.js";
import { getEventTransactionSummary, getEventTransactions } from "../eventTransactionService.js";

const db = getPaymentDb();

function cleanup() {
  db.prepare("DELETE FROM disputes WHERE order_id IN ('event_tx_order_a','event_tx_order_b','event_tx_order_other')").run();
  db.prepare("DELETE FROM payments WHERE order_id IN ('event_tx_order_a','event_tx_order_b','event_tx_order_other')").run();
  db.prepare("DELETE FROM event_tickets WHERE id IN ('event_tx_ticket_a','event_tx_ticket_b','event_tx_ticket_other')").run();
  db.prepare("DELETE FROM orders WHERE id IN ('event_tx_order_a','event_tx_order_b','event_tx_order_other')").run();
  db.prepare("DELETE FROM events WHERE id IN (991001, 991002)").run();
  db.prepare("DELETE FROM event_creators WHERE uid = 'event_tx_creator'").run();
}

function seed() {
  cleanup();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO event_creators (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at)
    VALUES ('event_tx_creator','creator@example.com','Creator','Creator Org','events','concert','approved',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO events (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,ticket_mode,ticket_price,description,spec_values,status,created_at,updated_at)
    VALUES (991001,'event_tx_creator','concert','Canonical Event','Creator','2026-08-21','18:00','Venue A','Lilongwe','paid',1000,'Test','{}','published',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO events (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,ticket_mode,ticket_price,description,spec_values,status,created_at,updated_at)
    VALUES (991002,'event_tx_creator','concert','Other Event','Creator','2026-08-22','18:00','Venue B','Lilongwe','paid',5000,'Test','{}','published',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO orders (id,buyer_id,seller_id,source,status,currency,subtotal_amount,subtotal_currency,fees_amount,fees_currency,total_amount,total_currency,payment_provider,payment_reference,items,created_at,updated_at,paid_at)
    VALUES
      ('event_tx_order_a','buyer-a','event_tx_creator','event','paid','MWK',1000,'MWK',0,'MWK',1000,'MWK','paychangu','REF-EVENT-A','[{"kind":"event_ticket","eventId":"991001","quantity":1,"unitPrice":{"amount":1000}}]',?, ?, ?),
      ('event_tx_order_b','buyer-b','event_tx_creator','event','paid','MWK',2000,'MWK',0,'MWK',2000,'MWK','paychangu','REF-EVENT-B','[{"kind":"event_ticket","eventId":"991001","quantity":2,"unitPrice":{"amount":1000}}]',?, ?, ?),
      ('event_tx_order_other','buyer-c','event_tx_creator','event','paid','MWK',5000,'MWK',0,'MWK',5000,'MWK','paychangu','REF-OTHER','[{"kind":"event_ticket","eventId":"991002","quantity":1,"unitPrice":{"amount":5000}}]',?, ?, ?)
  `).run(now, now, now, now, now, now, now, now, now);

  db.prepare(`
    INSERT INTO payments (id,order_id,provider,method,status,reference,provider_reference,currency,amount,paid_at,verified,created_at,updated_at)
    VALUES
      ('event_tx_payment_a','event_tx_order_a','paychangu','mobile_money','captured','REF-EVENT-A','PROV-A','MWK',1000,?,1,?,?),
      ('event_tx_payment_b','event_tx_order_b','paychangu','mobile_money','captured','REF-EVENT-B','PROV-B','MWK',2000,?,1,?,?),
      ('event_tx_payment_other','event_tx_order_other','paychangu','mobile_money','captured','REF-OTHER','PROV-OTHER','MWK',5000,?,1,?,?)
  `).run(now, now, now, now, now, now, now, now, now);

  db.prepare(`
    INSERT INTO event_tickets (id,event_id,order_id,code,ticket_title,ticket_type,holder_name,holder_email,holder_phone,status,purchase_date,updated_at,event_title,event_date,start_time,venue,location,metadata)
    VALUES
      ('event_tx_ticket_a',991001,'event_tx_order_a','TICKET-EVENT-A','Canonical Event','General Admission','Buyer A','a@example.com','0990000001','Waiting Entry',?,?,'Canonical Event','2026-08-21','18:00','Venue A','Lilongwe','{}'),
      ('event_tx_ticket_b',991001,'event_tx_order_b','TICKET-EVENT-B','Canonical Event','General Admission','Buyer B','b@example.com','0990000002','Waiting Entry',?,?,'Canonical Event','2026-08-21','18:00','Venue A','Lilongwe','{}'),
      ('event_tx_ticket_other',991002,'event_tx_order_other','TICKET-OTHER','Other Event','General Admission','Buyer C','c@example.com','0990000003','Waiting Entry',?,?,'Other Event','2026-08-22','18:00','Venue B','Lilongwe','{}')
  `).run(now, now, now, now, now, now);

  db.prepare(`
    INSERT INTO disputes (id,order_id,escrow_id,opened_by,reason,status,created_at,updated_at,ticket_id)
    VALUES ('event_tx_dispute_a','event_tx_order_a',NULL,'buyer-a','ticket issue','open',?,?,'event_tx_ticket_a')
  `).run(now, now);
}

test('canonical event transaction service isolates event transactions and summaries', () => {
  seed();

  const transactions = getEventTransactions(db, '991001');
  assert.equal(transactions.length, 2);
  assert.deepEqual(transactions.map((transaction) => transaction.ticketId), ['event_tx_ticket_a', 'event_tx_ticket_b']);
  assert.equal(transactions[0]?.payment?.reference, 'REF-EVENT-A');
  assert.equal(transactions[0]?.dispute?.id, 'event_tx_dispute_a');
  assert.equal(transactions[1]?.payment?.reference, 'REF-EVENT-B');

  const summary = getEventTransactionSummary(db, '991001');
  assert.equal(summary.ticketsIssued, 2);
  assert.equal(summary.ticketsSold, 2);
  assert.equal(summary.orderCount, 2);
  assert.equal(summary.paymentCount, 2);
  assert.equal(summary.successfulPaymentCount, 2);
  assert.equal(summary.ticketsDisputed, 1);
  assert.equal(summary.disputedPaymentCount, 1);
  assert.equal(summary.grossRevenueAmount, 3000);
  assert.equal(summary.latestPaymentReference, 'REF-EVENT-B');

  cleanup();
});
