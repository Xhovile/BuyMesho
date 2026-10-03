import assert from "node:assert/strict";
import test from "node:test";
import { query, withTransaction } from "../../../postgres.js";
import { getPaymentDb } from "../../../postgresCompat.js";
import { ensureEventRefundLiabilityMigration } from "../../../db/migrations/20260927_event_refund_liabilities.js";
import {
  createEventRefundLiability,
  recordEventRefundRecovery,
  validateEventRefundRequest,
} from "../eventRefundLiability.js";
import { projectEventTickets } from "../../orders/eventTicketProjection.js";
import type { StoredOrder } from "../../orders/order.repository.js";

ensureEventRefundLiabilityMigration();

const eventId = 997901;
const orderId = "phase10-event-refund-order";
const refundRequestId = "phase10-event-refund-request";
const creatorUid = "phase10-event-refund-creator";
const caseId = "phase10-event-refund-case";
const attemptId = "phase10-event-refund-attempt";
const ticketId = "phase10-event-refund-ticket";
const destinationId = "phase10-event-refund-destination";

async function cleanup(): Promise<void> {
  await query("DELETE FROM seller_financial_ledger WHERE seller_uid = $1", [creatorUid]);
  await query("DELETE FROM seller_financial_accounts WHERE seller_uid = $1", [creatorUid]);
  await query("DELETE FROM audit_events WHERE entity_id = $1", [refundRequestId]);
  await query("DELETE FROM audit_events WHERE entity_id = $1", ["event-refund-liability-test"]);
  await query("DELETE FROM payout_events WHERE payout_id IN (SELECT payout_id FROM event_refund_liabilities WHERE order_id = $1 AND payout_id IS NOT NULL)", [orderId]);
  await query("DELETE FROM refund_transactions WHERE order_id = $1", [orderId]);
  await query("DELETE FROM event_refund_liabilities WHERE order_id = $1", [orderId]);
  await query("DELETE FROM dispute_attempts WHERE id = $1", [attemptId]);
  await query("DELETE FROM dispute_cases WHERE id = $1", [caseId]);
  await query("DELETE FROM refund_requests WHERE id = $1", [refundRequestId]);
  await query("DELETE FROM event_tickets WHERE order_id = $1", [orderId]);
  await query("DELETE FROM payouts WHERE order_id = $1", [orderId]);
  await query("DELETE FROM orders WHERE id = $1", [orderId]);
  await query("DELETE FROM events WHERE id = $1", [eventId]);
  await query("DELETE FROM seller_payout_accounts WHERE id = $1", [destinationId]);
  await query("DELETE FROM event_creators WHERE uid = $1", [creatorUid]);
}

async function seed(): Promise<void> {
  await cleanup();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO event_creators
      (uid,email,display_name,organization_name,organization_type,event_types,status,created_at,updated_at)
     VALUES ($1,$2,$3,$4,'events','concert','approved',$5,$5)`,
    [creatorUid, "creator@example.com", "Phase 10 Creator", "Phase 10 Events", now],
  );

  await query(
    `INSERT INTO seller_payout_accounts (
       id, seller_uid, event_creator_uid, owner_type, owner_uid, destination_type, provider_name,
       provider_ref_id, currency, account_name, account_number_encrypted, mobile_encrypted,
       masked_account, destination_fingerprint, is_default, verification_status, verification_attempts,
       last_error, verified_at, replaced_from_id, replaced_by_id, is_active, created_at, updated_at
     ) VALUES ($1, NULL, $2, 'event_creator', $2, 'mobile_money', 'Airtel Money', 'airtel_money',
       'MWK', 'Phase 10 Creator', NULL, 'encrypted-mobile', '******9999', $3, 1, 'verified', 0,
       NULL, $4, NULL, NULL, 1, $4, $4)`,
    [destinationId, creatorUid, 'phase10-event-refund-fingerprint', now],
  );

  await query(
    `INSERT INTO events
      (id,creator_uid,event_type,event_title,organizer_name,event_date,start_time,venue,location,
       ticket_mode,ticket_price,description,spec_values,status,payout_destination_id,created_at,updated_at)
     VALUES ($1,$2,'concert','Phase 10 Event','Phase 10 Creator','2026-10-10','18:00',
             'Test Venue','Lilongwe','paid',5000,'Phase 10 test','{}','published',$3,$4,$4)`,
    [eventId, creatorUid, destinationId, now],
  );

  const order: StoredOrder = {
    id: orderId,
    buyerId: "phase10-buyer",
    sellerId: creatorUid,
    source: "event",
    status: "paid",
    currency: "MWK",
    subtotal: { amount: 5000, currency: "MWK" },
    total: { amount: 5150, currency: "MWK" },
    items: [{
      kind: "event_ticket",
      eventId: String(eventId),
      title: "Phase 10 Event",
      quantity: 1,
      unitPrice: { amount: 5000, currency: "MWK" },
      ticketId,
    }],
    placedAt: now,
    paidAt: now,
    fulfilledAt: null,
    createdAt: now,
    updatedAt: now,
    paymentProvider: "paychangu",
    paymentReference: "phase10-ref",
    settlementRoute: "direct",
    escrowId: null,
    buyerDetails: null,
  };
  const saved = await import("../../orders/order.repository.js").then(({ orderRepository }) => orderRepository.saveAsync(order));
  assert.ok(saved);

  await query(
    `INSERT INTO event_tickets
      (id,event_id,order_id,code,ticket_title,ticket_type,holder_name,holder_email,holder_phone,status,
       purchase_date,updated_at,event_title,event_date,start_time,venue,location,metadata)
     VALUES ($1,$2,$3,$1,'Phase 10 Event','General Admission','Buyer','buyer@example.com','0999000000',
             'Waiting Entry',$4,$4,'Phase 10 Event','2026-10-10','18:00','Test Venue','Lilongwe','{}')`,
    [ticketId, eventId, orderId, now],
  );

  await query(
    `INSERT INTO dispute_cases
      (id,order_id,buyer_id,seller_id,opened_by,status,opened_at,created_at,updated_at)
     VALUES ($1,$2,'phase10-buyer',$3,'phase10-buyer','under_review',$4,$4,$4)`,
    [caseId, orderId, creatorUid, now],
  );

  await query(
    `INSERT INTO dispute_attempts
      (id,case_id,order_id,request_type,requested_resolution,reason,amount_requested,evidence,submitted_by,status,created_at,updated_at)
     VALUES ($1,$2,$3,'event_refund','refund','Phase 10 test',500,'[]','phase10-buyer','under_review',$4,$4)`,
    [attemptId, caseId, orderId, now],
  );

  await query(
    `INSERT INTO refund_requests
      (id,order_id,buyer_id,seller_id,item_id,dispute_case_id,request_type,requested_resolution,reason,
       amount_requested,currency,status,submitted_at,created_at,updated_at)
     VALUES ($1,$2,'phase10-buyer',$3,$4,$5,'event_refund','refund','Phase 10 test',500,'MWK','under_review',$6,$6,$6)`,
    [refundRequestId, orderId, creatorUid, ticketId, caseId, now],
  );
}

test("event refund liability creation preserves event identity and is idempotent", async () => {
  await seed();
  try {
    const first = await withTransaction(async (client) => createEventRefundLiability(client, {
      orderId,
      refundRequestId,
      ticketId,
      amount: 500,
      reason: "Approved event ticket refund",
    }));

    const second = await withTransaction(async (client) => createEventRefundLiability(client, {
      orderId,
      refundRequestId,
      ticketId,
      amount: 500,
      reason: "Approved event ticket refund",
    }));

    assert.equal(first.id, second.id);
    assert.equal(first.eventId, String(eventId));
    assert.equal(first.eventCreatorUid, creatorUid);
    assert.equal(first.ticketId, ticketId);
    assert.equal(first.amount, 500);
    assert.equal(first.status, "due");

    const row = await query<{ status: string; event_liability_id: string | null }>(
      "SELECT l.status, rr.event_liability_id FROM event_refund_liabilities l INNER JOIN refund_requests rr ON rr.id = l.refund_request_id WHERE l.id = $1",
      [first.id],
    );
    assert.equal(row.rows[0]?.status, "due");
    assert.equal(row.rows[0]?.event_liability_id, null);
  } finally {
    await cleanup();
  }
});

test("event refund amount cannot exceed the selected ticket value", async () => {
  await seed();
  try {
    await assert.rejects(
      () => withTransaction(async (client) => validateEventRefundRequest(client, {
        orderId,
        ticketId,
        amount: 5001,
      })),
      /selected ticket value/i,
    );

    const existing = await query<{ id: string }>(
      "SELECT id FROM event_refund_liabilities WHERE refund_request_id = $1 LIMIT 1",
      [refundRequestId],
    );
    assert.equal(existing.rows.length, 0);
  } finally {
    await cleanup();
  }
});

test("event refund recovery records the manual refund and closes the liability", async () => {
  await seed();
  try {
    const liability = await withTransaction(async (client) => createEventRefundLiability(client, {
      orderId,
      refundRequestId,
      ticketId,
      amount: 500,
      reason: "Approved event ticket refund",
    }));

    const result = await withTransaction(async (client) => recordEventRefundRecovery(client, {
      liabilityId: liability.id,
      actorId: creatorUid,
      transactionId: "PHASE10-REFUND-001",
      amount: 500,
      refundMethod: "mobile_money",
      refundDate: "2026-10-11",
      destination: "0999000000",
      note: "Refund paid to buyer",
      evidence: ["https://example.com/evidence/phase10"],
    }));

    assert.equal(result.duplicate, false);
    assert.equal(result.liability.status, "recovered");

    const state = await query<{
      liability_status: string;
      refund_status: string;
      ticket_status: string;
      order_status: string;
      refund_transaction_status: string;
    }>(
      `SELECT
         l.status AS liability_status,
         rr.status AS refund_status,
         et.status AS ticket_status,
         o.status AS order_status,
         rt.status AS refund_transaction_status
       FROM event_refund_liabilities l
       INNER JOIN refund_requests rr ON rr.id = l.refund_request_id
       INNER JOIN event_tickets et ON et.id = l.ticket_id
       INNER JOIN orders o ON o.id = l.order_id
       LEFT JOIN refund_transactions rt ON rt.refund_request_id = rr.id
      WHERE l.id = $1`,
      [liability.id],
    );

    assert.equal(state.rows[0]?.liability_status, "recovered");
    assert.equal(state.rows[0]?.refund_status, "refunded");
    assert.equal(state.rows[0]?.ticket_status, "Refunded");
    assert.equal(state.rows[0]?.order_status, "refunded");
    assert.equal(state.rows[0]?.refund_transaction_status, "refunded");

    const duplicate = await withTransaction(async (client) => recordEventRefundRecovery(client, {
      liabilityId: liability.id,
      actorId: creatorUid,
      transactionId: "PHASE10-REFUND-001",
      amount: 500,
      refundMethod: "mobile_money",
      refundDate: "2026-10-11",
      destination: "0999000000",
      note: "Duplicate recovery",
    }));
    assert.equal(duplicate.duplicate, true);
  } finally {
    await cleanup();
  }
});

test("post-payout event refund recovery debits the creator financial ledger", async () => {
  await seed();
  try {
    const now = new Date().toISOString();
    await query(
      `INSERT INTO payouts (
         id, seller_id, owner_type, owner_uid, event_id, event_creator_uid, order_id, destination_account_id,
         amount, gross_amount, platform_fee_amount, processing_fee_amount,
         reserve_amount, reserve_cap_amount, manual_adjustment_amount,
         payout_fee_amount, seller_receives_amount, net_amount,
         formula_snapshot, currency, status, provider, requested_by,
         requested_at, created_at, updated_at
       ) VALUES (
         'phase10-event-refund-paid-payout', $1, 'event_creator', $1, $2, $1, $3, $4,
         9520, 10000, 300, 0, 100, 600, 0,
         180, 9520, 9520, '{}', 'MWK', 'paid', 'paychangu', $1, $4, $4, $4
       )`,
      [creatorUid, eventId, orderId, destinationId, now],
    );
    await query(
      `INSERT INTO seller_financial_accounts
         (seller_uid, currency, reserve_balance, negative_balance, reserved_negative_balance, payout_hold)
       VALUES ($1, 'MWK', 100, 0, 0, 0)
       ON CONFLICT (seller_uid, currency)
       DO UPDATE SET reserve_balance = 100, negative_balance = 0, reserved_negative_balance = 0, payout_hold = 0`,
      [creatorUid],
    );

    const liability = await withTransaction(async (client) => createEventRefundLiability(client, {
      orderId,
      refundRequestId,
      ticketId,
      amount: 500,
      reason: "Approved event ticket refund",
    }));

    const result = await withTransaction(async (client) => recordEventRefundRecovery(client, {
      liabilityId: liability.id,
      actorId: creatorUid,
      transactionId: "PHASE10-REFUND-POST-PAYOUT-001",
      amount: 500,
      refundMethod: "mobile_money",
      refundDate: "2026-10-11",
      destination: "0999000000",
      note: "Post-payout refund paid to buyer",
    }));

    assert.equal(result.liability.status, "recovered");

    const account = await query<{
      reserve_balance: number | string;
      negative_balance: number | string;
    }>(
      "SELECT reserve_balance, negative_balance FROM seller_financial_accounts WHERE seller_uid = $1 AND currency = 'MWK'",
      [creatorUid],
    );
    assert.equal(Number(account.rows[0]?.reserve_balance), 0);
    assert.equal(Number(account.rows[0]?.negative_balance), 400);

    const ledger = await query<{ event_type: string; amount: number | string }>(
      `SELECT event_type, amount
         FROM seller_financial_ledger
        WHERE refund_liability_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [liability.id],
    );
    assert.equal(ledger.rows[0]?.event_type, "reversal_debit");
    assert.equal(Number(ledger.rows[0]?.amount), 500);
  } finally {
    await cleanup();
  }
});

test("refunded event ticket status is preserved when a paid order is re-projected", () => {
  const db = getPaymentDb();
  const now = new Date().toISOString();
  const projectedOrder: StoredOrder = {
    id: "phase10-projection-order",
    buyerId: "phase10-buyer",
    sellerId: creatorUid,
    source: "event",
    status: "paid",
    currency: "MWK",
    subtotal: { amount: 5000, currency: "MWK" },
    total: { amount: 5150, currency: "MWK" },
    items: [{
      kind: "event_ticket",
      eventId: String(eventId),
      title: "Projection Event",
      quantity: 1,
      ticketId: "phase10-projection-ticket",
      unitPrice: { amount: 5000, currency: "MWK" },
    }],
    placedAt: now,
    paidAt: now,
    fulfilledAt: null,
    createdAt: now,
    updatedAt: now,
    paymentProvider: "paychangu",
    paymentReference: "phase10-projection-ref",
    settlementRoute: "direct",
    escrowId: null,
    buyerDetails: null,
  };

  try {
    projectEventTickets(projectedOrder);
    db.prepare("UPDATE event_tickets SET status='Refunded', updated_at=? WHERE id=?").run(now, "phase10-projection-ticket");
    projectEventTickets(projectedOrder);
    const row = db.prepare("SELECT status FROM event_tickets WHERE id=?").get("phase10-projection-ticket") as { status?: string } | undefined;
    assert.equal(row?.status, "Refunded");
  } finally {
    db.prepare("DELETE FROM event_tickets WHERE id=?").run("phase10-projection-ticket");
  }
});
