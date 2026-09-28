import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { getPaymentDb } from "../../../postgresCompat.js";
import { withTransaction } from "../../../postgres.js";
import {
  applySellerReversalDebit,
  getSellerFinancialAccount,
  preparePayoutFinancialNetting,
  recordManualRecoveryCredit,
} from "../sellerFinancialLedger.js";

const db = getPaymentDb();
const sellerUid = "seller-financial-test";

afterEach(() => {
  db.prepare("DELETE FROM seller_financial_ledger WHERE seller_uid = ?").run(sellerUid);
  db.prepare("DELETE FROM seller_financial_accounts WHERE seller_uid = ?").run(sellerUid);
  db.prepare("DELETE FROM payout_attempts WHERE payout_id LIKE 'seller-financial-test-%'").run();
  db.prepare("DELETE FROM payout_events WHERE payout_id LIKE 'seller-financial-test-%'").run();
  db.prepare("DELETE FROM payouts WHERE id LIKE 'seller-financial-test-%'").run();
  db.prepare("DELETE FROM sellers WHERE uid = ?").run(sellerUid);
});

function seedSeller(reserveBalance = 0, negativeBalance = 0): void {
  db.prepare(
    \`INSERT INTO sellers (uid, email, is_verified)
     VALUES (?, ?, 1)\`,
  ).run(sellerUid, \`\${sellerUid}@example.com\`);

  db.prepare(
    \`INSERT INTO seller_financial_accounts (
       seller_uid, currency, reserve_balance, negative_balance,
       reserved_negative_balance, payout_hold
     ) VALUES (?, 'MWK', ?, ?, 0, 0)\`,
  ).run(sellerUid, reserveBalance, negativeBalance);
}

function seedPayout(id: string, amount = 1200, reserve = 60): void {
  const now = new Date().toISOString();
  db.prepare(
    \`INSERT INTO payouts (
       id, seller_id, owner_type, owner_uid, order_id,
       amount, gross_amount, platform_fee_amount, processing_fee_amount,
       reserve_amount, reserve_cap_amount, manual_adjustment_amount,
       payout_fee_amount, seller_receives_amount, net_amount, formula_snapshot,
       currency, status, provider, requested_by, requested_at, created_at, updated_at
     ) VALUES (
       ?, ?, 'seller', ?, ?, ?, ?, 0, 0, ?, ?, 0,
       0, ?, ?, '{}', 'MWK', 'eligible', 'paychangu', 'system', ?, ?, ?
     )\`,
  ).run(
    id,
    sellerUid,
    sellerUid,
    \`order-\${id}\`,
    amount,
    amount,
    reserve,
    reserve,
    amount,
    amount,
    now,
    now,
    now,
  );
}

test("seller reversal debit consumes reserve first and carries the remainder as negative balance", async () => {
  seedSeller(300);

  const result = await withTransaction((client) =>
    applySellerReversalDebit(client, {
      sellerUid,
      currency: "MWK",
      amount: 500,
      reason: "Post-payout buyer refund",
      actorType: "system",
      idempotencyKey: "seller-financial-test-refund-1",
    }),
  );

  assert.equal(result.reserveUsed, 300);
  assert.equal(result.negativeCreated, 200);
  assert.equal(result.account.reserveBalance, 0);
  assert.equal(result.account.negativeBalance, 200);

  const duplicate = await withTransaction((client) =>
    applySellerReversalDebit(client, {
      sellerUid,
      currency: "MWK",
      amount: 500,
      reason: "Post-payout buyer refund",
      actorType: "system",
      idempotencyKey: "seller-financial-test-refund-1",
    }),
  );
  assert.equal(duplicate.duplicate, true);
  assert.equal((await getSellerFinancialAccount(sellerUid)).negativeBalance, 200);

  const ledgerCount = db.prepare(
    "SELECT COUNT(*) AS count FROM seller_financial_ledger WHERE seller_uid = ? AND idempotency_key = ?",
  ).get(sellerUid, "seller-financial-test-refund-1") as { count: number };
  assert.equal(Number(ledgerCount.count), 1);
});

test("future payout reserves negative balance for netting and paid settlement clears it", async () => {
  seedSeller(0, 200);
  seedPayout("seller-financial-test-paid");

  const netting = await withTransaction((client) =>
    preparePayoutFinancialNetting(client, {
      payoutId: "seller-financial-test-paid",
      sellerUid,
      currency: "MWK",
      minimumPayoutAmount: 1,
    }),
  );

  assert.equal(netting.blocked, false);
  assert.equal(netting.balanceNettingAmount, 200);
  assert.equal(netting.payoutAmount, 1000);

  const beforePaid = await getSellerFinancialAccount(sellerUid);
  assert.equal(beforePaid.negativeBalance, 200);
  assert.equal(beforePaid.reservedNegativeBalance, 200);

  db.prepare("UPDATE payouts SET status = 'paid', paid_at = ? WHERE id = ?")
    .run(new Date().toISOString(), "seller-financial-test-paid");

  const afterPaid = await getSellerFinancialAccount(sellerUid);
  assert.equal(afterPaid.negativeBalance, 0);
  assert.equal(afterPaid.reservedNegativeBalance, 0);
  assert.equal(afterPaid.reserveBalance, 60);

  const payout = db.prepare(
    "SELECT amount, seller_receives_amount, balance_netting_amount, balance_netting_status FROM payouts WHERE id = ?",
  ).get("seller-financial-test-paid") as Record<string, unknown>;
  assert.equal(Number(payout.amount), 1000);
  assert.equal(Number(payout.seller_receives_amount), 1200);
  assert.equal(Number(payout.balance_netting_amount), 200);
  assert.equal(payout.balance_netting_status, "settled");
});

test("failed payout releases reserved netting and restores the original seller payout amount", async () => {
  seedSeller(0, 150);
  seedPayout("seller-financial-test-failed");

  await withTransaction((client) =>
    preparePayoutFinancialNetting(client, {
      payoutId: "seller-financial-test-failed",
      sellerUid,
      currency: "MWK",
      minimumPayoutAmount: 1,
    }),
  );

  db.prepare("UPDATE payouts SET status = 'failed', failed_at = ? WHERE id = ?")
    .run(new Date().toISOString(), "seller-financial-test-failed");

  const account = await getSellerFinancialAccount(sellerUid);
  assert.equal(account.negativeBalance, 150);
  assert.equal(account.reservedNegativeBalance, 0);

  const payout = db.prepare(
    "SELECT amount, seller_receives_amount, balance_netting_amount, balance_netting_status FROM payouts WHERE id = ?",
  ).get("seller-financial-test-failed") as Record<string, unknown>;
  assert.equal(Number(payout.amount), 1200);
  assert.equal(Number(payout.seller_receives_amount), 1200);
  assert.equal(Number(payout.balance_netting_amount), 150);
  assert.equal(payout.balance_netting_status, "released");
});

test("manual recovery credit reduces only the unreserved negative balance", async () => {
  seedSeller(0, 200);

  const result = await withTransaction((client) =>
    recordManualRecoveryCredit(client, {
      sellerUid,
      currency: "MWK",
      amount: 75,
      reason: "Seller repaid part of a post-payout refund",
      actorId: "admin-financial-test",
      reference: "RECOVER-75",
    }),
  );

  assert.equal(result.appliedAmount, 75);
  assert.equal((await getSellerFinancialAccount(sellerUid)).negativeBalance, 125);
});
