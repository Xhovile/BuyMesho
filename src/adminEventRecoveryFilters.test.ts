import assert from "node:assert/strict";
import test from "node:test";
import {
  getLiabilityStatusGroup,
  getPaymentStatusGroup,
  getPayoutStatusGroup,
} from "./adminEventRecoveryFilters.js";

test("payment statuses are grouped without case or whitespace sensitivity", () => {
  for (const status of ["paid", "captured", "successful", "completed", " CAPTURED "]) {
    assert.equal(getPaymentStatusGroup(status), "paid", status);
  }
  for (const status of ["pending", "created", "initiated", "processing", "provider_pending"]) {
    assert.equal(getPaymentStatusGroup(status), "pending", status);
  }
  for (const status of ["failed", "error", "rejected"]) {
    assert.equal(getPaymentStatusGroup(status), "failed", status);
  }
  assert.equal(getPaymentStatusGroup(null), "other");
  assert.equal(getPaymentStatusGroup("cancelled"), "other");
});

test("payout statuses separate paid, provider queue, failures, holds, and cancellations", () => {
  assert.equal(getPayoutStatusGroup("paid"), "paid");
  for (const status of ["processing", "pending", "pending_settlement", "eligible", "ready_for_payout", "queued", "initiated", "submitted", "provider_pending"]) {
    assert.equal(getPayoutStatusGroup(status), "processing", status);
  }
  for (const status of ["failed", "error", "rejected"]) {
    assert.equal(getPayoutStatusGroup(status), "failed", status);
  }
  for (const status of ["held", "cancelled", "canceled"]) {
    assert.equal(getPayoutStatusGroup(status), "held_cancelled", status);
  }
  assert.equal(getPayoutStatusGroup("unknown_status"), "other");
  assert.equal(getPayoutStatusGroup(undefined), "other");
});

test("refund liabilities only classify supported persisted states", () => {
  assert.equal(getLiabilityStatusGroup(" due "), "due");
  assert.equal(getLiabilityStatusGroup("RECOVERED"), "recovered");
  assert.equal(getLiabilityStatusGroup("waived"), "waived");
  assert.equal(getLiabilityStatusGroup(""), "other");
  assert.equal(getLiabilityStatusGroup("unknown"), "other");
});
