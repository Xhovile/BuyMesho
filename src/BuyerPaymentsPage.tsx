import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2, Trash2 } from "lucide-react";

import MarketHeaderBar from "./components/shared/MarketHeaderBar";
import { formatMoney } from "./shared/utils/formatMoney";
import { navigateToPath } from "./lib/appNavigation";
import { ORDER_TRACKING_BASE_PATH, TICKETS_PATH } from "./lib/appNavigation.paths";
import { clearBuyerPaymentRecords, readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";
import { summarizePayments } from "./lib/paymentsOverview";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import { getCachedBuyerOrders, hasCachedBuyerOrders, setCachedBuyerOrders } from "./lib/buyerOrdersCache";
import { apiFetch } from "./lib/api";
import type { OrderBundle } from "./lib/orderApi";

type PaymentFilter = "all" | "pending" | "paid" | "rejected" | "error";

function statusPillClass(status: "pending" | "paid" | "rejected" | "error") {
  if (status === "paid") return "bg-bm-success-bg text-bm-success";
  if (status === "rejected") return "bg-bm-warning-bg text-bm-warning";
  if (status === "error") return "bg-bm-danger-bg text-bm-danger";
  return "bg-bm-surface-raised dark:bg-bm-skeleton text-bm-text-muted dark:text-bm-text-muted";
}

const FILTERS: Array<{ key: Exclude<PaymentFilter, "all">; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "error", label: "Error" },
];

export default function BuyerPaymentsPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <BuyerPaymentsPageContent />;
}

function BuyerPaymentsPageContent() {
  const [orders, setOrders] = useState<OrderBundle[]>(() => getCachedBuyerOrders() ?? []);
  const [paymentRecords, setPaymentRecords] = useState<BuyerPaymentRecord[]>([]);
  const [loading, setLoading] = useState(() => !hasCachedBuyerOrders());
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");

  useEffect(() => {
    let mounted = true;

    const syncLocal = () => {
      if (mounted) setPaymentRecords(readBuyerPayments());
    };

    syncLocal();

    const cachedOrders = getCachedBuyerOrders();
    if (cachedOrders) {
      setOrders(cachedOrders);
      setLoading(false);
      window.addEventListener("storage", syncLocal);
      window.addEventListener("focus", syncLocal);
      return () => {
        mounted = false;
        window.removeEventListener("storage", syncLocal);
        window.removeEventListener("focus", syncLocal);
      };
    }

    void (async () => {
      try {
        const data = await apiFetch("/api/payments/orders/me", {
          timeoutMs: 30000,
          retryAttempts: 1,
        });
        if (!mounted) return;
        const nextOrders = Array.isArray(data) ? (data as OrderBundle[]) : [];
        setOrders(nextOrders);
        setCachedBuyerOrders(nextOrders);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load purchases.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    window.addEventListener("storage", syncLocal);
    window.addEventListener("focus", syncLocal);

    return () => {
      mounted = false;
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener("focus", syncLocal);
    };
  }, []);

  const summary = useMemo(() => summarizePayments(orders, paymentRecords), [orders, paymentRecords]);

  const visibleRecords = useMemo(() => {
    if (activeFilter === "all") return summary.records;
    return summary.records.filter((record) => record.status === activeFilter);
  }, [activeFilter, summary.records]);

  const handleClearLogs = () => {
    const confirmed = window.confirm("Clear the purchase logs on this device? This only resets the local view.");
    if (!confirmed) return;

    clearBuyerPaymentRecords();
    setOrders([]);
    setCachedBuyerOrders([]);
    setPaymentRecords([]);
    setActiveFilter("all");
    setError(null);
  };

  const toggleFilter = (filter: PaymentFilter) => {
    setActiveFilter((current) => (current === filter ? "all" : filter));
  };

  const openTracking = (reference: string, flowType: string) => {
  if (flowType === "listing_only" || flowType === "unknown") {
    navigateToPath(`${ORDER_TRACKING_BASE_PATH}/${encodeURIComponent(reference)}`);
    return;
  }

  navigateToPath(`${TICKETS_PATH}?reference=${encodeURIComponent(reference)}`);
};

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <MarketHeaderBar subtitle="Purchases" />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Purchases</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-4xl">
              Purchase activity
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-bm-text-muted dark:text-bm-text-muted sm:text-base">
              Review payment records, open the order trail, and track payment outcomes from one screen.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearLogs}
            className="inline-flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-brand px-4 py-3 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
          >
            <Trash2 className="h-4 w-4" />
            Clear logs
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-bm-border dark:border-bm-border pb-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">Purchase feed</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-bm-text dark:text-bm-text">Your purchase records</h2>
          </div>
          <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle">
            Showing <span className="font-bold text-bm-text dark:text-bm-text-muted">{visibleRecords.length}</span> of <span className="font-bold text-bm-text dark:text-bm-text-muted">{summary.records.length}</span>
            {loading ? <span className="ml-2 font-medium text-bm-text-subtle dark:text-bm-text-subtle">Syncing…</span> : null}
          </p>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm font-semibold text-bm-text-muted dark:text-bm-text-muted shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-bm-text-subtle dark:text-bm-text-subtle" />
            Syncing purchases…
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            const count = summary.statusCounts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                className={`group flex min-h-[5.75rem] flex-col justify-between rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 ${
                  active
                    ? "border-bm-brand bg-bm-brand text-bm-on-brand shadow-bm-brand/20"
                    : "border-bm-border dark:border-bm-border bg-bm-surface text-bm-text dark:text-bm-text hover:border-bm-border hover:bg-bm-surface"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? "text-bm-on-brand" : "text-bm-text-subtle dark:text-bm-text-subtle"}`}>
                    {label}
                  </p>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${active ? "bg-bm-on-brand/15 text-bm-on-brand" : "bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-subtle dark:text-bm-text-subtle group-hover:bg-bm-surface-raised/70"}`}>
                    Sort
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-black leading-none tracking-tight sm:text-3xl">{count}</p>
                  <span className={`h-1.5 w-8 rounded-full ${active ? "bg-bm-surface/60" : "bg-bm-surface-raised dark:bg-bm-skeleton group-hover:bg-bm-brand-hover"}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
          <p>
            Showing <span className="font-bold text-bm-text dark:text-bm-text-muted">{visibleRecords.length}</span> of <span className="font-bold text-bm-text dark:text-bm-text-muted">{summary.records.length}</span> records
            {activeFilter === "all" ? "" : ` filtered by ${activeFilter}.`}
          </p>
          {activeFilter !== "all" ? (
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="font-bold text-bm-text dark:text-bm-text-muted underline decoration-zinc-300 underline-offset-4 hover:text-bm-text"
            >
              Show all
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-bm-danger/25 bg-bm-danger-bg px-4 py-3 text-sm text-bm-danger">
            {error}
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          {visibleRecords.length ? (
            visibleRecords.map((record) => (
              <div
                key={record.key}
                role="button"
                tabIndex={0}
                onClick={() => openTracking(record.reference, record.flowType)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTracking(record.reference, record.flowType);
                  }
                }}
                className="w-full cursor-pointer rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-5 py-5 text-left transition hover:border-bm-border hover:bg-bm-surface-muted/40"
                aria-label={`Open tracking for ${record.title}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-black text-bm-text dark:text-bm-text">{record.title}</p>
                    <p className="text-sm text-bm-text-subtle dark:text-bm-text-subtle">{record.reference}</p>
                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${statusPillClass(record.status)}`}>
                    {record.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bm-border-subtle dark:border-bm-border-subtle pt-4">
                  <p className="text-base font-black text-bm-text dark:text-bm-text">{formatMoney(record.amount, record.currency)}</p>
                  <p className="text-sm leading-6 text-bm-text-muted dark:text-bm-text-muted">{record.detail}</p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-bm-border-subtle dark:border-bm-border-subtle pt-4">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openTracking(record.reference, record.flowType);
                    }}
                    className="inline-flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
                  >
                    Order Details
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-bm-border dark:border-bm-border bg-bm-surface px-4 py-4 text-sm text-bm-text-muted dark:text-bm-text-muted">
              No purchases have been recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
