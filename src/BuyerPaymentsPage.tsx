import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { formatMoney } from "./shared/utils/formatMoney";
import { PAYMENTS_HUB_PATH, navigateBackOrPath, navigateToOrderTracking } from "./lib/appNavigation";
import { clearBuyerPaymentRecords, readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";
import { summarizePayments } from "./lib/paymentsOverview";
import { fetchMyOrders, type OrderBundle } from "./lib/orderApi";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

type PaymentFilter = "all" | "pending" | "paid" | "rejected" | "error";

function statusPillClass(status: "pending" | "paid" | "rejected" | "error") {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-amber-100 text-amber-800";
  if (status === "error") return "bg-red-100 text-red-700";
  return "bg-zinc-200 text-zinc-700";
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
  const [orders, setOrders] = useState<OrderBundle[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<BuyerPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PaymentFilter>("all");

  useEffect(() => {
    let mounted = true;

    const syncLocal = () => {
      if (mounted) setPaymentRecords(readBuyerPayments());
    };

    void (async () => {
      syncLocal();
      try {
        const data = await fetchMyOrders();
        if (!mounted) return;
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load buyer orders.");
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
    const confirmed = window.confirm("Clear the buyer payment logs on this device? This only resets the local view.");
    if (!confirmed) return;

    clearBuyerPaymentRecords();
    setOrders([]);
    setPaymentRecords([]);
    setActiveFilter("all");
    setError(null);
  };

  const toggleFilter = (filter: PaymentFilter) => {
    setActiveFilter((current) => (current === filter ? "all" : filter));
  };

  const currentSortLabel = activeFilter === "all" ? "All" : activeFilter;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(PAYMENTS_HUB_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Payments page
          </button>

          <button
            type="button"
            onClick={handleClearLogs}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
          >
            <Trash2 className="h-4 w-4" />
            Clear logs
          </button>
        </div>

        <div className="mt-8 border-b border-zinc-200 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Buyer analytics</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            Buyer payments and order flow
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
            Review payment outcomes, open order tracking, and monitor escrow-related activity from one continuous page.
          </p>
        </div>

        <div className="mt-6">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Click to Sort</p>
          <p className="mt-1 text-sm text-zinc-600">
            Current sort: <span className="font-bold text-zinc-900">{currentSortLabel}</span>
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-200 p-px shadow-sm md:grid-cols-4">
          {FILTERS.map(({ key, label }) => {
            const active = activeFilter === key;
            const count = summary.statusCounts[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                className={`flex aspect-square flex-col justify-between p-4 text-left transition-colors md:p-5 ${
                  active ? "bg-zinc-950 text-white" : "bg-white text-zinc-900 hover:bg-zinc-50"
                }`}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-xs font-black uppercase tracking-[0.18em] ${active ? "text-zinc-300" : "text-zinc-400"}`}>
                    {label}
                  </p>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${active ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                    Sort
                  </span>
                </div>
                <div className="flex flex-1 items-end">
                  <p className="text-4xl font-black leading-none tracking-tight md:text-5xl">{count}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-500">
          <p>
            Showing <span className="font-bold text-zinc-800">{visibleRecords.length}</span> of <span className="font-bold text-zinc-800">{summary.records.length}</span> records
            {activeFilter === "all" ? "" : ` filtered by ${activeFilter}.`}
          </p>
          {activeFilter !== "all" ? (
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="font-bold text-zinc-800 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950"
            >
              Show all
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          {loading ? (
            <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-600">
              Loading payment activity…
            </p>
          ) : visibleRecords.length ? (
            visibleRecords.map((record) => (
              <button
                key={record.key}
                type="button"
                onClick={() => navigateToOrderTracking(record.reference)}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-5 text-left transition hover:border-zinc-300 hover:bg-zinc-100/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-black text-zinc-950">{record.title}</p>
                    <p className="text-sm text-zinc-500">{record.reference}</p>
                  </div>

                  <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${statusPillClass(record.status)}`}>
                    {record.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                  <p className="text-base font-black text-zinc-950">{formatMoney(record.amount, record.currency)}</p>
                  <p className="text-sm leading-6 text-zinc-600">{record.detail}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-600">
              No buyer payments have been recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
