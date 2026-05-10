import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Webhook,
  CreditCard,
  BadgeInfo,
  CircleAlert,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import { navigateToAdmin } from "./lib/appNavigation";

type PaymentRow = {
  id: string;
  order_id: string;
  provider: string;
  method: string;
  payment_status: string;
  reference: string;
  provider_reference: string | null;
  currency: string;
  amount: number;
  checkout_url: string | null;
  paid_at: string | null;
  verified: number;
  verification: string | null;
  created_at: string;
  updated_at: string;
  order_status: string | null;
  order_paid_at: string | null;
  order_fulfilled_at: string | null;
  escrow_id: string | null;
  escrow_state: string | null;
  balance_amount: number | null;
  balance_currency: string | null;
  escrow_updated_at: string | null;
};

type WebhookEventRow = {
  id: number;
  provider: string;
  reference: string | null;
  event_type: string | null;
  signature_valid: number;
  payload: string | null;
  created_at: string;
};

type SummaryResponse = {
  summary: {
    total_payments: number;
    verified_payments: number;
    paid_payments: number;
    pending_payments: number;
  };
  webhookSummary: {
    total_webhooks: number;
    valid_webhooks: number;
    invalid_webhooks: number;
  };
};

function StatCard({ label, value, tone = "zinc" }: { label: string; value: number; tone?: "zinc" | "emerald" | "amber" | "blue" | "rose"; }) {
  const toneClass: Record<typeof tone, string> = {
    zinc: "text-zinc-900",
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    blue: "text-blue-700",
    rose: "text-rose-700",
  };
  return (<div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"><p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{label}</p><p className={`mt-1 text-2xl font-black tracking-tight ${toneClass[tone]}`}>{value}</p></div>);
}

function StatusPill({ label, tone = "zinc" }: { label: string; tone?: "zinc" | "emerald" | "amber" | "rose" | "blue"; }) {
  const toneClass: Record<typeof tone, string> = {
    zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${toneClass[tone]}`}>{label}</span>;
}

function LifecycleNode({ label, active, note }: { label: string; active: boolean; note?: string; }) {
  return (
    <div className={`rounded-2xl border p-4 ${active ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">{label}</p>
        <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-white" : "bg-zinc-300"}`} />
      </div>
      {note ? <p className={`mt-2 text-xs leading-5 ${active ? "text-zinc-200" : "text-zinc-500"}`}>{note}</p> : null}
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"payments" | "webhooks">("payments");

  const load = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [paymentsData, webhookData, summaryData] = await Promise.all([
        apiFetch("/api/admin/payments"),
        apiFetch("/api/admin/webhook-events"),
        apiFetch("/api/admin/payment-summary"),
      ]);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setWebhookEvents(Array.isArray(webhookData) ? webhookData : []);
      setSummary(summaryData ?? {});
    } catch (err: any) {
      setError(err?.message || "Failed to load payment monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
  totalPayments: summary?.summary?.total_payments ?? payments.length,
  verifiedPayments: summary?.summary?.verified_payments ?? payments.filter((p) => Number(p.verified) === 1).length,
  paidPayments: summary?.summary?.paid_payments ?? payments.filter((p) => ["paid", "captured"].includes(p.payment_status)).length,
  pendingPayments: summary?.summary?.pending_payments ?? payments.filter((p) => p.payment_status === "pending").length,
  totalWebhooks: summary?.webhookSummary?.total_webhooks ?? webhookEvents.length,
  validWebhooks: summary?.webhookSummary?.valid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 1).length,
  invalidWebhooks: summary?.webhookSummary?.invalid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 0).length,
}), [payments, webhookEvents, summary]);
  
  const latestPayment = payments[0] ?? null;
  const lifecycle = latestPayment
    ? [
        { label: "Payment created", active: true, note: new Date(latestPayment.created_at).toLocaleString() },
           { label: "Webhook received", active: Number(latestPayment.verified) === 1, note: latestPayment.provider_reference || latestPayment.reference },     
      { label: "Order confirmed", active: ["paid", "captured", "in_escrow", "fulfilled"].includes(latestPayment.order_status || ""), note: latestPayment.order_status || "pending_payment" },
        { label: "Escrow active", active: ["initiated", "active", "released", "refunded", "disputed"].includes(latestPayment.escrow_state || ""), note: latestPayment.escrow_state || "pending" },
        { label: "Final state", active: ["fulfilled", "released", "refunded"].includes(latestPayment.escrow_state || latestPayment.order_status || ""), note: latestPayment.escrow_state || latestPayment.order_status || "pending" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={() => navigateToAdmin()} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" />Back to Admin</button>
          <button type="button" onClick={() => void load()} disabled={refreshing} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60">{refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between px-1">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">Payments & Webhooks</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">This page shows the payment row, order row, escrow state, and the webhook delivery log in one place. Pending means the payment exists but has not yet been confirmed into the order/escrow flow.</p>
          </div>

          <div role="tablist" aria-label="View selector" className="flex items-stretch overflow-hidden rounded-2xl border border-zinc-200 shrink-0">
            <button type="button" role="tab" aria-selected={activeTab === "payments"} onClick={() => setActiveTab("payments")} className={`flex flex-col items-start px-5 py-3 text-left transition-colors ${activeTab === "payments" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"}`}>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">Payments</span>
              <span className="mt-0.5 text-lg font-black leading-none">{stats.totalPayments}</span>
            </button>
            <div className="w-px bg-zinc-200 self-stretch" />
            <button type="button" role="tab" aria-selected={activeTab === "webhooks"} onClick={() => setActiveTab("webhooks")} className={`flex flex-col items-start px-5 py-3 text-left transition-colors ${activeTab === "webhooks" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"}`}>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">Webhooks</span>
              <span className="mt-0.5 text-lg font-black leading-none">{stats.totalWebhooks}</span>
            </button>
          </div>
        </section>

        {latestPayment ? (
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-zinc-700" />
              <h2 className="text-lg font-black">Latest transaction lifecycle</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-5">
              {lifecycle.map((node) => <LifecycleNode key={node.label} label={node.label} active={node.active} note={node.note} />)}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Total payments" value={stats.totalPayments} />
          <StatCard label="Verified" value={stats.verifiedPayments} tone="emerald" />
          <StatCard label="Paid" value={stats.paidPayments} tone="blue" />
          <StatCard label="Pending" value={stats.pendingPayments} tone="amber" />
          <StatCard label="Webhooks" value={stats.totalWebhooks} />
          <StatCard label="Valid hooks" value={stats.validWebhooks} tone="emerald" />
          <StatCard label="Invalid hooks" value={stats.invalidWebhooks} tone="rose" />
        </section>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {activeTab === "payments" && (
          <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-zinc-700" /><h2 className="text-lg font-black">Payment records</h2></div></div>
            {loading ? <div className="flex items-center justify-center p-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div> : payments.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">No payments found.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-4 text-left">Reference</th><th className="p-4 text-left">Payment</th><th className="p-4 text-left">Order</th><th className="p-4 text-left">Escrow</th><th className="p-4 text-left">Verified</th><th className="p-4 text-left">Amount</th><th className="p-4 text-left">Updated</th></tr></thead><tbody>{payments.map((payment) => { const paymentTone = payment.payment_status === "captured" || payment.payment_status === "paid" ? "emerald" : payment.payment_status === "pending" ? "amber" : "zinc"; const orderTone = payment.order_status === "in_escrow" || payment.order_status === "paid" ? "blue" : payment.order_status === "fulfilled" ? "emerald" : payment.order_status === "refunded" ? "rose" : "zinc"; const escrowTone = payment.escrow_state === "initiated" ? "amber" : payment.escrow_state === "released" ? "emerald" : payment.escrow_state === "refunded" ? "rose" : payment.escrow_state === "disputed" ? "blue" : "zinc"; return (<tr key={payment.id} className="border-t border-zinc-100"><td className="p-4 align-top"><div className="space-y-1"><p className="font-mono text-xs break-all">{payment.reference}</p><p className="text-[11px] text-zinc-400">{payment.provider}</p></div></td><td className="p-4 align-top"><StatusPill label={payment.payment_status} tone={paymentTone as any} /><div className="mt-2 text-xs text-zinc-500">{payment.method}</div></td><td className="p-4 align-top"><StatusPill label={payment.order_status || "—"} tone={orderTone as any} /><div className="mt-2 text-xs text-zinc-500 break-all">{payment.order_id}</div></td><td className="p-4 align-top"><StatusPill label={payment.escrow_state || "—"} tone={escrowTone as any} /><div className="mt-2 text-xs text-zinc-500">{payment.escrow_id ? `Escrow: ${payment.escrow_id}` : "No escrow yet"}</div></td><td className="p-4 align-top">{Number(payment.verified) === 1 ? <StatusPill label="Verified" tone="emerald" /> : <StatusPill label="Unverified" tone="rose" />}</td><td className="p-4 align-top"><div className="font-bold text-zinc-900">{payment.currency} {payment.amount}</div><div className="mt-1 text-xs text-zinc-500">{payment.balance_currency && payment.balance_amount != null ? `Escrow balance: ${payment.balance_currency} ${payment.balance_amount}` : "No balance data"}</div></td><td className="p-4 align-top text-xs text-zinc-500">{new Date(payment.updated_at).toLocaleString()}</td></tr>);})}</tbody></table></div>}
          </section>
        )}

        {activeTab === "webhooks" && (
          <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4"><div className="flex items-center gap-2"><Webhook className="h-5 w-5 text-zinc-700" /><h2 className="text-lg font-black">Webhook log</h2></div></div>
            {loading ? <div className="flex items-center justify-center p-12 text-zinc-500"><Loader2 className="h-6 w-6 animate-spin" /></div> : webhookEvents.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">No webhook events captured yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-4 text-left">Event</th><th className="p-4 text-left">Reference</th><th className="p-4 text-left">Signature</th><th className="p-4 text-left">Received</th><th className="p-4 text-left">Payload</th></tr></thead><tbody>{webhookEvents.map((event) => (<tr key={event.id} className="border-t border-zinc-100"><td className="p-4 align-top">{event.event_type || "—"}</td><td className="p-4 align-top font-mono text-xs break-all">{event.reference || "—"}</td><td className="p-4 align-top">{Number(event.signature_valid) === 1 ? <StatusPill label="Valid" tone="emerald" /> : <StatusPill label="Invalid" tone="rose" />}</td><td className="p-4 align-top text-zinc-500">{new Date(event.created_at).toLocaleString()}</td><td className="p-4 align-top">{event.payload ? (<details className="group"><summary className="cursor-pointer list-none inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-bold text-zinc-700"><BadgeInfo className="h-3.5 w-3.5" />View payload</summary><pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-100">{event.payload}</pre></details>) : ("—")}</td></tr>))}</tbody></table></div>}
          </section>
        )}

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><ShieldCheck className="h-5 w-5" /></div>
            <div className="space-y-2">
              <p className="text-sm font-black text-zinc-900">How to read this page</p>
              <p className="text-sm leading-relaxed text-zinc-600">Pending means the payment has been created, but the webhook or verification step has not completed yet. Once confirmed, the order should move through paid and into escrow, and later to released or refunded. This page is the admin view only. The buyer should get a separate order-status screen later.</p>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><CircleAlert className="h-3.5 w-3.5" />Escrow control should stay in the order flow, not the admin page.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
