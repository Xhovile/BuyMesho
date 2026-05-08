import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeInfo, CircleAlert, CreditCard, Loader2, RefreshCw, ShieldCheck, Webhook, X } from "lucide-react";
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
  verified: number;
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

type WebhookEventRow = { id: number; reference: string | null; event_type: string | null; signature_valid: number; payload: string | null; created_at: string; };

type SummaryResponse = { summary: { total_payments: number; verified_payments: number; paid_payments: number; pending_payments: number; }; webhookSummary: { total_webhooks: number; valid_webhooks: number; invalid_webhooks: number; }; };

const pill = (tone: string) => ({
  zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
}[tone] || "bg-zinc-100 text-zinc-700 border-zinc-200");

const StatusPill = ({ label, tone = "zinc" }: { label: string; tone?: string }) => <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${pill(tone)}`}>{label}</span>;

export default function AdminPaymentsConsole() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"payments" | "webhooks">("payments");
  const [selectedReference, setSelectedReference] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [p, w, s] = await Promise.all([apiFetch("/api/admin/payments"), apiFetch("/api/admin/webhook-events"), apiFetch("/api/admin/payment-summary")]);
      setPayments(Array.isArray(p) ? p : []);
      setWebhookEvents(Array.isArray(w) ? w : []);
      setSummary(s as SummaryResponse);
    } catch (e: any) {
      setError(e?.message || "Failed to load payment monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => { void load(); }, []);

  const stats = useMemo(() => ({
    totalPayments: summary?.summary.total_payments ?? payments.length,
    verifiedPayments: summary?.summary.verified_payments ?? payments.filter((p) => Number(p.verified) === 1).length,
    paidPayments: summary?.summary.paid_payments ?? payments.filter((p) => ["paid", "captured"].includes(p.payment_status)).length,
    pendingPayments: summary?.summary.pending_payments ?? payments.filter((p) => p.payment_status === "pending").length,
    totalWebhooks: summary?.webhookSummary.total_webhooks ?? webhookEvents.length,
    validWebhooks: summary?.webhookSummary.valid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 1).length,
    invalidWebhooks: summary?.webhookSummary.invalid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 0).length,
  }), [payments, webhookEvents, summary]);

  const latest = payments[0] ?? null;
  const selected = payments.find((p) => p.reference === selectedReference) ?? null;
  const selectedHooks = selectedReference ? webhookEvents.filter((e) => e.reference === selectedReference) : [];

  const close = () => setSelectedReference(null);

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
            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">Admin monitoring only. Buyer order status belongs elsewhere.</p>
          </div>
          <div className="flex overflow-hidden rounded-2xl border border-zinc-200">
            <button type="button" onClick={() => setActiveTab("payments")} className={`px-5 py-3 text-left ${activeTab === "payments" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"}`}>Payments<br /><span className="text-lg font-black">{stats.totalPayments}</span></button>
            <div className="w-px bg-zinc-200" />
            <button type="button" onClick={() => setActiveTab("webhooks")} className={`px-5 py-3 text-left ${activeTab === "webhooks" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"}`}>Webhooks<br /><span className="text-lg font-black">{stats.totalWebhooks}</span></button>
          </div>
        </section>

        {latest ? <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5" /><h2 className="text-lg font-black">Latest transaction lifecycle</h2></div><div className="mt-4 grid gap-3 md:grid-cols-5"><div className="rounded-2xl border border-zinc-900 bg-zinc-900 p-4 text-white"><p className="text-sm font-black">Payment created</p><p className="mt-2 text-xs text-zinc-200">{new Date(latest.created_at).toLocaleString()}</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm font-black">Webhook received</p><p className="mt-2 text-xs text-zinc-500">{latest.provider_reference || latest.reference}</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm font-black">Order confirmed</p><p className="mt-2 text-xs text-zinc-500">{latest.order_status || "pending_payment"}</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm font-black">Escrow active</p><p className="mt-2 text-xs text-zinc-500">{latest.escrow_state || "pending"}</p></div><div className="rounded-2xl border border-zinc-200 bg-white p-4"><p className="text-sm font-black">Final state</p><p className="mt-2 text-xs text-zinc-500">{latest.escrow_state || latest.order_status || "pending"}</p></div></div></section> : null}

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        {activeTab === "payments" ? <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden"><div className="border-b border-zinc-100 px-5 py-4"><div className="flex items-center gap-2"><CreditCard className="h-5 w-5" /><h2 className="text-lg font-black">Payment records</h2></div></div>{loading ? <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div> : payments.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">No payments found.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-4 text-left">Reference</th><th className="p-4 text-left">Payment</th><th className="p-4 text-left">Order</th><th className="p-4 text-left">Escrow</th><th className="p-4 text-left">Amount</th><th className="p-4 text-left">Updated</th></tr></thead><tbody>{payments.map((payment) => (<tr key={payment.id} className="border-t border-zinc-100 hover:bg-zinc-50 cursor-pointer" onClick={() => setSelectedReference(payment.reference)}><td className="p-4"><p className="font-mono text-xs break-all">{payment.reference}</p><p className="text-[11px] text-zinc-400">{payment.provider}</p></td><td className="p-4"><StatusPill label={payment.payment_status} tone={payment.payment_status === "pending" ? "amber" : payment.payment_status === "captured" || payment.payment_status === "paid" ? "emerald" : "zinc"} /><div className="mt-2 text-xs text-zinc-500">{payment.method}</div></td><td className="p-4"><StatusPill label={payment.order_status || "—"} tone={payment.order_status === "fulfilled" ? "emerald" : payment.order_status === "refunded" ? "rose" : payment.order_status === "in_escrow" || payment.order_status === "paid" ? "blue" : "zinc"} /><div className="mt-2 text-xs text-zinc-500 break-all">{payment.order_id}</div></td><td className="p-4"><StatusPill label={payment.escrow_state || "—"} tone={payment.escrow_state === "released" ? "emerald" : payment.escrow_state === "refunded" ? "rose" : payment.escrow_state === "disputed" ? "blue" : payment.escrow_state === "initiated" ? "amber" : "zinc"} /><div className="mt-2 text-xs text-zinc-500">{payment.escrow_id || "No escrow yet"}</div></td><td className="p-4"><div className="font-bold">{payment.currency} {payment.amount}</div></td><td className="p-4 text-xs text-zinc-500">{new Date(payment.updated_at).toLocaleString()}</td></tr>))}</tbody></table></div>}</section> : <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden"><div className="border-b border-zinc-100 px-5 py-4"><div className="flex items-center gap-2"><Webhook className="h-5 w-5" /><h2 className="text-lg font-black">Webhook log</h2></div></div>{loading ? <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div> : webhookEvents.length === 0 ? <div className="p-8 text-center text-sm text-zinc-500">No webhook events captured yet.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-4 text-left">Event</th><th className="p-4 text-left">Reference</th><th className="p-4 text-left">Signature</th><th className="p-4 text-left">Received</th></tr></thead><tbody>{webhookEvents.map((event) => (<tr key={event.id} className="border-t border-zinc-100"><td className="p-4">{event.event_type || "—"}</td><td className="p-4 font-mono text-xs break-all">{event.reference || "—"}</td><td className="p-4">{event.signature_valid === 1 ? <StatusPill label="Valid" tone="emerald" /> : <StatusPill label="Invalid" tone="rose" />}</td><td className="p-4 text-zinc-500">{new Date(event.created_at).toLocaleString()}</td></tr>))}</tbody></table></div>}</section>}

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><ShieldCheck className="h-5 w-5" /></div><div className="space-y-2"><p className="text-sm font-black text-zinc-900">How to read this page</p><p className="text-sm leading-relaxed text-zinc-600">Pending means the payment has been created, but the webhook or verification step has not completed yet. Once confirmed, the order should move through paid and into escrow, and later to released or refunded.</p><p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><CircleAlert className="h-3.5 w-3.5" />Escrow control should stay in the order flow, not the admin page.</p></div></div></section>
      </main>

      {selected ? <div className="fixed inset-0 z-[90] flex bg-zinc-900/50 backdrop-blur-sm" onClick={close}><aside className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payment detail</p><h3 className="mt-1 text-lg font-black text-zinc-950">{selected.reference}</h3></div><button type="button" onClick={close} className="rounded-2xl border border-zinc-200 p-2 hover:bg-zinc-50"><X className="h-5 w-5 text-zinc-500" /></button></div><div className="space-y-5 p-5"><section className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5"><h4 className="text-base font-black">Core fields</h4><div className="mt-4 grid gap-3"><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Reference</span><span className="font-semibold text-zinc-900 break-all">{selected.reference}</span></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Provider reference</span><span className="font-semibold text-zinc-900 break-all">{selected.provider_reference || "—"}</span></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Payment status</span><StatusPill label={selected.payment_status} tone={selected.payment_status === "pending" ? "amber" : selected.payment_status === "captured" || selected.payment_status === "paid" ? "emerald" : "zinc"} /></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Order status</span><StatusPill label={selected.order_status || "—"} tone={selected.order_status === "fulfilled" ? "emerald" : selected.order_status === "refunded" ? "rose" : selected.order_status === "in_escrow" || selected.order_status === "paid" ? "blue" : "zinc"} /></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Escrow status</span><StatusPill label={selected.escrow_state || "—"} tone={selected.escrow_state === "released" ? "emerald" : selected.escrow_state === "refunded" ? "rose" : selected.escrow_state === "disputed" ? "blue" : selected.escrow_state === "initiated" ? "amber" : "zinc"} /></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Amount</span><span className="font-semibold text-zinc-900">{selected.currency} {Number(selected.amount).toLocaleString()}</span></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Order ID</span><span className="font-semibold text-zinc-900 break-all">{selected.order_id}</span></div><div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm"><span className="text-zinc-500">Escrow ID</span><span className="font-semibold text-zinc-900 break-all">{selected.escrow_id || "—"}</span></div></div></section><section className="rounded-[2rem] border border-zinc-200 bg-white p-5"><h4 className="text-base font-black">Matching webhook events</h4><div className="mt-4 space-y-3">{selectedHooks.length > 0 ? selectedHooks.map((event) => (<div key={event.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm"><div className="flex items-center justify-between gap-3"><p className="font-bold text-zinc-900">{event.event_type || "Webhook event"}</p><StatusPill label={event.signature_valid === 1 ? "Valid" : "Invalid"} tone={event.signature_valid === 1 ? "emerald" : "rose"} /></div>{event.payload ? <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-zinc-600 inline-flex items-center gap-2"><BadgeInfo className="h-3.5 w-3.5" />View payload</summary><pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-100">{event.payload}</pre></details> : null}</div>)) : <p className="text-sm text-zinc-500">No webhook events matched this reference.</p>}</div></section><section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><div className="flex items-center gap-2 font-black"><CircleAlert className="h-4 w-4" />Control note</div><p className="mt-2 leading-6">This drawer is for diagnosis only. Buyer-facing order actions still belong on the buyer tracking page, not here.</p></section></div></aside></div> : null}
    </div>
  );
}
