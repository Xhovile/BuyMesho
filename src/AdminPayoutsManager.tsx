import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeInfo,
  CircleAlert,
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import { navigateToAdmin } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { useIsAdmin } from "./hooks/useIsAdmin";
import { getVisibleAdminActions } from "./modules/payouts/uiModel";
import AdminRouteGuard from "./components/AdminRouteGuard";

type PayoutRow = {
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

type PayoutAdjustment = {
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

type OverrideAction = "hold" | "mark_paid" | "mark_failed" | "cancel";
type RowAction = "retry" | OverrideAction;

type StatusFilter = "all" | "pending" | "failed" | "held" | "paid" | "cancelled";

const PENDING_STATES = ["eligible", "queued", "processing", "pending", "held"];

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
  return value ? value.replace(/_/g, " ") : "—";
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-all font-medium text-zinc-900">{value}</p>
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

  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [payoutsData, summaryData] = await Promise.all([
        apiFetch("/api/admin/payouts"),
        apiFetch("/api/admin/payouts/summary"),
      ]);
      setRows(Array.isArray(payoutsData) ? (payoutsData as PayoutRow[]) : []);
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
    void load();
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
      await load();
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
      await load();
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
      await load();
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
      await load();
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
      await load();
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
      await Promise.all([load(), loadAdjustments(selected.id)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create adjustment.");
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOverride = (row: PayoutRow, action: OverrideAction, confirmLabel: string) => {
    if (!canAction(row, action)) return;
    const confirmed = window.confirm(`Confirm ${confirmLabel} for payout ${row.id}?`);
    if (!confirmed) return;
    const reason = window.prompt(`Reason for ${confirmLabel}`)?.trim();
    if (!reason) return;
    void runAction(row, action, reason);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button
            type="button"
            onClick={() => navigateToAdmin()}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </button>

          <button
            type="button"
            onClick={() => void load()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Payouts manager</h1>
          <p className="mt-3 max-w-3xl text-sm font-medium text-zinc-600">
            Manage seller payouts, retries, reconciliation, destination verification, suspension controls, and payout adjustments.
          </p>
        </section>

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
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by payout ID, seller ID, or order ID"
              className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm outline-none ring-zinc-300 focus:ring"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-semibold text-zinc-700"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending states</option>
              <option value="failed">Failed</option>
              <option value="held">Held</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

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
                <div key={row.id} className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(row.status)}`}>
                          {formatStatus(row.status)}
                        </span>
                        {row.retryEligible ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                            retry eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-600">
                            {row.retryBlockedReason ?? "retry unavailable"}
                          </span>
                        )}
                        {row.destinationVerificationStatus ? (
                          <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700">
                            destination {formatStatus(row.destinationVerificationStatus)}
                          </span>
                        ) : null}
                        {row.sellerSuspended ? (
                          <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                            seller suspended
                          </span>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2 xl:grid-cols-4">
                        <Info label="Payout ID" value={row.id} />
                        <Info label="Seller ID" value={row.sellerId} />
                        <Info label="Order ID" value={row.orderId ?? "—"} />
                        <Info label="Amount" value={`${row.currency} ${Number(row.amount).toLocaleString()}`} />
                        <Info label="Provider charge" value={row.providerChargeId ?? "—"} />
                        <Info label="Destination" value={row.destinationMaskedAccount ?? "—"} />
                        <Info label="Last attempt" value={row.latestAttemptNo ? `#${row.latestAttemptNo} (${row.latestAttemptStatus ?? "—"})` : "—"} />
                        <Info label="Audit snapshot" value={row.auditSummary?.latestEventType ? `${row.auditSummary.latestEventType} (${row.auditSummary.totalEvents ?? 0})` : "No audit events"} />
                      </div>

                      {row.lastError ? (
                        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          <strong>Last error:</strong> {row.lastError}
                        </p>
                      ) : null}

                      {Array.isArray(row.verificationBlockers) && row.verificationBlockers.length > 0 ? (
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                          <strong>Verification blockers:</strong> {row.verificationBlockers.join(" • ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:w-[340px] lg:justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.id)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                      >
                        <BadgeInfo className="h-4 w-4" />
                        Details
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const confirmed = window.confirm(`Reconcile payout ${row.id}?`);
                          if (!confirmed) return;
                          void reconcileSingle(row);
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Reconcile
                      </button>

                      {visibleActions.includes("retry") ? (
                        <button
                          type="button"
                          disabled={busy || !canAction(row, "retry")}
                          onClick={() => {
                            const confirmed = window.confirm(`Retry payout ${row.id}?`);
                            if (!confirmed) return;
                            void runAction(row, "retry");
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          Retry
                        </button>
                      ) : null}

                      {visibleActions.includes("hold") ? (
                        <button
                          type="button"
                          disabled={busy || !canAction(row, "hold")}
                          onClick={() => handleOverride(row, "hold", "hold")}
                          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          Hold
                        </button>
                      ) : null}

                      {visibleActions.includes("mark_paid") ? (
                        <button
                          type="button"
                          disabled={busy || !canAction(row, "mark_paid")}
                          onClick={() => handleOverride(row, "mark_paid", "mark paid")}
                          className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                          Mark paid
                        </button>
                      ) : null}

                      {visibleActions.includes("mark_failed") ? (
                        <button
                          type="button"
                          disabled={busy || !canAction(row, "mark_failed")}
                          onClick={() => handleOverride(row, "mark_failed", "mark failed")}
                          className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleAlert className="h-4 w-4" />}
                          Mark failed
                        </button>
                      ) : null}

                      {visibleActions.includes("cancel") ? (
                        <button
                          type="button"
                          disabled={busy || !canAction(row, "cancel")}
                          onClick={() => handleOverride(row, "cancel", "cancel")}
                          className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

      {selected ? (
        <div className="fixed inset-0 z-[90] flex bg-zinc-900/50 backdrop-blur-sm" onClick={() => setSelectedId(null)}>
          <aside className="ml-auto h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payout detail</p>
                <h3 className="mt-1 text-lg font-black text-zinc-950">{selected.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-2xl border border-zinc-200 p-2 hover:bg-zinc-50"
              >
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5">
                <h4 className="text-base font-black">Core fields</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Info label="Payout ID" value={selected.id} />
                  <Info label="Seller ID" value={selected.sellerId} />
                  <Info label="Order ID" value={selected.orderId ?? "—"} />
                  <Info label="Escrow ID" value={selected.escrowId ?? "—"} />
                  <Info label="Status" value={formatStatus(selected.status)} />
                  <Info label="Amount" value={`${selected.currency} ${Number(selected.amount).toLocaleString()}`} />
                  <Info label="Provider charge" value={selected.providerChargeId ?? "—"} />
                  <Info label="Provider ref" value={selected.providerReference ?? "—"} />
                  <Info label="Provider tx" value={selected.providerTransactionId ?? "—"} />
                  <Info label="Destination" value={selected.destinationMaskedAccount ?? "—"} />
                  <Info label="Requested at" value={toDate(selected.requestedAt)} />
                  <Info label="Updated at" value={toDate(selected.updatedAt)} />
                </div>
              </section>

              <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-black">Attempts and audit</h4>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Info
                    label="Latest attempt"
                    value={selected.latestAttemptNo ? `#${selected.latestAttemptNo} (${selected.latestAttemptStatus ?? "—"})` : "—"}
                  />
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
              </section>

              <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-black">Destination verification</h4>
                <div className="mt-3 grid gap-2">
                  <Info label="Destination ID" value={selected.destinationAccountId ?? "—"} />
                  <Info label="Current status" value={formatStatus(selected.destinationVerificationStatus)} />
                  <Info label="Last destination error" value={selected.destinationLastError ?? "—"} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <select
                    value={destinationStatus}
                    onChange={(event) => setDestinationStatus(event.target.value)}
                    className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    disabled={!selected.destinationAccountId || actionBusyId === selected.id}
                  >
                    <option value="pending">pending</option>
                    <option value="verified">verified</option>
                    <option value="failed">failed</option>
                    <option value="disabled">disabled</option>
                  </select>
                  <input
                    value={destinationReason}
                    onChange={(event) => setDestinationReason(event.target.value)}
                    placeholder="Reason (required for failed/disabled)"
                    className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                    disabled={!selected.destinationAccountId || actionBusyId === selected.id}
                  />
                  <button
                    type="button"
                    onClick={() => void updateDestinationVerification()}
                    disabled={!selected.destinationAccountId || actionBusyId === selected.id}
                    className="rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {actionBusyId === selected.id ? "Saving..." : "Update"}
                  </button>
                </div>
              </section>

              <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                <h4 className="text-base font-black">Seller payout suspension</h4>
                <p className="mt-2 text-sm text-zinc-600">
                  Current state: <span className="font-semibold text-zinc-900">{selected.sellerSuspended ? "Suspended" : "Active"}</span>
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    value={sellerControlReason}
                    onChange={(event) => setSellerControlReason(event.target.value)}
                    placeholder="Reason (required)"
                    className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                    disabled={actionBusyId === selected.id}
                  />
                  <button
                    type="button"
                    onClick={() => void updateSellerSuspension(true)}
                    disabled={actionBusyId === selected.id}
                    className="rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => void updateSellerSuspension(false)}
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
                  <button
                    type="button"
                    onClick={() => void loadAdjustments(selected.id)}
                    className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700"
                  >
                    Refresh adjustments
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Info label="Gross" value={`${selected.currency} ${Number(selected.grossAmount ?? 0).toLocaleString()}`} />
                  <Info label="Net" value={`${selected.currency} ${Number(selected.netAmount ?? selected.amount).toLocaleString()}`} />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr]">
                  <select
                    value={adjustmentType}
                    onChange={(event) => setAdjustmentType(event.target.value as "processing_fee" | "manual_adjustment")}
                    className="rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"
                    disabled={actionBusyId === selected.id}
                  >
                    <option value="manual_adjustment">Manual payout adjustment</option>
                    <option value="processing_fee">Legacy compatibility amount (hidden)</option>
                  </select>
                  <input
                    value={adjustmentAmount}
                    onChange={(event) => setAdjustmentAmount(event.target.value)}
                    placeholder="Amount"
                    className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                    disabled={actionBusyId === selected.id}
                  />
                  <input
                    value={adjustmentReason}
                    onChange={(event) => setAdjustmentReason(event.target.value)}
                    placeholder="Reason"
                    className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                    disabled={actionBusyId === selected.id}
                  />
                  <input
                    value={adjustmentProviderRef}
                    onChange={(event) => setAdjustmentProviderRef(event.target.value)}
                    placeholder="Provider reference (optional)"
                    className="rounded-2xl border border-zinc-200 px-3 py-2.5 text-sm"
                    disabled={actionBusyId === selected.id}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void createAdjustment()}
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
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-600">
                      No adjustments recorded for this payout.
                    </div>
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
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminPayoutsManager() {
  return (
    <AdminRouteGuard>
      <AdminPayoutsManagerContent />
    </AdminRouteGuard>
  );
}
