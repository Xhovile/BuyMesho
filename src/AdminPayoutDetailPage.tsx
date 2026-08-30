import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import AdminPayoutDetailDrawer from "./AdminPayoutDetailDrawer";
import type { OverrideAction, PayoutAdjustment, PayoutRow, RowAction } from "./AdminPayoutsManager";
import { getSellerPayoutStatusLabel, getVisibleAdminActions } from "./modules/payouts/uiModel";
import { apiFetch } from "./lib/api";
import { navigateToAdminPayouts, navigateToPath } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { useIsAdmin } from "./hooks/useIsAdmin";

const ADMIN_PAYOUTS_PREFIX = "/admin/payouts/";
const DESTINATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "disabled", label: "Disabled" },
] as const;
const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "manual_adjustment", label: "Manual payout adjustment" },
  { value: "processing_fee", label: "Legacy compatibility amount (hidden)" },
] as const;
const PENDING_STATES = ["eligible", "queued", "processing", "pending", "held"];

type Notice = { type: "success" | "error"; message: string };

function getPayoutIdFromLocation() {
  if (typeof window === "undefined") return null;
  const pathname = window.location.pathname;
  if (!pathname.startsWith(ADMIN_PAYOUTS_PREFIX)) return null;
  const id = pathname.slice(ADMIN_PAYOUTS_PREFIX.length).replace(/\/$/, "");
  return id ? decodeURIComponent(id) : null;
}

function statusTone(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["failed", "cancelled"].includes(normalized)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (PENDING_STATES.includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = String(value).toLowerCase();
  if (["eligible", "queued", "processing", "pending", "held", "paid", "failed", "cancelled"].includes(normalized)) {
    return getSellerPayoutStatusLabel(normalized);
  }
  return String(value).replace(/_/g, " ");
}

function canAction(row: PayoutRow, action: RowAction) {
  const status = String(row.status || "").toLowerCase();
  const hasProviderAttemptSignal =
    Number(row.attemptCount ?? 0) > 0 ||
    Number(row.latestAttemptNo ?? 0) > 0 ||
    Boolean(row.providerTransactionId) ||
    Boolean(row.providerReference);

  if (action === "retry") return row.retryEligible === true;
  if (action === "hold") return !["paid", "cancelled", "held"].includes(status);
  if (action === "mark_paid") return status === "held" && hasProviderAttemptSignal;
  if (action === "mark_failed") return !["paid", "cancelled", "failed"].includes(status);
  if (action === "cancel") return !["paid", "cancelled"].includes(status);
  return false;
}

function normalizePayoutRow(row: PayoutRow): PayoutRow {
  const destinationVerificationStatus = row.destinationVerificationStatus ?? row.destinationStatus ?? null;
  const destinationLastError = row.destinationLastError ?? row.lastError ?? row.latestAttemptFailureReason ?? row.failureReason ?? null;
  const retryEligible = row.retryEligible ?? row.retryAllowed ?? false;
  return {
    ...row,
    destinationVerificationStatus,
    destinationStatus: row.destinationStatus ?? destinationVerificationStatus,
    destinationActive:
      row.destinationActive ?? (destinationVerificationStatus ? destinationVerificationStatus === "verified" : undefined),
    destinationLastError,
    latestAttemptFailureReason: row.latestAttemptFailureReason ?? destinationLastError,
    retryEligible,
    retryAllowed: row.retryAllowed ?? retryEligible,
    manualReviewPending: row.manualReviewPending ?? Boolean(row.holdReason || row.manualReviewReason || destinationLastError),
  };
}

function toDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function pickReason(...values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? "").trim()).find((value) => value.length > 0) ?? "Admin action";
}

function extractProviderMessage(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return extractProviderMessage(JSON.parse(trimmed)) ?? trimmed;
    } catch {
      return trimmed;
    }
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["message", "error", "detail", "reason"]) {
    const candidate = extractProviderMessage(record[key]);
    if (candidate) return candidate;
  }
  return record.response ? extractProviderMessage(record.response) : null;
}

export default function AdminPayoutDetailPage() {
  const { user } = useAuthUser();
  const { isAdmin } = useIsAdmin(user);
  const payoutId = getPayoutIdFromLocation();

  const [selected, setSelected] = useState<PayoutRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [adjustments, setAdjustments] = useState<PayoutAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [destinationStatus, setDestinationStatus] = useState("verified");
  const [destinationReason, setDestinationReason] = useState("");
  const [sellerControlReason, setSellerControlReason] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"processing_fee" | "manual_adjustment">("manual_adjustment");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentProviderRef, setAdjustmentProviderRef] = useState("");

  const visibleActions = useMemo(() => getVisibleAdminActions(isAdmin), [isAdmin]);

  const loadPayout = async () => {
    if (!payoutId) {
      setSelected(null);
      setError("Invalid payout URL.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/admin/payouts/detail/${encodeURIComponent(payoutId)}`);
      if (!data || typeof data !== "object") throw new Error("Payout detail was not found.");
      const row = normalizePayoutRow(data as PayoutRow);
      const latestProviderMessage = extractProviderMessage(row.latestAttemptProviderResponse);
      setSelected({
        ...row,
        latestAttemptFailureReason: latestProviderMessage ?? row.latestAttemptFailureReason,
        lastError: row.lastError ?? latestProviderMessage,
      });
    } catch (err) {
      setSelected(null);
      setError(err instanceof Error ? err.message : "Failed to load payout detail.");
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async (id: string) => {
    setAdjustmentsLoading(true);
    try {
      const data = (await apiFetch(`/api/admin/payouts/${encodeURIComponent(id)}/adjustments`)) as {
        adjustments?: PayoutAdjustment[];
      };
      setAdjustments(Array.isArray(data.adjustments) ? data.adjustments : []);
    } catch {
      setAdjustments([]);
    } finally {
      setAdjustmentsLoading(false);
    }
  };

  useEffect(() => {
    void loadPayout();
  }, [payoutId]);

  useEffect(() => {
    if (!selected) {
      setAdjustments([]);
      return;
    }
    void loadAdjustments(selected.id);
    setDestinationStatus(selected.destinationVerificationStatus ?? selected.destinationStatus ?? "verified");
    setDestinationReason(selected.destinationLastError ?? selected.lastError ?? selected.latestAttemptFailureReason ?? "");
    setSellerControlReason("");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentProviderRef(selected.providerReference ?? "");
    setAdjustmentType("manual_adjustment");
  }, [selected]);

  const reloadSelected = async () => {
    await loadPayout();
    if (payoutId) await loadAdjustments(payoutId);
  };

  const runAction = async (successMessage: string, task: () => Promise<unknown>) => {
    if (!selected) return;
    setActionBusyId(selected.id);
    setNotice(null);
    try {
      await task();
      setNotice({ type: "success", message: successMessage });
      await reloadSelected();
    } catch (err) {
      setNotice({ type: "error", message: err instanceof Error ? err.message : "Action failed." });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleRetry = async () => {
    if (!selected || !window.confirm(`Retry payout ${selected.id}?`)) return;
    await runAction("Payout retried.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/retry`, {
        method: "POST",
        body: JSON.stringify({ payoutId: selected.id, sellerId: selected.sellerId }),
      }),
    );
  };

  const handleReconcile = async () => {
    if (!selected || !window.confirm(`Reconcile payout ${selected.id}?`)) return;
    await runAction("Payout reconciled.", () => apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/reconcile`, { method: "POST" }));
  };

  const handleOverride = async (action: OverrideAction) => {
    if (!selected || !window.confirm(`Apply ${action.replace(/_/g, " ")} to payout ${selected.id}?`)) return;
    const reason = pickReason(
      sellerControlReason,
      destinationReason,
      selected.manualReviewReason,
      selected.lastError,
      selected.failureReason,
      `Admin ${action.replace(/_/g, " ")}`,
    );
    await runAction("Payout updated.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/override`, {
        method: "POST",
        body: JSON.stringify({ payoutId: selected.id, sellerId: selected.sellerId, action, reason }),
      }),
    );
  };

  const handleDestinationVerification = async () => {
    if (!selected?.destinationAccountId) {
      setNotice({ type: "error", message: "This payout does not have a destination account attached." });
      return;
    }
    const status = destinationStatus.trim().toLowerCase();
    if (!["pending", "verified", "failed", "disabled"].includes(status)) {
      setNotice({ type: "error", message: "Choose a valid destination verification status first." });
      return;
    }
    const reason = pickReason(destinationReason, selected.destinationLastError, `Admin set destination to ${status}`);
    await runAction("Destination verification updated.", () =>
      apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId as string)}/verification`, {
        method: "POST",
        body: JSON.stringify({ status, reason }),
      }),
    );
  };

  const handleApproveDestinationVerification = async () => {
    if (!selected?.destinationAccountId) {
      setNotice({ type: "error", message: "This payout does not have a destination account attached." });
      return;
    }
    await runAction("Destination approved.", () =>
      apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId as string)}/verification`, {
        method: "POST",
        body: JSON.stringify({ status: "verified", reason: pickReason(destinationReason, "Destination approved by admin") }),
      }),
    );
  };

  const handleSellerSuspension = async (suspended: boolean) => {
    if (!selected) return;
    await runAction(suspended ? "Seller payouts suspended." : "Seller payouts unsuspended.", () =>
      apiFetch(`/api/admin/payouts/sellers/${encodeURIComponent(selected.sellerId)}/suspension`, {
        method: "POST",
        body: JSON.stringify({
          suspended,
          reason: pickReason(sellerControlReason, selected.manualReviewReason, selected.lastError, suspended ? "Admin suspension" : "Admin unsuspension"),
        }),
      }),
    );
  };

  const handleCreateAdjustment = async () => {
    if (!selected) return;
    const amount = Number(adjustmentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice({ type: "error", message: "Enter a valid positive adjustment amount." });
      return;
    }
    await runAction("Adjustment created.", () =>
      apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          adjustmentType,
          amount,
          reason: pickReason(adjustmentReason, "Manual payout adjustment"),
          providerReference: adjustmentProviderRef || undefined,
        }),
      }),
    );
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentProviderRef("");
  };

  if (loading) {
    return (
      <AdminWorkspaceLayout title="Payout detail" description="Review and manage one payout without the queue underneath it.">
        <div className="flex min-h-[50vh] items-center justify-center rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
        </div>
      </AdminWorkspaceLayout>
    );
  }

  if (!selected) {
    return (
      <AdminWorkspaceLayout title="Payout detail" description="Review and manage one payout without the queue underneath it.">
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800">
          {error ?? "Payout detail was not found."}
          <button type="button" onClick={navigateToAdminPayouts} className="ml-3 underline underline-offset-4">
            Back to payouts
          </button>
        </div>
      </AdminWorkspaceLayout>
    );
  }

  return (
    <AdminWorkspaceLayout title="Payout detail" description="Review and manage one payout without the queue underneath it.">
      <style>{`
        [data-payout-detail-page] div[class*="fixed"][class*="inset-0"] {
          position: static !important;
          inset: auto !important;
          display: block !important;
          background: transparent !important;
          backdrop-filter: none !important;
          z-index: auto !important;
        }
        [data-payout-detail-page] div[class*="fixed"][class*="inset-0"] > aside {
          margin-left: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          box-shadow: none !important;
        }
      `}</style>
      <div data-payout-detail-page className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2rem] border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Standalone payout workspace</p>
            <h1 className="mt-1 text-xl font-black text-zinc-950">{selected.id}</h1>
            <p className="mt-1 text-sm text-zinc-500">This page contains only this payout's information.</p>
          </div>
          <button
            type="button"
            onClick={navigateToAdminPayouts}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            Back to payouts
          </button>
        </div>

        {notice ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
            {notice.message}
          </div>
        ) : null}

        <AdminPayoutDetailDrawer
          selected={selected}
          visibleActions={visibleActions}
          actionBusyId={actionBusyId}
          adjustments={adjustments}
          adjustmentsLoading={adjustmentsLoading}
          destinationStatus={destinationStatus}
          destinationReason={destinationReason}
          sellerControlReason={sellerControlReason}
          adjustmentType={adjustmentType}
          adjustmentAmount={adjustmentAmount}
          adjustmentReason={adjustmentReason}
          adjustmentProviderRef={adjustmentProviderRef}
          destinationStatusOptions={DESTINATION_STATUS_OPTIONS}
          adjustmentTypeOptions={ADJUSTMENT_TYPE_OPTIONS}
          canAction={canAction}
          statusTone={statusTone}
          formatStatus={formatStatus}
          toDate={toDate}
          onClose={navigateToAdminPayouts}
          onOpenRetryDialog={() => void handleRetry()}
          onOpenOverrideDialog={(action) => void handleOverride(action)}
          onOpenReconcileDialog={() => void handleReconcile()}
          onOpenRefundEscrowDialog={() => setNotice({ type: "error", message: "Refund escrow is not wired in this build." })}
          isAdmin={isAdmin}
          onDestinationStatusChange={setDestinationStatus}
          onDestinationReasonChange={setDestinationReason}
          onUpdateDestinationVerification={handleDestinationVerification}
          onApproveDestinationVerification={handleApproveDestinationVerification}
          onSellerControlReasonChange={setSellerControlReason}
          onUpdateSellerSuspension={handleSellerSuspension}
          onReloadAdjustments={() => void loadAdjustments(selected.id)}
          onAdjustmentTypeChange={setAdjustmentType}
          onAdjustmentAmountChange={setAdjustmentAmount}
          onAdjustmentReasonChange={setAdjustmentReason}
          onAdjustmentProviderRefChange={setAdjustmentProviderRef}
          onCreateAdjustment={handleCreateAdjustment}
        />
      </div>
    </AdminWorkspaceLayout>
  );
}
