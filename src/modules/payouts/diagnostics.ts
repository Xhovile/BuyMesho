import type { PayoutRow } from "../../AdminPayoutsManager";

export type PayoutDiagnostics = {
  payoutId?: string | null;
  sellerId?: string | null;
  orderId?: string | null;
  escrowId?: string | null;
  status?: string | null;
  provider?: string | null;
  providerStatus?: string | null;
  providerChargeId?: string | null;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  providerResponseReceived?: boolean;
  providerTransactionStatus?: string | null;
  providerTraceId?: string | null;
  providerPayoutAmount?: number | null;
  providerPayoutCurrency?: string | null;
  providerPayoutMobile?: string | null;
  providerPayoutMode?: string | null;
  providerPayoutCreatedAt?: string | null;
  providerPayoutCompletedAt?: string | null;
  providerPaymentMethod?: string | null;
  providerOperatorName?: string | null;
  providerOperatorRefId?: string | null;
  providerTransactionCharge?: number | string | null;
  providerReceiptReference?: string | null;
  destinationAccountId?: string | null;
  destinationVerificationStatus?: string | null;
  destinationActive?: boolean | null;
  destinationLastError?: string | null;
  sellerSuspended?: boolean | null;
  failureReason?: string | null;
  manualReviewReason?: string | null;
  latestAttemptNo?: number | null;
  latestAttemptStatus?: string | null;
  latestAttemptAt?: string | null;
  latestWebhookEventType?: string | null;
  latestWebhookEventAt?: string | null;
  latestAuditEventType?: string | null;
  latestAuditEventAt?: string | null;
  retryEligible?: boolean | null;
  retryBlockedReason?: string | null;
  latestAttemptProviderChargeId?: string | null;
  latestAttemptProviderReference?: string | null;
  latestAttemptProviderTransactionId?: string | null;
  latestAttemptProviderResponse?: unknown;
};

const providerFailureStatuses = new Set(["failed", "error", "declined", "rejected", "cancelled", "timeout"]);
const sellerFailureReasons = new Set(["seller_suspended", "seller_disabled", "account_suspended", "account_disabled"]);
const destinationFailureReasons = new Set(["destination_missing", "destination_unverified", "destination_disabled", "destination_verification_failed"]);
const reconciliationFailureReasons = new Set(["missing_provider_attempt", "provider_charge_mismatch", "payout_attempt_missing", "reconciliation_failed", "data_integrity_failed"]);
const lifecycleWaitingStatuses = new Set(["eligible", "pending_settlement", "ready_for_payout", "queued", "processing", "pending"]);
const missingAttemptStatuses = new Set(["processing", "pending", "failed"]);

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function token(value: unknown): string {
  return clean(value)?.toLowerCase() ?? "";
}

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function nested(value: unknown, ...paths: string[][]): unknown {
  for (const path of paths) {
    let current = parseJson(value);
    for (const key of path) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[key];
    }
    if (current !== undefined && current !== null && current !== "") return current;
  }
  return null;
}

function stringAt(value: unknown, ...paths: string[][]): string | null {
  return clean(nested(value, ...paths));
}

function numberAt(value: unknown, ...paths: string[][]): number | null {
  const raw = nested(value, ...paths);
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function providerTransaction(value: unknown): Record<string, unknown> {
  const root = parseJson(value);
  const transaction = nested(
    root,
    ["response", "data", "transaction"],
    ["data", "transaction"],
    ["transaction"],
  );
  return transaction && typeof transaction === "object" && !Array.isArray(transaction)
    ? transaction as Record<string, unknown>
    : {};
}

function extractProviderData(value: unknown) {
  const transaction = providerTransaction(value);
  const operator = transaction.mobile_money;
  const charges = transaction.transaction_charges;
  const operatorRecord = operator && typeof operator === "object" && !Array.isArray(operator)
    ? operator as Record<string, unknown>
    : {};
  const chargeRecord = charges && typeof charges === "object" && !Array.isArray(charges)
    ? charges as Record<string, unknown>
    : {};

  const receiptReference =
    clean(transaction.destination_reference) ??
    clean(transaction.destinationReference) ??
    clean(transaction.operator_reference) ??
    clean(transaction.operatorReference) ??
    clean(transaction.operator_transaction_id) ??
    clean(transaction.operatorTransactionId) ??
    clean(transaction.receipt_reference) ??
    clean(transaction.receiptReference) ??
    clean(transaction.receipt) ??
    clean(transaction.reference_number) ??
    clean(transaction.referenceNumber) ??
    null;

  return {
    transactionStatus: clean(transaction.status),
    traceId: clean(transaction.trace_id) ?? clean(transaction.traceId),
    amount: numberAt(transaction, ["amount"]),
    currency: clean(transaction.currency),
    mobile: clean(transaction.mobile),
    mode: clean(transaction.mode),
    createdAt: clean(transaction.created_at) ?? clean(transaction.createdAt),
    completedAt: clean(transaction.completed_at) ?? clean(transaction.completedAt),
    paymentMethod: clean(transaction.payment_method) ?? clean(transaction.paymentMethod),
    operatorName: clean(operatorRecord.name),
    operatorRefId: clean(operatorRecord.ref_id) ?? clean(operatorRecord.refId),
    transactionCharge: clean(chargeRecord.amount) ?? numberAt(chargeRecord, ["amount"]),
    receiptReference,
  };
}

export function getPayoutDiagnostics(row: PayoutRow): PayoutDiagnostics {
  const providerResponse = row.latestAttemptProviderResponse ?? null;
  const providerData = extractProviderData(providerResponse);

  return (row.diagnostics ?? {
    payoutId: row.id,
    sellerId: row.sellerId,
    orderId: row.orderId,
    escrowId: row.escrowId,
    status: row.status,
    provider: row.provider,
    providerStatus: row.providerStatus,
    providerChargeId: row.providerChargeId,
    providerReference: row.providerReference,
    providerTransactionId: row.providerTransactionId,
    providerResponseReceived: providerResponse !== null && providerResponse !== undefined,
    providerTransactionStatus: providerData.transactionStatus,
    providerTraceId: providerData.traceId,
    providerPayoutAmount: providerData.amount,
    providerPayoutCurrency: providerData.currency,
    providerPayoutMobile: providerData.mobile,
    providerPayoutMode: providerData.mode,
    providerPayoutCreatedAt: providerData.createdAt,
    providerPayoutCompletedAt: providerData.completedAt,
    providerPaymentMethod: providerData.paymentMethod,
    providerOperatorName: providerData.operatorName,
    providerOperatorRefId: providerData.operatorRefId,
    providerTransactionCharge: providerData.transactionCharge,
    providerReceiptReference: providerData.receiptReference,
    destinationAccountId: row.destinationAccountId,
    destinationVerificationStatus: row.destinationVerificationStatus,
    destinationActive: row.destinationActive,
    destinationLastError: row.destinationLastError,
    sellerSuspended: row.sellerSuspended,
    failureReason: row.failureReason,
    manualReviewReason: row.manualReviewReason,
    latestAttemptNo: row.latestAttemptNo,
    latestAttemptStatus: row.latestAttemptStatus,
    latestAttemptFailureReason: row.latestAttemptFailureReason,
    latestAttemptAt: row.latestAttemptAt,
    latestWebhookEventType: row.latestWebhookEventType,
    latestWebhookEventAt: row.latestWebhookEventAt,
    latestAuditEventType: row.auditSummary?.latestEventType ?? null,
    latestAuditEventAt: row.auditSummary?.latestEventAt ?? null,
    retryEligible: row.retryEligible,
    retryBlockedReason: row.retryBlockedReason,
    latestAttemptProviderChargeId: row.latestAttemptProviderChargeId ?? null,
    latestAttemptProviderReference: row.latestAttemptProviderReference ?? null,
    latestAttemptProviderTransactionId: row.latestAttemptProviderTransactionId ?? null,
    latestAttemptProviderResponse: providerResponse,
  }) as PayoutDiagnostics;
}

export type DiagnosticClassification =
  | "destination"
  | "seller"
  | "provider"
  | "lifecycle"
  | "reconciliation"
  | "manual_review"
  | "none";

export function classifyPayoutDiagnostic(row: PayoutRow): { classification: DiagnosticClassification; message: string | null; label: string } {
  const d = getPayoutDiagnostics(row);
  const status = token(row.currentState ?? d.status);
  const providerStatus = token(d.providerStatus);
  const attemptStatus = token(d.latestAttemptStatus);
  const destinationStatus = token(d.destinationVerificationStatus);
  const hasDestination = Boolean(clean(d.destinationAccountId));
  const destinationVerified = hasDestination && destinationStatus === "verified" && d.destinationActive !== false;
  const failureReason = clean(d.failureReason);
  const failureToken = token(d.failureReason);
  const latestAttemptFailure = clean(d.latestAttemptFailureReason);

  // Paid is a terminal success state. Historical failures from earlier attempts are evidence,
  // not an active blocker, and must never make a completed payout look failed.
  if (status === "paid" || providerStatus === "paid" || attemptStatus === "paid" || token(d.providerTransactionStatus) === "paid") {
    return { classification: "none", label: "Payout completed", message: null };
  }

  const providerFailure = latestAttemptFailure ?? (
    failureReason && !sellerFailureReasons.has(failureToken) && !destinationFailureReasons.has(failureToken) && !reconciliationFailureReasons.has(failureToken)
      ? failureReason
      : null
  );

  if (providerFailure || providerFailureStatuses.has(providerStatus) || providerFailureStatuses.has(attemptStatus)) {
    return { classification: "provider", label: "Provider execution failed", message: `Provider execution failed${providerFailure ? `: ${providerFailure}` : ""}` };
  }

  if (lifecycleWaitingStatuses.has(status) && status !== "processing" && status !== "pending") {
    return { classification: "lifecycle", label: "Payout lifecycle", message: "Payout is waiting for the next settlement or provider submission step." };
  }

  if (destinationVerified && missingAttemptStatuses.has(status) && !d.latestAttemptNo) {
    return { classification: "reconciliation", label: "Reconciliation/data-integrity", message: "Destination verified, but payout record has no provider attempt." };
  }

  if (clean(d.providerChargeId) && clean(d.latestAttemptProviderChargeId) && d.providerChargeId !== d.latestAttemptProviderChargeId) {
    return { classification: "reconciliation", label: "Reconciliation/data-integrity", message: "Payout provider charge does not match the latest attempt charge." };
  }

  if (failureToken && reconciliationFailureReasons.has(failureToken)) {
    return { classification: "reconciliation", label: "Reconciliation/data-integrity", message: failureReason };
  }

  if (d.sellerSuspended || sellerFailureReasons.has(failureToken)) {
    return { classification: "seller", label: "Seller/account problem", message: clean(d.manualReviewReason) ?? "Seller payouts are suspended." };
  }

  if (!destinationVerified || destinationFailureReasons.has(failureToken)) {
    const reason = clean(d.destinationLastError)
      ?? (failureToken && destinationFailureReasons.has(failureToken) ? failureReason : null)
      ?? (!hasDestination ? "No payout destination is attached or available for this seller." : null)
      ?? (d.destinationActive === false ? "Destination is inactive." : null)
      ?? (destinationStatus && destinationStatus !== "missing" ? `Destination status is ${destinationStatus}.` : "Destination status is unavailable.");
    return { classification: "destination", label: "Destination usability", message: reason };
  }

  if (lifecycleWaitingStatuses.has(status)) {
    const manual = clean(d.manualReviewReason);
    return { classification: "lifecycle", label: "Payout lifecycle/settlement", message: manual ?? "Destination verified. Payout waiting for settlement or payout lifecycle processing." };
  }

  if (clean(d.manualReviewReason) || clean(d.retryBlockedReason)) {
    return { classification: "manual_review", label: "Manual review", message: clean(d.manualReviewReason) ?? clean(d.retryBlockedReason) };
  }

  return { classification: "none", label: "No actual blocker", message: null };
}
