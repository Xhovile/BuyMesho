import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import { useAuthUser } from "./hooks/useAuthUser";
import { useIsAdmin } from "./hooks/useIsAdmin";
import { getSellerPayoutStatusLabel, getVisibleAdminActions } from "./modules/payouts/uiModel";
import ActionModal from "./components/ActionModal";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import { navigateToAdminPayoutDestinations } from "./lib/appNavigation";
import FormDropdown from "./components/FormDropdown";
import PayoutQueueCard from "./PayoutQueueCard";
import PayoutDetailDrawer from "./PayoutDetailDrawer";

export type PayoutRow = {
  id: string;
  sellerId: string;
  orderId: string | null;
  escrowId: string | null;
  releaseEntryId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  providerChargeId: string | null;
  providerReference: string | null;
  providerTransactionId?: string | null;
  providerStatus: string | null;
  destinationAccountId: string | null;
  destinationMaskedAccount: string | null;
  destinationType: string | null;
  destinationVerificationStatus: string | null;
  destinationActive?: boolean;
  destinationLastError?: string | null;
  sellerSuspended?: boolean;
  verificationBlockers?: string[];
  failureReason: string | null;
  manualReviewReason: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestAttemptNo: number | null;
  latestAttemptStatus: string | null;
  latestAttemptAt: string | null;
  latestAttemptFailureReason?: string | null;
  latestWebhookEventType?: string | null;
  latestWebhookEventAt?: string | null;
  attemptCount?: number;
  currentState?: string;
  lastError?: string | null;
  holdReason?: string | null;
  retryEligible?: boolean;
  retryBlockedReason?: string | null;
  auditSummary?: {
    totalEvents?: number;
    latestEventType?: string | null;
    latestEventAt?: string | null;
  };
  grossAmount?: number;
  platformFeeAmount?: number;
  legacyProcessingFeeAmount?: number;
  reserveAmount?: number;
  reserveCapAmount?: number;
  manualAdjustmentAmount?: number;
  netAmount?: number;
};

type PayoutSummary = {
  summary?: {
    totalPayouts?: number;
    pendingPayouts?: number;
    paidPayouts?: number;
    failedPayouts?: number;
    cancelledPayouts?: number;
  };
  attempts?: {
    totalAttempts?: number;
    successfulAttempts?: number;
    failedAttempts?: number;
  };
};

export type PayoutAdjustment = {
  id: string;
  payoutId: string;
  sellerId: string;
  adjustmentType: "processing_fee" | "manual_adjustment";
  amount: number;
  currency: string;
  reason: string;
  actorType: string;
  actorId: string | null;
  providerReference: string | null;
  createdAt: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

export type OverrideAction = "hold" | "mark_paid" | "mark_failed" | "cancel";
export type RowAction = "retry" | OverrideAction;

type StatusFilter = "all" | "pending" | "failed" | "held" | "paid" | "cancelled";

const PENDING_STATES = ["eligible", "queued", "processing", "pending", "held"];
const PAGE_SIZE = 50;
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending states" },
  { value: "failed", label: "Failed" },
  { value: "held", label: "Held" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
] as const;
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

type PayoutsListResponse = {
  rows?: PayoutRow[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
    hasMore?: boolean;
  };
};

type PendingDialog =
  | {
      kind: "retry";
      row: PayoutRow;
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
    }
  | {
      kind: "reconcile";
      row: PayoutRow;
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
    }
  | {
      kind: "override";
      row: PayoutRow;
      action: OverrideAction;
      title: string;
      message: string;
      confirmLabel: string;
      danger?: boolean;
    };

function toDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
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
  const normalized = String(value || "").toLowerCase();
  if (
    ["eligible", "queued", "processing", "pending", "held", "paid", "failed", "cancelled"].includes(
      normalized,
    )
  ) {
    return getSellerPayoutStatusLabel(normalized);
  }
  return value.replace(/_/g, " ");
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function canAction(row: PayoutRow, action: RowAction) {
  const status = String(row.status || "").toLowerCase();

  if (action === "retry") {
    return row.retryEligible === true;
  }

  if (action === "hold") {
    return !["paid", "cancelled", "held"].includes(status);
  }

  if (action === "mark_paid") {
    return !["paid", "cancelled"].includes(status);
  }

  if (action === "mark_failed") {
    return !["paid", "cancelled", "failed"].includes(status);
  }

  if (action === "cancel") {
    return !["paid", "cancelled"].includes(status);
  }

  return false;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

function AdminPayoutsManagerContent() {
  const { user } = useAuthUser();
  const { isAdmin } = useIsAdmin(user);

  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [batchReconciling, setBatchReconciling] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [retryEligibleOnly, setRetryEligibleOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [hasMoreRows, setHasMoreRows] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adjustments, setAdjustments] = useState<PayoutAdjustment[]>([]);
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(false);

  const [destinationStatus, setDestinationStatus] = useState("verified");
  const [destinationReason, setDestinationReason] = useState("");
  const [sellerControlReason, setSellerControlReason] = useState("");

  const [adjustmentType, setAdjustmentType] = useState<"processing_fee" | "manual_adjustment">("manual_adjustment");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentProviderRef, setAdjustmentProviderRef] = useState("");
  const [pendingDialog, setPendingDialog] = useState<PendingDialog | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const closeActionDialog = () => {
    setPendingDialog(null);
    setOverrideReason("");
  };

  const load = async (nextPageIndex = pageIndex) => {
    setError(null);
    setRefreshing(true);
    try {
      const [payoutsData, summaryData] = await Promise.all([
        apiFetch(`/api/admin/payouts?limit=${PAGE_SIZE}&offset=${nextPageIndex * PAGE_SIZE}`),
        apiFetch("/api/admin/payouts/summary"),
      ]);
      const payouts = payoutsData as PayoutsListResponse;
      const nextRows = Array.isArray(payouts.rows) ? payouts.rows : [];
      const nextTotal = Number(payouts.pagination?.total ?? nextRows.length);
      const nextHasMore = Boolean(payouts.pagination?.hasMore);
      setRows(nextRows);
      setTotalRows(nextTotal);
      setHasMoreRows(nextHasMore);
      setPageIndex(nextPageIndex);
      setSummary((summaryData ?? {}) as PayoutSummary);
      setLastRefreshAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payouts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAdjustments = async (payoutId: string) => {
    setAdjustmentsLoading(true);
    try {
      const data = (await apiFetch(`/api/admin/payouts/${encodeURIComponent(payoutId)}/adjustments`)) as {
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
    void load(0);
  }, []);

  const selected = useMemo(
    () => (selectedId ? rows.find((row) => row.id === selectedId) ?? null : null),
    [rows, selectedId]
  );

  useEffect(() => {
    if (!selected) {
      setAdjustments([]);
      return;
    }
    setDestinationStatus((selected.destinationVerificationStatus ?? "verified").toLowerCase());
    setDestinationReason("");
    setSellerControlReason("");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentProviderRef("");
    setAdjustmentType("manual_adjustment");
    void loadAdjustments(selected.id);
  }, [selected?.id]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => PENDING_STATES.includes(String(r.status || "").toLowerCase())).length;
    const paid = rows.filter((r) => String(r.status || "").toLowerCase() === "paid").length;
    const failed = rows.filter((r) => String(r.status || "").toLowerCase() === "failed").length;
    const cancelled = rows.filter((r) => String(r.status || "").toLowerCase() === "cancelled").length;

    return {
      total: summary.summary?.totalPayouts ?? rows.length,
      pending: summary.summary?.pendingPayouts ?? pending,
      paid: summary.summary?.paidPayouts ?? paid,
      failed: summary.summary?.failedPayouts ?? failed,
      cancelled: summary.summary?.cancelledPayouts ?? cancelled,
      attempts: summary.attempts?.totalAttempts ?? 0,
    };
  }, [rows, summary]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return rows.filter((row) => {
      const status = String(row.status || "").toLowerCase();
      if (statusFilter === "pending" && !PENDING_STATES.includes(status)) return false;
      if (statusFilter === "failed" && status !== "failed") return false;
      if (statusFilter === "held" && status !== "held") return false;
      if (statusFilter === "paid" && status !== "paid") return false;
      if (statusFilter === "cancelled" && status !== "cancelled") return false;
      if (retryEligibleOnly && row.retryEligible !== true) return false;

      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        String(row.sellerId || "").toLowerCase().includes(q) ||
        String(row.orderId || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, statusFilter, retryEligibleOnly]);
  const visibleActions = useMemo(() => getVisibleAdminActions(isAdmin), [isAdmin]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(Math.max(totalRows, 0) / PAGE_SIZE)), [totalRows]);

  const runAction = async (row: PayoutRow, action: RowAction, reason?: string) => {
    setActionBusyId(row.id);
    setError(null);
    setNotice(null);

    try {
      if (action === "retry") {
        await apiFetch(`/api/payouts/${encodeURIComponent(row.sellerId)}/retry`, {
          method: "POST",
          body: JSON.stringify({ payoutId: row.id }),
        });
      } else {
        await apiFetch(`/api/payouts/${encodeURIComponent(row.sellerId)}/override`, {
          method: "POST",
          body: JSON.stringify({ payoutId: row.id, action, reason }),
        });
      }

      setNotice({ type: "success", message: `Action ${action} completed for ${row.id}.` });
      await load(pageIndex);
      if (selected?.id === row.id) {
        await loadAdjustments(row.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setActionBusyId(null);
    }
  };

  const reconcileSingle = async (row: PayoutRow) => {
    setActionBusyId(row.id);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/payouts/${encodeURIComponent(row.id)}/reconcile`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice({ type: "success", message: `Reconciled payout ${row.id}.` });
      await load(pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconcile payout.");
    } finally {
      setActionBusyId(null);
    }
  };

  const reconcilePending = async () => {
    setBatchReconciling(true);
    setNotice(null);
    try {
      const result = (await apiFetch("/api/admin/payouts/reconcile-pending", {
        method: "POST",
        body: JSON.stringify({ limit: 100 }),
      })) as { count?: number };
      setNotice({
        type: "success",
        message: `Reconcile-pending completed. Processed ${Number(result?.count ?? 0)} payout(s).`,
      });
      await load(pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconcile pending payouts.");
    } finally {
      setBatchReconciling(false);
    }
  };

  const updateDestinationVerification = async () => {
    if (!selected?.destinationAccountId) return;

    const needsReason = ["failed", "disabled"].includes(destinationStatus);
    if (needsReason && !destinationReason.trim()) {
      setError("Reason is required when setting destination to failed or disabled.");
      return;
    }

    setActionBusyId(selected.id);
    setNotice(null);
    setError(null);

    try {
      await apiFetch(`/api/admin/payouts/destinations/${encodeURIComponent(selected.destinationAccountId)}/verification`, {
        method: "POST",
        body: JSON.stringify({
          status: destinationStatus,
          reason: destinationReason.trim() || undefined,
        }),
      });
      setNotice({ type: "success", message: `Destination verification updated for ${selected.destinationAccountId}.` });
      setDestinationReason("");
      await load(pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update destination verification.");
    } finally {
      setActionBusyId(null);
    }
  };

  const updateSellerSuspension = async (suspended: boolean) => {
    if (!selected) return;
    if (!sellerControlReason.trim()) {
      setError("Reason is required for seller suspension changes.");
      return;
    }

    setActionBusyId(selected.id);
    setNotice(null);
    setError(null);

    try {
      await apiFetch(`/api/admin/payouts/sellers/${encodeURIComponent(selected.sellerId)}/suspension`, {
        method: "POST",
        body: JSON.stringify({
          suspended,
          reason: sellerControlReason.trim(),
        }),
      });
      setNotice({
        type: "success",
        message: suspended
          ? `Seller ${selected.sellerId} payouts suspended.`
          : `Seller ${selected.sellerId} payouts unsuspended.`,
      });
      setSellerControlReason("");
      await load(pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update seller suspension.");
    } finally {
      setActionBusyId(null);
    }
  };

  const createAdjustment = async () => {
    if (!selected) return;

    const parsedAmount = Number(adjustmentAmount);
    if (!Number.isFinite(parsedAmount)) {
      setError("Adjustment amount must be a valid number.");
      return;
    }
    if (!adjustmentReason.trim()) {
      setError("Adjustment reason is required.");
      return;
    }

    setActionBusyId(selected.id);
    setNotice(null);
    setError(null);

    try {
      await apiFetch(`/api/admin/payouts/${encodeURIComponent(selected.id)}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          adjustmentType,
          amount: parsedAmount,
          reason: adjustmentReason.trim(),
          providerReference: adjustmentProviderRef.trim() || undefined,
        }),
      });
      setNotice({ type: "success", message: `Adjustment saved for payout ${selected.id}.` });
      setAdjustmentAmount("");
      setAdjustmentReason("");
      setAdjustmentProviderRef("");
      await Promise.all([load(pageIndex), loadAdjustments(selected.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create adjustment.");
    } finally {
      setActionBusyId(null);
    }
  };

  const openReconcileDialog = (row: PayoutRow) => {
    setPendingDialog({
      kind: "reconcile",
      row,
      title: "Reconcile payout",
      message: `Reconcile payout ${row.id} with provider status?`,
      confirmLabel: "Reconcile",
    });
  };

  const openRetryDialog = (row: PayoutRow) => {
    if (!canAction(row, "retry")) return;
    setPendingDialog({
      kind: "retry",
      row,
      title: "Retry payout",
      message: `Retry payout ${row.id}?`,
      confirmLabel: "Retry",
    });
  };

  const openOverrideDialog = (row: PayoutRow, action: OverrideAction, confirmLabel: string) => {
    if (!canAction(row, action)) return;
    setPendingDialog({
      kind: "override",
      row,
      action,
      title: `Confirm ${confirmLabel}`,
      message: `Provide a reason to ${confirmLabel} for payout ${row.id}.`,
      confirmLabel: confirmLabel,
      danger: action === "mark_failed" || action === "cancel",
    });
    setOverrideReason("");
  };

  const runPendingDialogAction = async () => {
    if (!pendingDialog) return;
    if (pendingDialog.kind === "reconcile") {
      await reconcileSingle(pendingDialog.row);
      closeActionDialog();
      return;
    }
    if (pendingDialog.kind === "retry") {
      await runAction(pendingDialog.row, "retry");
      closeActionDialog();
      return;
    }
    const reason = overrideReason.trim();
    if (!reason) {
      setError("Reason is required for payout override actions.");
      return;
    }
    await runAction(pendingDialog.row, pendingDialog.action, reason);
    closeActionDialog();
  };

  const exportFilteredRows = () => {
    const headers = [
      "payoutId",
      "sellerId",
      "orderId",
      "status",
      "amount",
      "currency",
      "retryEligible",
      "retryBlockedReason",
      "destinationVerificationStatus",
      "destinationType",
      "destinationActive",
      "providerStatus",
      "updatedAt",
    ];
    const lines = [headers.map(csvCell).join(",")];
    for (const row of filteredRows) {
      lines.push(
        [
          row.id,
          row.sellerId,
          row.orderId ?? "",
          row.status,
          row.amount,
          row.currency,
          row.retryEligible ? "yes" : "no",
          row.retryBlockedReason ?? "",
          row.destinationVerificationStatus ?? "",
          row.destinationType ?? "",
          row.destinationActive ? "active" : "inactive",
          row.providerStatus ?? "",
          row.updatedAt,
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const exportTimestamp = new Date().toISOString().replace(/[:.]/g, "-").replace(/T/, "_").replace(/Z$/, "");
    link.download = `admin-payouts-${exportTimestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminWorkspaceLayout
      title="Payouts manager"
      description="Manage seller payouts, retries, reconciliation, destination verification, suspension controls, and payout adjustments."
      onRefresh={() => void load(pageIndex)}
    >
      <main className="space-y-6">

        {notice ? (
          <div
            className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {notice.type === "success" ? <ShieldCheck className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
            {notice.message}
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <CircleAlert className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-6">
          <Stat label="Total" value={stats.total} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Paid" value={stats.paid} />
          <Stat label="Failed" value={stats.failed} />
          <Stat label="Cancelled" value={stats.cancelled} />
          <Stat label="Attempts" value={stats.attempts} />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-600">
              Last refresh: <span className="font-semibold text-zinc-900">{toDate(lastRefreshAt)}</span>
            </div>
            <button
                type="button"
                onClick={() => navigateToAdminPayoutDestinations()}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                <ShieldCheck className="h-4 w-4" />
               Seller Destination Requests
              </button>
            <button
              type="button"
              onClick={() => void reconcilePending()}
              disabled={batchReconciling}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {batchReconciling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
              Reconcile pending payouts
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by payout ID, seller ID, or order ID"
                className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none ring-zinc-300 focus:ring"
              />

              <div className="min-w-[220px]">
                <FormDropdown
                  label="Status"
                  value={statusFilter}
                  options={STATUS_FILTER_OPTIONS}
                  onChange={(value) => setStatusFilter(value as StatusFilter)}
                  placeholder="All statuses"
                  searchPlaceholder="Search statuses..."
                />
              </div>

              <button
                type="button"
                onClick={() => setRetryEligibleOnly((prev) => !prev)}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold ${
                  retryEligibleOnly
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                Retry-eligible only
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-500">
                Showing page <span className="text-zinc-900">{pageIndex + 1}</span> of <span className="text-zinc-900">{totalPages}</span> •
                loaded <span className="text-zinc-900">{rows.length}</span> / <span className="text-zinc-900">{totalRows}</span> rows •
                filtered view <span className="text-zinc-900">{filteredRows.length}</span> rows
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportFilteredRows}
                  disabled={filteredRows.length === 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export filtered CSV
                </button>
                <button
                  type="button"
                  onClick={() => void load(Math.max(0, pageIndex - 1))}
                  disabled={pageIndex === 0 || refreshing}
                  className="inline-flex items-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => void load(pageIndex + 1)}
                  disabled={!hasMoreRows || refreshing}
                  className="inline-flex items-center gap-1 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payout queue...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-600">
              No payouts matched the current filters.
            </div>
          ) : (
            filteredRows.map((row) => {
              const busy = actionBusyId === row.id;

              return (
                <PayoutQueueCard
                  key={row.id}
                  row={row}
                  busy={busy}
                  visibleActions={visibleActions}
                  canAction={canAction}
                  statusTone={statusTone}
                  formatStatus={formatStatus}
                  onOpenDetails={() => setSelectedId(row.id)}
                  onOpenReconcile={() => openReconcileDialog(row)}
                  onOpenRetry={() => openRetryDialog(row)}
                  onOpenOverride={(action, confirmLabel) => openOverrideDialog(row, action, confirmLabel)}
                />
              );
            })
          )}
        </section>
      </main>

      {selected ? (
        <PayoutDetailDrawer
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
          onClose={() => setSelectedId(null)}
          onOpenRetryDialog={() => openRetryDialog(selected)}
          onOpenOverrideDialog={(action, confirmLabel) => openOverrideDialog(selected, action, confirmLabel)}
          onOpenReconcileDialog={() => openReconcileDialog(selected)}
          onDestinationStatusChange={setDestinationStatus}
          onDestinationReasonChange={setDestinationReason}
          onUpdateDestinationVerification={() => void updateDestinationVerification()}
          onSellerControlReasonChange={setSellerControlReason}
          onUpdateSellerSuspension={(suspended) => void updateSellerSuspension(suspended)}
          onReloadAdjustments={() => void loadAdjustments(selected.id)}
          onAdjustmentTypeChange={setAdjustmentType}
          onAdjustmentAmountChange={setAdjustmentAmount}
          onAdjustmentReasonChange={setAdjustmentReason}
          onAdjustmentProviderRefChange={setAdjustmentProviderRef}
          onCreateAdjustment={() => void createAdjustment()}
        />
      ) : null}

      <ActionModal
        open={Boolean(pendingDialog)}
        title={pendingDialog?.title ?? "Confirm action"}
        message={pendingDialog?.message ?? ""}
        confirmLabel={pendingDialog?.confirmLabel ?? "Confirm"}
        cancelLabel="Cancel"
        loading={Boolean(actionBusyId)}
        danger={pendingDialog?.danger}
        inputType={pendingDialog?.kind === "override" ? "textarea" : undefined}
        inputLabel={pendingDialog?.kind === "override" ? "Reason" : undefined}
        inputValue={pendingDialog?.kind === "override" ? overrideReason : undefined}
        inputPlaceholder={pendingDialog?.kind === "override" ? "Enter reason" : undefined}
        onInputChange={(value) => setOverrideReason(value)}
        onConfirm={() => void runPendingDialogAction()}
        onCancel={closeActionDialog}
      />
    </AdminWorkspaceLayout>
  );
}

export default function AdminPayoutsManager() {
  return <AdminPayoutsManagerContent />;
}
