import { CircleAlert, Loader2, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import FormDropdown from "./components/FormDropdown";
import type { OverrideAction, PayoutAdjustment, PayoutRow, RowAction } from "./AdminPayoutsManager";

type PayoutDetailDrawerProps = {
  selected: PayoutRow;
  visibleActions: string[];
  actionBusyId: string | null;
  adjustments: PayoutAdjustment[];
  adjustmentsLoading: boolean;
  destinationStatus: string;
  destinationReason: string;
  sellerControlReason: string;
  adjustmentType: "processing_fee" | "manual_adjustment";
  adjustmentAmount: string;
  adjustmentReason: string;
  adjustmentProviderRef: string;
  destinationStatusOptions: readonly { value: string; label: string }[];
  adjustmentTypeOptions: readonly { value: "manual_adjustment" | "processing_fee"; label: string }[];
  canAction: (row: PayoutRow, action: RowAction) => boolean;
  statusTone: (status: string) => string;
  formatStatus: (value: string | null | undefined) => string;
  toDate: (value: string | null | undefined) => string;
  onClose: () => void;
  onOpenRetryDialog: () => void;
  onOpenOverrideDialog: (action: OverrideAction, confirmLabel: string) => void;
  onOpenReconcileDialog: () => void;
  onOpenRefundEscrowDialog: () => void;
  isAdmin: boolean;
  onDestinationStatusChange: (value: string) => void;
  onDestinationReasonChange: (value: string) => void;
  onUpdateDestinationVerification: () => void;
  onApproveDestinationVerification: () => void;
  onSellerControlReasonChange: (value: string) => void;
  onUpdateSellerSuspension: (suspended: boolean) => void;
  onReloadAdjustments: () => void;
  onAdjustmentTypeChange: (value: "processing_fee" | "manual_adjustment") => void;
  onAdjustmentAmountChange: (value: string) => void;
  onAdjustmentReasonChange: (value: string) => void;
  onAdjustmentProviderRefChange: (value: string) => void;
  onCreateAdjustment: () => void;
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-all font-medium text-zinc-900">{value}</p>
    </div>
  );
}

export default function PayoutDetailDrawer({
  selected,
  visibleActions,
  actionBusyId,
  adjustments,
  adjustmentsLoading,
  destinationStatus,
  destinationReason,
  sellerControlReason,
  adjustmentType,
  adjustmentAmount,
  adjustmentReason,
  adjustmentProviderRef,
  destinationStatusOptions,
  adjustmentTypeOptions,
  canAction,
  statusTone,
  formatStatus,
  toDate,
  onClose,
  onOpenRetryDialog,
  onOpenOverrideDialog,
  onOpenReconcileDialog,
  onOpenRefundEscrowDialog,
  isAdmin,
  onDestinationStatusChange,
  onDestinationReasonChange,
  onUpdateDestinationVerification,
  onApproveDestinationVerification,
  onSellerControlReasonChange,
  onUpdateSellerSuspension,
  onReloadAdjustments,
  onAdjustmentTypeChange,
  onAdjustmentAmountChange,
  onAdjustmentReasonChange,
  onAdjustmentProviderRefChange,
  onCreateAdjustment,
}: PayoutDetailDrawerProps) {
  const destinationVerified =
    String(selected.destinationVerificationStatus ?? "").toLowerCase() === "verified" &&
    selected.destinationActive !== false;
  const canApproveDestination = !!selected.destinationAccountId && !destinationVerified;
  const escrowState = String(selected.escrowState ?? "").toLowerCase();
  const canRefundEscrow =
    isAdmin &&
    Boolean(selected.orderId) &&
    Boolean(selected.escrowId) &&
    escrowState !== "released" &&
    escrowState !== "refunded" &&
    escrowState !== "closed";

  return (
    <div className="fixed inset-0 z-[90] flex bg-zinc-900/50 backdrop-blur-sm" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payout detail</p>
              <h3 className="mt-1 text-lg font-black text-zinc-950">{selected.id}</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-2xl border border-zinc-200 p-2 hover:bg-zinc-50">
              <X className="h-5 w-5 text-zinc-500" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(selected.status)}`}>
              {formatStatus(selected.status)}
            </span>
            {selected.retryEligible ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                retry eligible
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-600">
                {selected.retryBlockedReason ?? "retry unavailable"}
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700">
              destination {formatStatus(selected.destinationVerificationStatus)}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${
                selected.sellerSuspended ? "border-rose-200 bg-rose-50 text-rose-700" : "border-zinc-200 bg-zinc-100 text-zinc-700"
              }`}
            >
              {selected.sellerSuspended ? "seller suspended" : "seller active"}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5">
            <h4 className="text-base font-black">Payout summary</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Info label="Payout ID" value={selected.id} />
              <Info label="Seller ID" value={selected.sellerId} />
              <Info label="Order ID" value={selected.orderId ?? "—"} />
              <Info label="Escrow ID" value={selected.escrowId ?? "—"} />
              <Info label="Release entry ID" value={selected.releaseEntryId ?? "—"} />
              <Info label="Amount" value={`${selected.currency} ${Number(selected.amount).toLocaleString()}`} />
              <Info label="Requested by" value={selected.requestedBy ?? "—"} />
              <Info label="Destination" value={selected.destinationMaskedAccount ?? "—"} />
              <Info label="Destination type" value={formatStatus(selected.destinationType)} />
              <Info label="Destination active" value={selected.destinationActive ? "Yes" : "No"} />
              <Info label="Retry eligibility" value={selected.retryEligible ? "Can retry safely" : selected.retryBlockedReason ?? "Retry unavailable"} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-black">Destination verification</h4>
            <div className="mt-3 grid gap-2">
              <Info label="Destination ID" value={selected.destinationAccountId ?? "—"} />
              <Info label="Current status" value={formatStatus(selected.destinationVerificationStatus)} />
              <Info label="Last destination error" value={selected.destinationLastError ?? "—"} />
            </div>

            {canApproveDestination ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-black">Destination must be verified before payout release.</p>
                    <p className="mt-1 text-emerald-700">Approve this destination as verified and keep it active for the payout gate.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onApproveDestinationVerification}
                  disabled={actionBusyId === selected.id}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {actionBusyId === selected.id ? "Approving..." : "Approve as verified"}
                </button>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <FormDropdown
                label="Destination status"
                value={destinationStatus}
                options={destinationStatusOptions}
                onChange={onDestinationStatusChange}
                placeholder="Select destination status"
                searchPlaceholder="Search status..."
                disabled={!selected.destinationAccountId || actionBusyId === selected.id}
              />
              <input
                value={destinationReason}
                onChange={(event) => onDestinationReasonChange(event.target.value)}
                placeholder="Reason (required for failed/disabled)"
                className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                disabled={!selected.destinationAccountId || actionBusyId === selected.id}
              />
              <button
                type="button"
                onClick={onUpdateDestinationVerification}
                disabled={!selected.destinationAccountId || actionBusyId === selected.id}
                className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {actionBusyId === selected.id ? "Saving..." : "Update"}
              </button>
            </div>
          </section>

          {canRefundEscrow ? (
            <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-5 shadow-sm">
              <h4 className="text-base font-black text-rose-950">Escrow Actions</h4>
              <p className="mt-2 text-sm text-rose-800">
                Refund escrow only when the order still has unreleased escrow funds. A confirmation reason is required before the admin-only refund route runs.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <Info label="Order ID" value={selected.orderId ?? "—"} />
                <Info label="Escrow ID" value={selected.escrowId ?? "—"} />
                <Info label="Escrow state" value={formatStatus(selected.escrowState)} />
              </div>
              <button
                type="button"
                onClick={onOpenRefundEscrowDialog}
                disabled={actionBusyId === selected.id}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleAlert className="h-4 w-4" />}
                Refund escrow
              </button>
            </section>
          ) : null}
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-black">Payout lifecycle timeline</h4>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Info label="Created at" value={toDate(selected.createdAt)} />
              <Info label="Requested at" value={toDate(selected.requestedAt)} />
              <Info label="Sent at" value={toDate(selected.sentAt)} />
              <Info label="Paid at" value={toDate(selected.paidAt)} />
              <Info label="Failed at" value={toDate(selected.failedAt)} />
              <Info label="Updated at" value={toDate(selected.updatedAt)} />
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-black">Payout actions</h4>
            <p className="mt-2 text-sm text-zinc-600">Run payout actions without leaving this detail panel. Availability follows admin visibility and policy guards.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleActions.includes("retry") ? (
                <button
                  type="button"
                  disabled={actionBusyId === selected.id || !canAction(selected, "retry")}
                  onClick={onOpenRetryDialog}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Retry
                </button>
              ) : null}
              {visibleActions.includes("hold") ? (
                <button
                  type="button"
                  disabled={actionBusyId === selected.id || !canAction(selected, "hold")}
                  onClick={() => onOpenOverrideDialog("hold", "hold")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Hold
                </button>
              ) : null}
              {visibleActions.includes("mark_paid") ? (
                <button
                  type="button"
                  disabled={actionBusyId === selected.id || !canAction(selected, "mark_paid")}
                  onClick={() => onOpenOverrideDialog("mark_paid", "mark paid")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  Mark paid
                </button>
              ) : null}
              {visibleActions.includes("mark_failed") ? (
                <button
                  type="button"
                  disabled={actionBusyId === selected.id || !canAction(selected, "mark_failed")}
                  onClick={() => onOpenOverrideDialog("mark_failed", "mark failed")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleAlert className="h-4 w-4" />}
                  Mark failed
                </button>
              ) : null}
              {visibleActions.includes("cancel") ? (
                <button
                  type="button"
                  disabled={actionBusyId === selected.id || !canAction(selected, "cancel")}
                  onClick={() => onOpenOverrideDialog("cancel", "cancel")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Cancel
                </button>
              ) : null}
              <button
                type="button"
                disabled={actionBusyId === selected.id}
                onClick={onOpenReconcileDialog}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
              >
                {actionBusyId === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reconcile
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-black">Secondary admin controls</h4>
            <p className="mt-2 text-sm text-zinc-600">Seller suspension and payout adjustments are available below.</p>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <h4 className="text-base font-black">Seller payout suspension</h4>
            <p className="mt-2 text-sm text-zinc-600">
              Current state: <span className="font-semibold text-zinc-900">{selected.sellerSuspended ? "Suspended" : "Active"}</span>
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input
                value={sellerControlReason}
                onChange={(event) => onSellerControlReasonChange(event.target.value)}
                placeholder="Reason (required)"
                className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                disabled={actionBusyId === selected.id}
              />
              <button
                type="button"
                onClick={() => onUpdateSellerSuspension(true)}
                disabled={actionBusyId === selected.id}
                className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Suspend
              </button>
              <button
                type="button"
                onClick={() => onUpdateSellerSuspension(false)}
                disabled={actionBusyId === selected.id}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 disabled:opacity-50"
              >
                Unsuspend
              </button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-black">Payout adjustments</h4>
              <button type="button" onClick={onReloadAdjustments} className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700">
                Refresh adjustments
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <Info label="Gross" value={`${selected.currency} ${Number(selected.grossAmount ?? 0).toLocaleString()}`} />
              <Info label="Net" value={`${selected.currency} ${Number(selected.netAmount ?? selected.amount).toLocaleString()}`} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr]">
              <FormDropdown
                label="Adjustment type"
                value={adjustmentType}
                options={adjustmentTypeOptions}
                onChange={(value) => onAdjustmentTypeChange(value as "processing_fee" | "manual_adjustment")}
                placeholder="Select adjustment type"
                searchPlaceholder="Search adjustment type..."
                disabled={actionBusyId === selected.id}
              />
              <input
                value={adjustmentAmount}
                onChange={(event) => onAdjustmentAmountChange(event.target.value)}
                placeholder="Amount"
                className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                disabled={actionBusyId === selected.id}
              />
              <input
                value={adjustmentReason}
                onChange={(event) => onAdjustmentReasonChange(event.target.value)}
                placeholder="Reason"
                className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                disabled={actionBusyId === selected.id}
              />
              <input
                value={adjustmentProviderRef}
                onChange={(event) => onAdjustmentProviderRefChange(event.target.value)}
                placeholder="Provider reference (optional)"
                className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                disabled={actionBusyId === selected.id}
              />
            </div>

            <button
              type="button"
              onClick={onCreateAdjustment}
              disabled={actionBusyId === selected.id}
              className="mt-3 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Save adjustment
            </button>

            <div className="mt-4 space-y-2">
              {adjustmentsLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading adjustments...
                </div>
              ) : adjustments.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">No adjustments recorded for this payout.</div>
              ) : (
                adjustments.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-zinc-900">{item.adjustmentType === "processing_fee" ? "Legacy compatibility amount" : "Manual payout adjustment"}</p>
                      <p className="text-sm font-bold text-zinc-900">
                        {item.currency} {Number(item.amount).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-zinc-700">{item.reason}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {toDate(item.createdAt)} • {item.actorType}:{item.actorId ?? "—"}
                      {item.providerReference ? ` • ref: ${item.providerReference}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <details className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer list-none text-base font-black text-zinc-900">Technical details</summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Info label="Provider charge" value={selected.providerChargeId ?? "—"} />
              <Info label="Provider ref" value={selected.providerReference ?? "—"} />
              <Info label="Provider tx" value={selected.providerTransactionId ?? "—"} />
              <Info label="Provider status" value={formatStatus(selected.providerStatus)} />
              <Info label="Latest attempt" value={selected.latestAttemptNo ? `#${selected.latestAttemptNo} (${selected.latestAttemptStatus ?? "—"})` : "—"} />
              <Info label="Latest attempt time" value={toDate(selected.latestAttemptAt)} />
              <Info label="Latest attempt error" value={selected.latestAttemptFailureReason ?? selected.failureReason ?? "—"} />
              <Info label="Webhook snapshot" value={selected.latestWebhookEventType ? `${selected.latestWebhookEventType} @ ${toDate(selected.latestWebhookEventAt)}` : "—"} />
              <Info label="Audit latest event" value={selected.auditSummary?.latestEventType ?? "—"} />
              <Info label="Audit total events" value={String(selected.auditSummary?.totalEvents ?? 0)} />
            </div>

            {Array.isArray(selected.verificationBlockers) && selected.verificationBlockers.length > 0 ? (
              <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <strong>Verification blockers:</strong> {selected.verificationBlockers.join(" • ")}
              </p>
            ) : null}

            {selected.holdReason || selected.manualReviewReason ? (
              <p className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                <strong>Hold reason:</strong> {selected.holdReason ?? selected.manualReviewReason}
              </p>
            ) : null}
          </details>
        </div>
      </aside>
    </div>
  );
}
