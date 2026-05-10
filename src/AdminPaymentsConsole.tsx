import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeInfo,
  CircleAlert,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Webhook,
  X,
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

type Tone = "zinc" | "emerald" | "amber" | "rose" | "blue";

type LifecycleState = "done" | "active" | "waiting" | "issue";

type LifecycleStep = {
  number: number;
  title: string;
  detail: string;
  state: LifecycleState;
};

const TONE_CLASSES: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
};

function StatusPill({ label, tone = "zinc" }: { label: string; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[tone]}`}>
      {label}
    </span>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function normalizeStatusLabel(value: string | null | undefined): string {
  return value ? value.replace(/_/g, " ") : "—";
}

function paymentTone(status: string): Tone {
  if (["captured", "paid"].includes(status)) return "emerald";
  if (status === "pending") return "amber";
  if (["failed", "cancelled"].includes(status)) return "rose";
  return "zinc";
}

function orderTone(status: string | null): Tone {
  if (!status) return "zinc";
  if (["fulfilled"].includes(status)) return "emerald";
  if (["refunded"].includes(status)) return "rose";
  if (["paid", "in_escrow", "pending_payment"].includes(status)) return "blue";
  if (["disputed"].includes(status)) return "amber";
  return "zinc";
}

function escrowTone(status: string | null): Tone {
  if (!status) return "zinc";
  if (status === "released") return "emerald";
  if (status === "refunded") return "rose";
  if (status === "disputed") return "amber";
  if (["initiated", "funded", "held"].includes(status)) return "blue";
  return "zinc";
}

function lifecycleTone(state: LifecycleState): Tone {
  if (state === "done") return "emerald";
  if (state === "active") return "blue";
  if (state === "issue") return "rose";
  return "zinc";
}

function LifecycleCard({ step }: { step: LifecycleStep }) {
  const stateLabel: Record<LifecycleState, string> = {
    done: "Done",
    active: "Active",
    waiting: "Waiting",
    issue: "Issue",
  };

  const palette: Record<LifecycleState, string> = {
    done: "border-emerald-200 bg-emerald-50/70 text-emerald-800",
    active: "border-blue-200 bg-blue-50/70 text-blue-800",
    waiting: "border-zinc-200 bg-white text-zinc-700",
    issue: "border-rose-200 bg-rose-50/70 text-rose-800",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${palette[step.state]}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 font-black text-zinc-900 shadow-sm">
          {step.number}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black tracking-tight text-zinc-900">{step.title}</h3>
            <StatusPill label={stateLabel[step.state]} tone={lifecycleTone(step.state)} />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.detail}</p>
        </div>
      </div>
    </div>
  );
}

function buildLifecycleSteps(payment?: PaymentRow | null, hooks: WebhookEventRow[] = []): LifecycleStep[] {
  const hasPayment = !!payment;
  const hasCheckout = !!payment?.checkout_url;
  const hasWebhook = hooks.length > 0;
  const hasValidWebhook = hooks.some((hook) => Number(hook.signature_valid) === 1);
  const isPaid = !!payment && (["paid", "captured"].includes(payment.payment_status) || !!payment.paid_at);
  const isEscrowActive = !!payment && (["in_escrow", "paid"].includes(payment.order_status ?? "") || !!payment.escrow_id);
  const isDelivered = !!payment && payment.order_status === "fulfilled";
  const isSettled = !!payment && ["released", "refunded"].includes(payment.escrow_state ?? "");
  const isDisputed = !!payment && payment.escrow_state === "disputed";

  return [
    {
      number: 1,
      title: "Payment created",
      detail: hasPayment
        ? "BuyMesho stored a payment row for this checkout attempt."
        : "No payment row exists yet.",
      state: hasPayment ? "done" : "waiting",
    },
    {
      number: 2,
      title: "Checkout opened",
      detail: hasCheckout
        ? "The buyer was sent to the provider checkout URL."
        : "Waiting for checkout creation.",
      state: hasCheckout ? "done" : hasPayment ? "active" : "waiting",
    },
    {
      number: 3,
      title: "Webhook received",
      detail: hasWebhook
        ? "PayChangu callback delivery was captured."
        : "No webhook event has arrived yet.",
      state: hasWebhook ? "active" : "waiting",
    },
    {
      number: 4,
      title: "Signature verified",
      detail: hasValidWebhook
        ? "At least one webhook signature passed verification."
        : hasWebhook
          ? "Webhook arrived, but verification has not passed yet."
          : "Waiting for a webhook to verify.",
      state: hasValidWebhook ? "done" : hasWebhook ? "active" : "waiting",
    },
    {
      number: 5,
      title: "Order confirmed",
      detail: isPaid
        ? "The order was marked paid and moved into the confirmed flow."
        : "The order is still pending confirmation.",
      state: isPaid ? "done" : "waiting",
    },
    {
      number: 6,
      title: "Escrow active",
      detail: isEscrowActive
        ? "Funds are represented as active escrow for the order."
        : "Escrow has not started yet.",
      state: isEscrowActive ? (isDisputed ? "issue" : "active") : "waiting",
    },
    {
      number: 7,
      title: "Buyer confirmed delivery",
      detail: isDelivered
        ? "The order has been marked fulfilled after delivery confirmation."
        : "Waiting for delivery confirmation.",
      state: isDelivered ? "done" : "waiting",
    },
    {
      number: 8,
      title: "Funds released or refunded",
      detail: isSettled
        ? payment?.escrow_state === "released"
          ? "Funds were released to the seller."
          : "Funds were refunded to the buyer."
        : "Final settlement has not happened yet.",
      state: payment?.escrow_state === "released"
        ? "done"
        : payment?.escrow_state === "refunded"
          ? "issue"
          : "waiting",
    },
  ];
}

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
      const [paymentsData, webhookData, summaryData] = await Promise.all([
        apiFetch("/api/admin/payments"),
        apiFetch("/api/admin/webhook-events"),
        apiFetch("/api/admin/payment-summary"),
      ]);

      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setWebhookEvents(Array.isArray(webhookData) ? webhookData : []);
      setSummary(summaryData as SummaryResponse);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load payment monitoring data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => ({
  totalPayments: summary?.summary?.total_payments ?? payments.length,
  verifiedPayments: summary?.summary?.verified_payments ?? payments.filter((p) => Number(p.verified) === 1).length,
  paidPayments: summary?.summary?.paid_payments ?? payments.filter((p) => ["paid", "captured"].includes(p.payment_status)).length,
  pendingPayments: summary?.summary?.pending_payments ?? payments.filter((p) => p.payment_status === "pending").length,
  totalWebhooks: summary?.webhookSummary?.total_webhooks ?? webhookEvents.length,
  validWebhooks: summary?.webhookSummary?.valid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 1).length,
  invalidWebhooks: summary?.webhookSummary?.invalid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 0).length,
}), [payments, webhookEvents, summary]);
  
  const latest = payments[0] ?? null;
  const selected = payments.find((p) => p.reference === selectedReference) ?? null;
  const selectedHooks = selectedReference ? webhookEvents.filter((e) => e.reference === selectedReference) : [];
  const lifecyclePayment = selected ?? latest;
  const lifecycleSteps = buildLifecycleSteps(lifecyclePayment, selectedReference ? selectedHooks : webhookEvents.filter((event) => !!latest && event.reference === latest.reference));

  const close = () => setSelectedReference(null);

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

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between px-1">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">Payments & Webhooks</h1>
            <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">
              Admin monitoring only. Buyer order status belongs elsewhere.
            </p>
          </div>

          <div className="flex overflow-hidden rounded-2xl border border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveTab("payments")}
              className={`px-5 py-3 text-left ${activeTab === "payments" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"}`}
            >
              Payments
              <br />
              <span className="text-lg font-black">{stats.totalPayments}</span>
            </button>
            <div className="w-px bg-zinc-200" />
            <button
              type="button"
              onClick={() => setActiveTab("webhooks")}
              className={`px-5 py-3 text-left ${activeTab === "webhooks" ? "bg-zinc-700 text-white" : "bg-zinc-100 text-zinc-500"}`}
            >
              Webhooks
              <br />
              <span className="text-lg font-black">{stats.totalWebhooks}</span>
            </button>
          </div>
        </section>

        {lifecyclePayment ? (
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h2 className="text-lg font-black">Transaction lifecycle</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              {selected
                ? `Showing the selected reference: ${selected.reference}`
                : `Showing the latest reference: ${lifecyclePayment.reference}`}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {lifecycleSteps.map((step) => (
                <LifecycleCard key={step.number} step={step} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <StatCard label="Total payments" value={stats.totalPayments} tone="zinc" />
          <StatCard label="Verified" value={stats.verifiedPayments} tone="emerald" />
          <StatCard label="Paid" value={stats.paidPayments} tone="blue" />
          <StatCard label="Pending" value={stats.pendingPayments} tone="amber" />
          <StatCard label="Webhooks" value={stats.totalWebhooks} tone="zinc" />
          <StatCard label="Valid hooks" value={stats.validWebhooks} tone="emerald" />
          <StatCard label="Invalid hooks" value={stats.invalidWebhooks} tone="rose" />
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {activeTab === "payments" ? (
          <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                <h2 className="text-lg font-black">Payment records</h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">No payments found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="p-4 text-left">Reference</th>
                      <th className="p-4 text-left">Payment</th>
                      <th className="p-4 text-left">Order</th>
                      <th className="p-4 text-left">Escrow</th>
                      <th className="p-4 text-left">Amount</th>
                      <th className="p-4 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50"
                        onClick={() => setSelectedReference(payment.reference)}
                      >
                        <td className="p-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                            BuyMesho reference
                          </p>
                          <p className="mt-1 font-mono text-xs break-all">{payment.reference}</p>
                          <p className="mt-2 text-[11px] text-zinc-400">{payment.provider}</p>
                        </td>
                        <td className="p-4">
                          <StatusPill label={payment.payment_status} tone={paymentTone(payment.payment_status)} />
                          <div className="mt-2 text-xs text-zinc-500">{payment.method}</div>
                          <div className="mt-1 text-[11px] text-zinc-400">
                            Verified: {Number(payment.verified) === 1 ? "yes" : "no"}
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusPill label={normalizeStatusLabel(payment.order_status)} tone={orderTone(payment.order_status)} />
                          <div className="mt-2 text-xs text-zinc-500 break-all">{payment.order_id}</div>
                          <div className="mt-1 text-[11px] text-zinc-400">
                            Order paid: {formatDate(payment.order_paid_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          <StatusPill label={normalizeStatusLabel(payment.escrow_state)} tone={escrowTone(payment.escrow_state)} />
                          <div className="mt-2 text-xs text-zinc-500">{payment.escrow_id || "No escrow yet"}</div>
                          <div className="mt-1 text-[11px] text-zinc-400">
                            Escrow updated: {formatDate(payment.escrow_updated_at)}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-bold">
                            {payment.currency} {payment.amount}
                          </div>
                          <div className="mt-1 text-[11px] text-zinc-400">
                            Gateway reference: {payment.provider_reference || "—"}
                          </div>
                        </td>
                        <td className="p-4 text-xs text-zinc-500">{formatDate(payment.updated_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                <h2 className="text-lg font-black">Webhook log</h2>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              </div>
            ) : webhookEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">No webhook events captured yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="p-4 text-left">Event</th>
                      <th className="p-4 text-left">Reference</th>
                      <th className="p-4 text-left">Signature</th>
                      <th className="p-4 text-left">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhookEvents.map((event) => (
                      <tr key={event.id} className="border-t border-zinc-100">
                        <td className="p-4">{event.event_type || "—"}</td>
                        <td className="p-4 font-mono text-xs break-all">{event.reference || "—"}</td>
                        <td className="p-4">
                          {Number(event.signature_valid) === 1 ? (
                            <StatusPill label="Valid" tone="emerald" />
                          ) : (
                            <StatusPill label="Invalid" tone="rose" />
                          )}
                        </td>
                        <td className="p-4 text-zinc-500">{formatDate(event.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black text-zinc-900">How to read this page</p>
              <p className="text-sm leading-relaxed text-zinc-600">
                Pending means the payment has been created, but the webhook or verification step has not completed yet.
                Once confirmed, the order should move through paid and into escrow, and later to released or refunded.
              </p>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <CircleAlert className="h-3.5 w-3.5" />
                Escrow control should stay in the order flow, not the admin page.
              </p>
            </div>
          </div>
        </section>
      </main>

      {selected ? (
        <div className="fixed inset-0 z-[90] flex bg-zinc-900/50 backdrop-blur-sm" onClick={close}>
          <aside
            className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payment detail</p>
                <h3 className="mt-1 text-lg font-black text-zinc-950">{selected.reference}</h3>
              </div>
              <button type="button" onClick={close} className="rounded-2xl border border-zinc-200 p-2 hover:bg-zinc-50">
                <X className="h-5 w-5 text-zinc-500" />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <section className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5">
                <h4 className="text-base font-black">Core fields</h4>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">BuyMesho reference</span>
                    <span className="font-semibold text-zinc-900 break-all">{selected.reference}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">PayChangu reference</span>
                    <span className="font-semibold text-zinc-900 break-all">{selected.provider_reference || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Payment status</span>
                    <StatusPill label={selected.payment_status} tone={paymentTone(selected.payment_status)} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Order status</span>
                    <StatusPill label={normalizeStatusLabel(selected.order_status)} tone={orderTone(selected.order_status)} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Escrow status</span>
                    <StatusPill label={normalizeStatusLabel(selected.escrow_state)} tone={escrowTone(selected.escrow_state)} />
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Amount</span>
                    <span className="font-semibold text-zinc-900">
                      {selected.currency} {Number(selected.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Order ID</span>
                    <span className="font-semibold text-zinc-900 break-all">{selected.order_id}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Escrow ID</span>
                    <span className="font-semibold text-zinc-900 break-all">{selected.escrow_id || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Payment verified at</span>
                    <span className="font-semibold text-zinc-900 break-all">{formatDate(selected.paid_at)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Order paid at</span>
                    <span className="font-semibold text-zinc-900 break-all">{formatDate(selected.order_paid_at)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Order fulfilled at</span>
                    <span className="font-semibold text-zinc-900 break-all">{formatDate(selected.order_fulfilled_at)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                    <span className="text-zinc-500">Escrow updated at</span>
                    <span className="font-semibold text-zinc-900 break-all">{formatDate(selected.escrow_updated_at)}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-zinc-200 bg-white p-5">
                <h4 className="text-base font-black">Matching webhook events</h4>
                <div className="mt-4 space-y-3">
                  {selectedHooks.length > 0 ? (
                    selectedHooks.map((event) => (
                      <div key={event.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-bold text-zinc-900">{event.event_type || "Webhook event"}</p>
                          <StatusPill
                            label={Number(event.signature_valid) === 1 ? "Valid" : "Invalid"}
                            tone={Number(event.signature_valid) === 1 ? "emerald" : "rose"}
                          />
                        </div>
                        <div className="mt-2 text-xs text-zinc-500">{formatDate(event.created_at)}</div>
                        {event.payload ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer inline-flex items-center gap-2 text-xs font-bold text-zinc-600">
                              <BadgeInfo className="h-3.5 w-3.5" />
                              View payload
                            </summary>
                            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-100">
                              {event.payload}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500">No webhook events matched this reference.</p>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-black">
                  <CircleAlert className="h-4 w-4" />
                  Control note
                </div>
                <p className="mt-2 leading-6">
                  This drawer is for diagnosis only. Buyer-facing order actions still belong on the buyer tracking page, not here.
                </p>
              </section>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
