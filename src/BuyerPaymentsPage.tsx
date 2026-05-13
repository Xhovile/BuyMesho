import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { formatMoney } from "./shared/utils/formatMoney";
import {
  CART_PATH,
  PAYMENTS_HUB_PATH,
  navigateBackOrPath,
  navigateToOrderTracking,
  navigateToPath,
} from "./lib/appNavigation";
import { readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";
import { summarizePayments } from "./lib/paymentsOverview";
import { fetchMyOrders, type OrderBundle } from "./lib/orderApi";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

function statusPillClass(status: "pending" | "paid" | "rejected" | "error") {
  if (status === "paid") return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "border border-amber-200 bg-amber-50 text-amber-800";
  if (status === "error") return "border border-red-200 bg-red-50 text-red-700";
  return "border border-zinc-200 bg-zinc-100 text-zinc-700";
}

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
            onClick={() => navigateToPath(CART_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
          >
            <ShoppingCart className="h-4 w-4" />
            Cart
          </button>
        </div>

        <div className="mt-8 border-b border-zinc-200 pb-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            Buyer analytics
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
            Buyer payments and order flow
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 sm:text-base">
            Review payment outcomes, open order tracking, and monitor escrow-related activity from one continuous page.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Pending</p>
            <p className="mt-3 text-3xl font-black text-zinc-950">{summary.statusCounts.pending}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Paid</p>
            <p className="mt-3 text-3xl font-black text-zinc-950">{summary.statusCounts.paid}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Rejected</p>
            <p className="mt-3 text-3xl font-black text-zinc-950">{summary.statusCounts.rejected}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Error</p>
            <p className="mt-3 text-3xl font-black text-zinc-950">{summary.statusCounts.error}</p>
          </div>
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
          ) : summary.records.length ? (
            summary.records.map((record) => (
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
                  <p className="text-base font-black text-zinc-950">
                    {formatMoney(record.amount, record.currency)}
                  </p>

                  <p className="text-sm leading-6 text-zinc-600">
                    {record.detail}
                  </p>
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
