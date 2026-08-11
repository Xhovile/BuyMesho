import { useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { apiFetch } from "./lib/api";
import PayoutDetailDrawer from "./PayoutDetailDrawer";

type Props = ComponentProps<typeof PayoutDetailDrawer>;
type Banner = { type: "success" | "error"; message: string };

const reasonSources = [
  ["manualReviewReason", "manual review"],
  ["latestAttemptFailureReason", "latest attempt"],
  ["lastError", "last error"],
  ["destinationLastError", "destination error"],
  ["holdReason", "hold reason"],
  ["retryBlockedReason", "retry blocked"],
  ["failureReason", "failure reason"],
] as const;

function pickReason(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? "").trim()).find((value) => value.length > 0) ?? "Admin action";
}

export default function AdminPayoutDetailDrawer(props: Props) {
  const { selected } = props;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Banner | null>(null);
  const [dismissedBlockerForId, setDismissedBlockerForId] = useState<string | null>(null);

  const isBlockerDismissed = dismissedBlockerForId === selected.id;

  const exactReasonEntry = reasonSources.find(([key]) => {
    const value = selected[key as keyof typeof selected];
    return typeof value === "string" && value.trim().length > 0;
  });

  const exactReasonKey = exactReasonEntry?.[0] ?? null;
  const exactReasonLabel = exactReasonEntry?.[1] ?? null;
  const exactReason =
    exactReasonKey ? String(selected[exactReasonKey as keyof typeof selected] ?? "") : null;

  const destinationActive = selected.destinationActive !== false;
  const destinationVerified =
    String(selected.destinationVerificationStatus ?? selected.destinationStatus ?? "").toLowerCase() ===
      "verified" && destinationActive;
  const destinationBannerReason = !destinationVerified
    ? !selected.destinationAccountId
      ? "No payout destination account attached for seller"
      : !destinationActive
        ? "Destination account is inactive"
        : `Destination status: ${String(selected.destinationVerificationStatus ?? selected.destinationStatus ?? "pending")}`
    : null;
  const bannerReason = exactReason ?? destinationBannerReason;
  const bannerLabel = exactReasonLabel ?? (!destinationVerified ? "destination verification" : null);

  const safeVisibleActions = useMemo(
    () => props.visibleActions.filter((action) => action !== "refund_escrow"),
    [props.visibleActions],
  );

  const actionBusyId = busy ? selected.id : props.actionBusyId;

  const runAction = async (successMessage: string, task: () => Promise<unknown>) => {
    setBusy(true);
    setNotice(null);
    try {
      await task();
      setNotice({ type: "success", message: successMessage });
      window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Action failed.",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = async () => {
    if (!window.confirm(`Retry payout ${selected.id}?`)) return;
    await runAction("Payout retried.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/retry`, {
        method: "POST",
        body: JSON.stringify({ payoutId: selected.id, sellerId: selected.sellerId }),
      }),
    );
  };

  const handleReconcile = async () => {
    if (!window.confirm(`Reconcile payout ${selected.id}?`)) return;
    await runAction("Payout reconciled.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/reconcile`, {
        method: "POST",
      }),
    );
  };

  const handleRefundEscrow = async () => {
    setNotice({
      type: "error",
      message: "Refund escrow is not wired yet. Hide this action or add the backend route before enabling it.",
    });
  };

  const handleOverride = async (action: Parameters<NonNullable<Props["onOpenOverrideDialog"]>>[0]) => {
    const label = action.replace(/_/g, " ");
    if (!window.confirm(`Apply ${label} to payout ${selected.id}?`)) return;

    const reason = pickReason(
      props.sellerControlReason,
      props.destinationReason,
      selected.manualReviewReason,
      selected.lastError,
      selected.failureReason,
      `Admin ${label}`,
    );

    await runAction("Payout updated.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/override`, {
        method: "POST",
        body: JSON.stringify({
          payoutId: selected.id,
          sellerId: selected.sellerId,
          action,
          reason,
        }),
      }),
    );
  };

  const handleDestinationVerification = async () => {
    if (!selected.destinationAccountId) {
      setNotice({ type: "error", message: "This payout does not have a destination account attached." });
      return;
    }

    const status = String(props.destinationStatus ?? selected.destinationVerificationStatus ?? "").trim().toLowerCase();
    if (!["pending", "verified", "failed", "disabled"].includes(status)) {
      setNotice({ type: "error", message: "Choose a valid destination verification status first." });
      return;
    }

    const reason = pickReason(props.destinationReason, selected.destinationLastError, `Admin set destination to ${status}`);

    await runAction("Destination verification updated.", () =>
      apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId as string)}/verification`, {
        method: "POST",
        body: JSON.stringify({ status, reason }),
      }),
    );
  };

  const handleApproveDestinationVerification = async () => {
    if (!selected.destinationAccountId) {
      setNotice({ type: "error", message: "This payout does not have a destination account attached." });
      return;
    }

    await runAction("Destination approved.", () =>
      apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId as string)}/verification`, {
        method: "POST",
        body: JSON.stringify({
          status: "verified",
          reason: pickReason(props.destinationReason, "Destination approved by admin"),
        }),
      }),
    );
  };

  const handleSellerSuspension = async (suspended: boolean) => {
    const reason = pickReason(props.sellerControlReason, selected.manualReviewReason, selected.lastError, suspended ? "Admin suspension" : "Admin unsuspension");

    await runAction(suspended ? "Seller payouts suspended." : "Seller payouts unsuspended.", () =>
      apiFetch(`/api/admin/payouts/sellers/${encodeURIComponent(selected.sellerId)}/suspension`, {
        method: "POST",
        body: JSON.stringify({ suspended, reason }),
      }),
    );
  };

  const handleCreateAdjustment = async () => {
    const amount = Number(props.adjustmentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: "error", message: "Enter a valid positive adjustment amount." });
      return;
    }

    const reason = pickReason(props.adjustmentReason, "Manual payout adjustment");

    await runAction("Adjustment created.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          adjustmentType: props.adjustmentType,
          amount,
          reason,
          providerReference: props.adjustmentProviderRef || undefined,
        }),
      }),
    );
  };

  const bannerNode = bannerReason && !isBlockerDismissed ? (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 text-amber-950 shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
              Primary payout blocker{bannerLabel ? ` · ${bannerLabel}` : ""}
            </p>
            <p className="mt-1 text-sm font-semibold leading-relaxed break-words">{bannerReason}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissedBlockerForId(selected.id)}
          className="shrink-0 rounded-xl p-1 text-amber-600 hover:bg-amber-100 hover:text-amber-900 transition-colors"
          title="Dismiss blocker notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null;

  const noticeNode = notice ? (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all ${
        notice.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-rose-200 bg-rose-50 text-rose-900"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {notice.type === "success" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
        )}
        <span className="truncate">{notice.message}</span>
      </div>
      <button
        type="button"
        onClick={() => setNotice(null)}
        className={`shrink-0 rounded-lg p-1 transition-colors ${
          notice.type === "success"
            ? "text-emerald-700 hover:bg-emerald-100"
            : "text-rose-700 hover:bg-rose-100"
        }`}
        title="Dismiss notice"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : null;

  return (
    <PayoutDetailDrawer
      {...props}
      visibleActions={safeVisibleActions}
      actionBusyId={actionBusyId}
      bannerNode={bannerNode}
      noticeNode={noticeNode}
      onOpenRetryDialog={() => void handleRetry()}
      onOpenOverrideDialog={(action) => void handleOverride(action)}
      onOpenReconcileDialog={() => void handleReconcile()}
      onOpenRefundEscrowDialog={() => void handleRefundEscrow()}
      onUpdateDestinationVerification={() => void handleDestinationVerification()}
      onApproveDestinationVerification={() => void handleApproveDestinationVerification()}
      onUpdateSellerSuspension={(suspended) => void handleSellerSuspension(suspended)}
      onCreateAdjustment={() => void handleCreateAdjustment()}
    />
  );
}
