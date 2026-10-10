export type PaymentFilter = "all" | "paid" | "pending" | "failed" | "other";
export type PayoutFilter = "all" | "paid" | "processing" | "failed" | "held_cancelled" | "other";
export type LiabilityFilter = "all" | "due" | "recovered" | "waived";

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function getPaymentStatusGroup(value: unknown): Exclude<PaymentFilter, "all"> {
  const status = normalizeStatus(value);
  if (["paid", "captured", "successful", "completed"].includes(status)) return "paid";
  if (["pending", "created", "initiated", "processing", "provider_pending"].includes(status)) return "pending";
  if (["failed", "error", "rejected"].includes(status)) return "failed";
  return "other";
}

export function getPayoutStatusGroup(value: unknown): Exclude<PayoutFilter, "all"> {
  const status = normalizeStatus(value);
  if (status === "paid") return "paid";
  if ([
    "processing",
    "pending",
    "pending_settlement",
    "eligible",
    "ready_for_payout",
    "queued",
    "initiated",
    "submitted",
    "provider_pending",
  ].includes(status)) return "processing";
  if (["failed", "error", "rejected"].includes(status)) return "failed";
  if (["held", "cancelled", "canceled"].includes(status)) return "held_cancelled";
  return "other";
}

export function getLiabilityStatusGroup(value: unknown): Exclude<LiabilityFilter, "all"> | "other" {
  const status = normalizeStatus(value);
  if (status === "due" || status === "recovered" || status === "waived") return status;
  return "other";
}
