import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { formatMoney } from "./shared/utils/formatMoney";
import {
  PAYMENTS_HUB_PATH,
  navigateBackOrPath,
} from "./lib/appNavigation";
import { readBuyerPayments, type BuyerPaymentRecord } from "./lib/buyerState";
import { summarizePayments } from "./lib/paymentsOverview";
import { fetchMyOrders, type OrderBundle } from "./lib/orderApi";

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-zinc-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{hint}</p>
    </div>
  );
}

export default function BalancePage() {
  const [orders, setOrders] = useState<OrderBundle[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<BuyerPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncLocal = () => {
      if (!cancelled) setPaymentRecords(readBuyerPayments());
    };

    void (async () => {
      setLoading(true);
      setError(null);
      syncLocal();

      try {
        const data = await fetchMyOrders();
        if (!cancelled) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          setOrders([]);
          setError(err instanceof Error ? err.message : "Could not load balance details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    window.addEventListener("storage", syncLocal);
    window.addEventListener("focus", syncLocal);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener("focus", syncLocal);
    };
  }, []);

  const summary = useMemo(() => summarizePayments(orders, paymentRecords), [orders, paymentRecords]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(PAYMENTS_HUB_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-zinc-600">Balance</p>

        <section className="mt-2 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-500 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">Financial summary</h1>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{error}</div>
          ) : null}

          {loading ? (
            <p className="mt-6 rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Loading balance…</p>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Available balance" value={formatMoney(summary.balance.available)} hint="Released or completed order value." />
              <StatCard label="Pending balance" value={formatMoney(summary.balance.pending)} hint="Payments waiting for confirmation." />
              <StatCard label="Paid balance" value={formatMoney(summary.balance.paid)} hint="Successful paid order value." />
              <StatCard label="Rejected balance" value={formatMoney(summary.balance.rejected)} hint="Cancelled or refunded payment value." />
              <StatCard label="Held / disputed" value={formatMoney(summary.balance.held)} hint="Escrow held or disputed amounts." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
