import assert from "node:assert/strict";
import test from "node:test";
import { buildSellerEarningsSummary } from "../summary";
import type { PayoutRecord, PayoutStatus } from "../types";

function payout(status: PayoutStatus, amount: number): PayoutRecord {
  return {
    id: `payout_${status}_${amount}`,
    sellerId: "seller_1",
    orderId: null,
    escrowId: null,
    releaseEntryId: null,
    amount,
    currency: "MWK",
    status,
    provider: "paychangu",
    providerChargeId: null,
    requestedBy: null,
    requestedAt: null,
    createdAt: "2026-05-18T00:00:00.000Z",
    updatedAt: "2026-05-18T00:00:00.000Z",
  };
}

test("buildSellerEarningsSummary maps payout statuses into seller buckets", () => {
  const summary = buildSellerEarningsSummary({
    payouts: [
      payout("eligible", 100),
      payout("queued", 200),
      payout("processing", 300),
      payout("pending", 400),
      payout("held", 500),
      payout("paid", 600),
      payout("failed", 700),
      payout("cancelled", 800),
    ],
  });

  assert.equal(summary.availableForPayout, 100);
  assert.equal(summary.pendingPayout, 1400);
  assert.equal(summary.paidOut, 600);
  assert.equal(summary.failedActionRequired, 700);
  assert.equal(summary.lifetimeSales, 2800);
  assert.equal(summary.hasFailedPayout, true);
  assert.equal(summary.hasHeldPayout, true);
});

test("buildSellerEarningsSummary prefers backend totals when provided", () => {
  const summary = buildSellerEarningsSummary({
    payouts: [payout("paid", 100)],
    lifetimeSales: "9000",
    paidOut: "8000",
    currency: "MWK",
  });

  assert.equal(summary.lifetimeSales, 9000);
  assert.equal(summary.paidOut, 8000);
});

test("buildSellerEarningsSummary flags missing and unverified destinations safely", () => {
  assert.equal(
    buildSellerEarningsSummary({ destinations: [{ isActive: false, verificationStatus: "verified" }] }).hasMissingDestination,
    true,
  );
  assert.equal(
    buildSellerEarningsSummary({ destinations: [{ isActive: true, verificationStatus: "pending" }] }).hasUnverifiedDestination,
    true,
  );
  assert.equal(
    buildSellerEarningsSummary({ destinations: [{ isActive: true, verificationStatus: "verified" }] }).hasUnverifiedDestination,
    false,
  );
});
