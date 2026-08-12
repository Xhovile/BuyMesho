import assert from "node:assert/strict";
import test, { beforeEach } from "node:test";
import { getPaymentDb } from "../../postgresCompat.js";
import { updateTicket } from "../validatorProjection.routes.js";

const db = getPaymentDb();

function seedState() {
  db.prepare("DELETE FROM event_tickets WHERE id = 'ticket_idempotency_test'").run();
  db.prepare("DELETE FROM event_ticket_stats WHERE event_id = 990001").run();
  db.prepare("DELETE FROM events WHERE id = 990001").run();
  db.prepare("DELETE FROM event_creators WHERE uid = 'creator_idempotency_test'").run();

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO event_creators (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at)
    VALUES ('creator_idempotency_test','creator@example.com','Creator','Creator Org','events','concert','approved',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO events (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,ticket_mode,ticket_price,description,spec_values,status,created_at,updated_at)
    VALUES (990001,'creator_idempotency_test','concert','Idempotency Test Event','Creator','2026-08-20','18:00','Test Venue','Lilongwe','paid',1000,'Test','{}','published',?,?)
  `).run(now, now);

  db.prepare(`
    INSERT INTO event_tickets (id,event_id,order_id,code,ticket_title,ticket_type,holder_name,holder_email,holder_phone,status,purchase_date,updated_at,event_title,event_date,start_time,venue,location,metadata)
    VALUES ('ticket_idempotency_test',990001,'order_idempotency_test','TICKET-IDEMPOTENCY-1','Idempotency Test Event','General Admission','Test User','test@example.com','0990000000','Waiting Entry',?,?,'Idempotency Test Event','2026-08-20','18:00','Test Venue','Lilongwe','{}')
  `).run(now, now);
}

beforeEach(seedState);

test('duplicate ticket validation is idempotent at the database mutation', () => {
  const first = updateTicket('creator_idempotency_test','990001','ticket_idempotency_test','Inside','Main Gate','Officer');
  const second = updateTicket('creator_idempotency_test','990001','ticket_idempotency_test','Inside','Main Gate','Officer');

  assert.equal(first.result, 'accepted');
  assert.equal(second.result, 'already_applied');

  const row = db.prepare("SELECT status FROM event_tickets WHERE id='ticket_idempotency_test'").get() as { status: string };
  assert.equal(row.status, 'Inside');
});

test('concurrent-style replay cannot apply a second state transition after the first wins', () => {
  const first = updateTicket('creator_idempotency_test','990001','ticket_idempotency_test','Inside','Gate A','Officer A');
  assert.equal(first.result, 'accepted');

  const replay = updateTicket('creator_idempotency_test','990001','ticket_idempotency_test','Outside','Gate A','Officer A');
  assert.equal(replay.result, 'accepted');

  const duplicateOutside = updateTicket('creator_idempotency_test','990001','ticket_idempotency_test','Outside','Gate A','Officer A');
  assert.equal(duplicateOutside.result, 'already_applied');

  const row = db.prepare("SELECT status FROM event_tickets WHERE id='ticket_idempotency_test'").get() as { status: string };
  assert.equal(row.status, 'Outside');
});
