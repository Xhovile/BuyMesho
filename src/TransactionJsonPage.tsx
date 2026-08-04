import { useEffect, useMemo, useState } from "react";
import { Copy, Database, Download, RefreshCw, ShieldAlert, SquareArrowOutUpRight, Search } from "lucide-react";
import { apiFetch } from "./lib/api";
import type { PayoutRow } from "./AdminPayoutsManager";

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
  summary?: {
    total_payments?: number;
    verified_payments?: number;
    paid_payments?: number;
    pending_payments?: number;
  };
  webhookSummary?: {
    total_webhooks?: number;
    valid_webhooks?: number;
    invalid_webhooks?: number;
  };
};

type PayoutsSummaryResponse = {
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

type PayoutAdjustment = Record<string, unknown>;

type JsonPayload = {
  query: {
    raw: string;
    normalized: string;
    params: Record<string, string>;
  };
  matchContext: {
    paymentId: string | null;
    orderId: string | null;
    escrowId: string | null;
    payoutId: string | null;
    webhookReference: string | null;
  };
  raw: {
    payment: PaymentRow | null;
    webhook: WebhookEventRow | null;
    payout: PayoutRow | null;
    payments: PaymentRow[];
    webhooks: WebhookEventRow[];
    payouts: PayoutRow[];
    sellerHistory: unknown[];
    payoutAdjustments: PayoutAdjustment[];
    summary: SummaryResponse | null;
    payoutSummary: PayoutsSummaryResponse | null;
  };
  derived: {
    paymentMatches: number;
    webhookMatches: number;
    payoutMatches: number;
    hasSelection: boolean;
    isLikelyTransactionRecord: boolean;
    notes: string[];
  };
};

function token(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim().toLowerCase();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value).toLowerCase();
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
}

function toText(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  try {
    const serialized = JSON.stringify(value);
    return serialized && serialized !== "{}" ? serialized : fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value?: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return toText(value);
  }
}

function sortPayouts(rows: PayoutRow[]) {
  return [...rows].sort((left, right) => {
    const leftTime = Date.parse((left.updatedAt || left.createdAt || "") as string);
    const rightTime = Date.parse((right.updatedAt || right.createdAt || "") as string);
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? null, null, 2);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractSellerHistoryRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isObject(value)) return [];
  const candidate = value.history ?? value.rows ?? value.data ?? value.items;
  return Array.isArray(candidate) ? candidate : [];
}

function extractAdjustmentsRows(value: unknown): PayoutAdjustment[] {
  if (Array.isArray(value)) return value as PayoutAdjustment[];
  if (!isObject(value)) return [];
  const candidate = value.adjustments ?? value.rows ?? value.data ?? value.items;
  return Array.isArray(candidate) ? (candidate as PayoutAdjustment[]) : [];
}

function findBestPayment(payments: PaymentRow[], q: string) {
  if (!q) return payments[0] ?? null;
  return payments.find((payment) => {
    const fields = [
      payment.id,
      payment.order_id,
      payment.reference,
      payment.provider_reference,
      payment.escrow_id,
      payment.payment_status,
      payment.order_status,
      payment.escrow_state,
    ];
    return fields.some((field) => token(field).includes(q));
  }) ?? payments[0] ?? null;
}

function findWebhook(webhooks: WebhookEventRow[], q: string, payment?: PaymentRow | null) {
  if (payment) {
    const byReference = webhooks.find((event) => event.reference && event.reference === payment.reference);
    if (byReference) return byReference;
  }
  if (!q) return webhooks[0] ?? null;
  return webhooks.find((event) => {
    const fields = [event.id, event.provider, event.reference, event.event_type, event.payload, event.created_at];
    return fields.some((field) => token(field).includes(q));
  }) ?? webhooks[0] ?? null;
}

function findPayout(payouts: PayoutRow[], q: string, payment?: PaymentRow | null) {
  if (payment) {
    const linked = payouts.find((row) => row.orderId === payment.order_id || (row.escrowId && row.escrowId === payment.escrow_id));
    if (linked) return linked;
  }
  if (!q) return payouts[0] ?? null;
  return payouts.find((payout) => {
    const fields = [
      payout.id,
      payout.sellerId,
      payout.orderId,
      payout.escrowId,
      payout.providerReference,
      payout.providerTransactionId,
      payout.providerChargeId,
      payout.destinationAccountId,
      payout.destinationMaskedAccount,
    ];
    return fields.some((field) => token(field).includes(q));
  }) ?? payouts[0] ?? null;
}

function buildPayload({
  rawQuery,
  payments,
  webhooks,
  payouts,
  sellerHistory,
  payoutAdjustments,
  summary,
  payoutSummary,
}: {
  rawQuery: string;
  payments: PaymentRow[];
  webhooks: WebhookEventRow[];
  payouts: PayoutRow[];
  sellerHistory: unknown[];
  payoutAdjustments: PayoutAdjustment[];
  summary: SummaryResponse | null;
  payoutSummary: PayoutsSummaryResponse | null;
}): JsonPayload {
  const normalized = token(rawQuery);
  const sortedPayments = [...payments].sort((a, b) => Date.parse(b.updated_at || b.created_at || "") - Date.parse(a.updated_at || a.created_at || ""));
  const sortedWebhooks = [...webhooks].sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""));
  const sortedPayouts = sortPayouts(payouts);

  const payment = findBestPayment(sortedPayments, normalized);
  const webhook = findWebhook(sortedWebhooks, normalized, payment);
  const payout = findPayout(sortedPayouts, normalized, payment);

  const paymentMatches = normalized
    ? sortedPayments.filter((row) => [row.id, row.order_id, row.reference, row.provider_reference, row.escrow_id, row.payment_status, row.order_status, row.escrow_state].some((field) => token(field).includes(normalized))).length
    : sortedPayments.length;
  const webhookMatches = normalized
    ? sortedWebhooks.filter((row) => [row.id, row.provider, row.reference, row.event_type, row.payload, row.created_at].some((field) => token(field).includes(normalized))).length
    : sortedWebhooks.length;
  const payoutMatches = normalized
    ? sortedPayouts.filter((row) => [row.id, row.sellerId, row.orderId, row.escrowId, row.providerReference, row.providerTransactionId, row.providerChargeId, row.destinationAccountId, row.destinationMaskedAccount].some((field) => token(field).includes(normalized))).length
    : sortedPayouts.length;

  const notes: string[] = [];
  if (payment) notes.push(`Payment ${payment.reference} selected from the loaded admin payments dataset.`);
  if (webhook) notes.push(`Webhook ${toText(webhook.reference)} selected from the loaded webhook dataset.`);
  if (payout) notes.push(`Payout ${payout.id} selected from the loaded payout dataset.`);
  if (!normalized) notes.push("No search token provided, so the page is showing the latest loaded transaction context.");
  if (normalized && !payment && !webhook && !payout) notes.push("No exact transaction record matched the query; the payload still contains the full loaded datasets.");

  return {
    query: {
      raw: rawQuery,
      normalized,
      params: Object.fromEntries(new URLSearchParams(window.location.search).entries()),
    },
    matchContext: {
      paymentId: payment?.id ?? null,
      orderId: payment?.order_id ?? null,
      escrowId: payment?.escrow_id ?? null,
      payoutId: payout?.id ?? null,
      webhookReference: webhook?.reference ?? null,
    },
    raw: {
      payment,
      webhook,
      payout,
      payments: sortedPayments,
      webhooks: sortedWebhooks,
      payouts: sortedPayouts,
      sellerHistory,
      payoutAdjustments,
      summary,
      payoutSummary,
    },
    derived: {
      paymentMatches,
      webhookMatches,
      payoutMatches,
      hasSelection: !!(payment || webhook || payout),
      isLikelyTransactionRecord: !!(payment || webhook || payout || normalized),
      notes,
    },
  };
}

export default function TransactionJsonPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEventRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutsSummaryResponse | null>(null);
  const [sellerHistory, setSellerHistory] = useState<unknown[]>([]);
  const [payoutAdjustments, setPayoutAdjustments] = useState<PayoutAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [queryInput, setQueryInput] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [paymentsData, webhooksData, summaryData, payoutsData, payoutSummaryData] = await Promise.allSettled([
          apiFetch("/api/admin/payments"),
          apiFetch("/api/admin/webhook-events"),
          apiFetch("/api/admin/payment-summary"),
          apiFetch("/api/admin/payouts?limit=100&offset=0"),
          apiFetch("/api/admin/payouts/summary"),
        ]);

        if (!mounted) return;

        setPayments(paymentsData.status === "fulfilled" && Array.isArray(paymentsData.value) ? paymentsData.value : []);
        setWebhooks(webhooksData.status === "fulfilled" && Array.isArray(webhooksData.value) ? webhooksData.value : []);
        setSummary(summaryData.status === "fulfilled" && isObject(summaryData.value) ? (summaryData.value as SummaryResponse) : null);
        setPayouts(payoutsData.status === "fulfilled" && Array.isArray(payoutsData.value) ? (payoutsData.value as PayoutRow[]) : []);
        setPayoutSummary(payoutSummaryData.status === "fulfilled" && isObject(payoutSummaryData.value) ? (payoutSummaryData.value as PayoutsSummaryResponse) : null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load transaction JSON data.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [refreshTick]);

  useEffect(() => {
    const title = queryInput.trim() ? `Transaction JSON · ${queryInput.trim()}` : "Transaction JSON";
    document.title = title;
  }, [queryInput]);

  const payload = useMemo(
    () => buildPayload({
      rawQuery: queryInput.trim(),
      payments,
      webhooks,
      payouts,
      sellerHistory,
      payoutAdjustments,
      summary,
      payoutSummary,
    }),
    [payments, webhooks, payouts, sellerHistory, payoutAdjustments, summary, payoutSummary, queryInput],
  );

  const jsonText = useMemo(() => prettyJson(payload), [payload]);

const safeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

const handleDownload = () => {
  try {
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const fileNameBase = safeFileName(queryInput || "latest-transaction");
    const fileName = `transaction-json-${fileNameBase || "latest"}.json`;

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch {
    // optional: set an error state here if you want
  }
};
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="border-b border-white/10 bg-zinc-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-zinc-400">Deep-link transaction dump</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Transaction JSON</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              This page is the raw data companion to the Transaction Inspector. It keeps a dark diagnostic shell and shows the loaded transaction context as a single JSON payload for sharing, copying, and debugging.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Order, payout, webhook, seller, escrow, reference…"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
              />
            </label>
            <button
              type="button"
              onClick={() => setRefreshTick((value) => value + 1)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
            >
              <Copy className="h-4 w-4" /> {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy JSON"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
              <Download className="h-4 w-4" />
              Download JSON
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Payments</p>
            <p className="mt-2 text-3xl font-black text-white">{payments.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Webhooks</p>
            <p className="mt-2 text-3xl font-black text-white">{webhooks.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Payouts</p>
            <p className="mt-2 text-3xl font-black text-white">{payouts.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-zinc-400">Latest update</p>
            <p className="mt-2 text-sm font-semibold text-zinc-100">{loading ? "Loading…" : formatDate(payments[0]?.updated_at ?? webhooks[0]?.created_at ?? payouts[0]?.updatedAt ?? null)}</p>
          </div>
        </section>

        {error ? (
          <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-100">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-black">Load failed</p>
                <p className="mt-1 text-sm text-rose-100/90">{error}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-zinc-900/70 p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Payload summary</h2>
              <p className="mt-1 text-sm text-zinc-300">
                {payload.derived.hasSelection ? "A transaction context was matched from the loaded datasets." : "No exact match found; the payload still includes the full loaded datasets."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Payment {payload.derived.paymentMatches}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Webhook {payload.derived.webhookMatches}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Payout {payload.derived.payoutMatches}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
            <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">Match context</p>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-4"><span className="text-zinc-400">Payment ID</span><span className="break-all font-semibold text-white">{payload.matchContext.paymentId ?? "—"}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-zinc-400">Order ID</span><span className="break-all font-semibold text-white">{payload.matchContext.orderId ?? "—"}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-zinc-400">Escrow ID</span><span className="break-all font-semibold text-white">{payload.matchContext.escrowId ?? "—"}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-zinc-400">Payout ID</span><span className="break-all font-semibold text-white">{payload.matchContext.payoutId ?? "—"}</span></div>
                  <div className="flex items-center justify-between gap-4"><span className="text-zinc-400">Webhook ref</span><span className="break-all font-semibold text-white">{payload.matchContext.webhookReference ?? "—"}</span></div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                <div className="flex items-center gap-2 font-black text-white"><Database className="h-4 w-4" /> Notes</div>
                <ul className="mt-3 space-y-2">
                  {payload.derived.notes.map((note) => (
                    <li key={note} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">{note}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="min-w-0 rounded-3xl border border-white/10 bg-black/30 p-4 shadow-inner">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">JSON</p>
                  <h3 className="mt-1 text-sm font-bold text-white">Full payload snapshot</h3>
                </div>
                <a href="/admin/transaction-inspector" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-zinc-100 transition hover:bg-white/10">
                  <SquareArrowOutUpRight className="h-3.5 w-3.5" /> Inspector
                </a>
              </div>
              <pre className="mt-4 max-h-[70vh] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-zinc-950 p-4 text-xs leading-6 text-zinc-100">{loading ? "Loading…" : jsonText}</pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
