import { useState, type ReactNode } from "react";
import { AlertTriangle, Check, Copy, CreditCard, Loader2, RotateCcw, Webhook, X } from "lucide-react";
import { apiFetch } from "./lib/api";

export type PaymentRow = {
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

export type WebhookEventRow = {
  id: number;
  provider: string;
  reference: string | null;
  event_type: string | null;
  signature_valid: number;
  payload: string | null;
  created_at: string;
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

function token(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : toText(value, "").toLowerCase();
}

function formatDate(value?: unknown): string {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return toText(value);
  }
}

function normalizeStatusLabel(value: unknown): string {
  const label = toText(value, "");
  return label ? label.replace(/_/g, " ") : "—";
}

function paymentTone(status: unknown): Tone {
  const s = token(status);
  if (["captured", "paid"].includes(s)) return "emerald";
  if (s === "pending") return "amber";
  if (["failed", "cancelled"].includes(s)) return "rose";
  return "zinc";
}

function orderTone(status: unknown): Tone {
  const s = token(status);
  if (!s) return "zinc";
  if (s === "fulfilled") return "emerald";
  if (s === "refunded") return "rose";
  if (["paid", "in_escrow", "pending_payment"].includes(s)) return "blue";
  if (s === "disputed") return "amber";
  return "zinc";
}

function escrowTone(status: unknown): Tone {
  const s = token(status);
  if (!s) return "zinc";
  if (s === "released") return "emerald";
  if (s === "refunded") return "rose";
  if (s === "disputed") return "amber";
  if (["initiated", "funded", "held"].includes(s)) return "blue";
  return "zinc";
}

function lifecycleTone(state: LifecycleState): Tone {
  if (state === "done") return "emerald";
  if (state === "active") return "blue";
  if (state === "issue") return "rose";
  return "zinc";
}

function StatusPill({ label, tone = "zinc" }: { label: string; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[tone]}`}>{label}</span>;
}

function buildLifecycleSteps(payment?: PaymentRow | null, hooks: WebhookEventRow[] = []): LifecycleStep[] {
  const hasPayment = !!payment;
  const hasCheckout = !!payment?.checkout_url;
  const hasWebhook = hooks.length > 0;
  const hasValidWebhook = hooks.some((hook) => Number(hook.signature_valid) === 1);
  const isPaid = !!payment && (["paid", "captured"].includes(token(payment.payment_status)) || !!payment.paid_at);
  const isEscrowActive = !!payment && (["in_escrow", "paid"].includes(token(payment.order_status)) || !!payment.escrow_id);
  const isDelivered = !!payment && token(payment.order_status) === "fulfilled";
  const isSettled = !!payment && ["released", "refunded"].includes(token(payment.escrow_state));
  const isDisputed = !!payment && token(payment.escrow_state) === "disputed";

  return [
    { number: 1, title: "Payment created", detail: hasPayment ? "BuyMesho stored a payment row for this checkout attempt." : "No payment row exists yet.", state: hasPayment ? "done" : "waiting" },
    { number: 2, title: "Checkout opened", detail: hasCheckout ? "The buyer was sent to the provider checkout URL." : "Waiting for checkout creation.", state: hasCheckout ? "done" : hasPayment ? "active" : "waiting" },
    { number: 3, title: "Webhook received", detail: hasWebhook ? "PayChangu callback delivery was captured." : "No webhook event has arrived yet.", state: hasWebhook ? "active" : "waiting" },
    { number: 4, title: "Signature verified", detail: hasValidWebhook ? "At least one webhook signature passed verification." : hasWebhook ? "Webhook arrived, but verification has not passed yet." : "Waiting for a webhook to verify.", state: hasValidWebhook ? "done" : hasWebhook ? "active" : "waiting" },
    { number: 5, title: "Order confirmed", detail: isPaid ? "The order was marked paid and moved into the confirmed flow." : "The order is still pending confirmation.", state: isPaid ? "done" : "waiting" },
    { number: 6, title: "Escrow active", detail: isEscrowActive ? "Funds are represented as active escrow for the order." : "Escrow has not started yet.", state: isEscrowActive ? (isDisputed ? "issue" : "active") : "waiting" },
    { number: 7, title: "Buyer confirmed delivery", detail: isDelivered ? "The order has been marked fulfilled after delivery confirmation." : "Waiting for delivery confirmation.", state: isDelivered ? "done" : "waiting" },
    { number: 8, title: "Funds released or refunded", detail: isSettled ? (token(payment?.escrow_state) === "released" ? "Funds were released to the seller." : "Funds were refunded to the buyer.") : "Final settlement has not happened yet.", state: token(payment?.escrow_state) === "released" ? "done" : token(payment?.escrow_state) === "refunded" ? "issue" : "waiting" },
  ];
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="break-all font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function RawWebhookViewer({ hook }: { hook: WebhookEventRow }) {
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const rawPayload = hook.payload ?? "";
  const displayedPayload = (() => {
    if (!rawPayload) return "—";
    try {
      return JSON.stringify(JSON.parse(rawPayload), null, 2);
    } catch {
      return rawPayload;
    }
  })();

  const handleCopy = async () => {
    if (!rawPayload) return;
    try {
      await navigator.clipboard.writeText(rawPayload);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1500);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-black text-zinc-900">{toText(hook.event_type)}</p>
        <StatusPill label={Number(hook.signature_valid) === 1 ? "Valid" : "Invalid"} tone={Number(hook.signature_valid) === 1 ? "emerald" : "rose"} />
      </div>
      <p className="mt-2 break-all font-mono text-xs text-zinc-500">{toText(hook.reference)}</p>
      <p className="mt-2 text-xs text-zinc-500">{formatDate(hook.created_at)}</p>

      {rawPayload ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-200"
            >
              <Webhook className="h-3.5 w-3.5 text-zinc-400" />
              {open ? "Hide raw webhook" : "View raw webhook"}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy raw webhook JSON"
              aria-label="Copy raw webhook JSON"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-zinc-200 transition hover:bg-white/10"
            >
              {copyState === "copied" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
            </button>
          </div>
          {open ? (
            <pre className="max-h-96 overflow-auto whitespace-pre p-4 text-[11px] leading-5 text-zinc-100 [scrollbar-width:thin]">{displayedPayload}</pre>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">No raw payload was stored for this webhook event.</p>
      )}
    </div>
  );
}

function canRefund(payment: PaymentRow): boolean {
  const orderState = token(payment.order_status);
  const escrowState = token(payment.escrow_state);
  const refundableOrderStates = new Set(["paid", "in_escrow", "fulfilled", "disputed"]);
  const refundableEscrowStates = new Set(["funded", "held", "disputed"]);
  return Boolean(payment.escrow_id)
    && refundableOrderStates.has(orderState)
    && refundableEscrowStates.has(escrowState)
    && Number(payment.balance_amount ?? 0) > 0;
}

export default function AdminPaymentDetailsDrawer({ payment, hooks, onClose }: { payment: PaymentRow; hooks: WebhookEventRow[]; onClose: () => void }) {
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState(false);

  const refundEligible = canRefund(payment);

  const handleRefund = async () => {
    const reason = refundReason.trim();
    if (!reason) {
      setRefundError("Refund reason is required.");
      return;
    }

    const confirmed = window.confirm(
      `Refund ${payment.currency} ${Number(payment.amount).toLocaleString()} to the buyer for order ${payment.order_id}? This is a full refund and cannot be undone.`,
    );
    if (!confirmed) return;

    setRefundLoading(true);
    setRefundError(null);
    try {
      await apiFetch(`/api/escrow/${encodeURIComponent(payment.order_id)}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setRefundSuccess(true);
      window.setTimeout(() => window.location.reload(), 650);
    } catch (error: unknown) {
      setRefundError(error instanceof Error ? error.message : "Failed to refund the order.");
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex bg-zinc-900/50 backdrop-blur-sm" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payment detail</p>
            <h3 className="mt-1 text-lg font-black text-zinc-950">{toText(payment.reference)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-zinc-200 p-2 hover:bg-zinc-50">
            <X className="h-5 w-5 text-zinc-500" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <section className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5">
            <h4 className="text-base font-black">Core fields</h4>
            <div className="mt-4 grid gap-3">
              <Row label="BuyMesho reference" value={toText(payment.reference)} />
              <Row label="Gateway reference" value={toText(payment.provider_reference) || "Not returned by provider"} />
              <Row label="Payment status" value={<StatusPill label={normalizeStatusLabel(payment.payment_status)} tone={paymentTone(payment.payment_status)} />} />
              <Row label="Order status" value={<StatusPill label={normalizeStatusLabel(payment.order_status)} tone={orderTone(payment.order_status)} />} />
              <Row label="Escrow status" value={<StatusPill label={normalizeStatusLabel(payment.escrow_state)} tone={escrowTone(payment.escrow_state)} />} />
              <Row label="Amount" value={`${payment.currency} ${Number(payment.amount).toLocaleString()}`} />
              <Row label="Order ID" value={toText(payment.order_id)} />
              <Row label="Provider" value={toText(payment.provider)} />
              <Row label="Method" value={toText(payment.method)} />
              <Row label="Verified" value={Number(payment.verified) === 1 ? "yes" : "no"} />
            </div>
          </section>

          {refundEligible || refundSuccess ? (
            <section className="rounded-[2rem] border border-rose-200 bg-rose-50/70 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-700 shadow-sm">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-black text-rose-950">Refund order</h4>
                      <p className="mt-1 text-sm leading-relaxed text-rose-800/80">This refunds the full escrow balance to the buyer and moves the order to refunded.</p>
                    </div>
                    {refundSuccess ? <StatusPill label="Refunded" tone="rose" /> : null}
                  </div>

                  {refundSuccess ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-white p-4 text-sm text-rose-900">
                      Refund submitted successfully. Refreshing payment data…
                    </div>
                  ) : refundOpen ? (
                    <div className="mt-4 space-y-3">
                      <label className="block text-xs font-black uppercase tracking-[0.14em] text-rose-900" htmlFor="admin-refund-reason">
                        Refund reason
                      </label>
                      <textarea
                        id="admin-refund-reason"
                        value={refundReason}
                        onChange={(event) => setRefundReason(event.target.value)}
                        disabled={refundLoading}
                        maxLength={500}
                        rows={4}
                        placeholder="Explain why the order is being refunded…"
                        className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 disabled:bg-zinc-100"
                      />
                      <p className="text-xs text-rose-800/70">The reason is stored with the refund action and used for transactional notifications.</p>

                      {refundError ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-800" role="alert">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{refundError}</span>
                        </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRefundOpen(false);
                            setRefundError(null);
                          }}
                          disabled={refundLoading}
                          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRefund()}
                          disabled={refundLoading || !refundReason.trim()}
                          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {refundLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          {refundLoading ? "Refunding…" : "Confirm full refund"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white p-4">
                      <div>
                        <p className="text-sm font-black text-zinc-900">{payment.currency} {Number(payment.amount).toLocaleString()}</p>
                        <p className="mt-1 text-xs text-zinc-500">Escrow balance available for refund</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRefundOpen(true);
                          setRefundError(null);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Refund order
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h4 className="text-base font-black">Lifecycle snapshot</h4>
            </div>
            <div className="mt-4 grid gap-3">
              {buildLifecycleSteps(payment, hooks).map((step) => (
                <div key={step.number} className={`rounded-2xl border p-4 ${step.state === "done" ? "border-emerald-200 bg-emerald-50/70" : step.state === "active" ? "border-blue-200 bg-blue-50/70" : step.state === "issue" ? "border-rose-200 bg-rose-50/70" : "border-zinc-200 bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 font-black text-zinc-900 shadow-sm">{step.number}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h5 className="text-sm font-black tracking-tight text-zinc-900">{step.title}</h5>
                        <StatusPill label={step.state === "done" ? "Done" : step.state === "active" ? "Active" : step.state === "issue" ? "Issue" : "Waiting"} tone={lifecycleTone(step.state)} />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <h4 className="text-base font-black">Webhook history for this reference</h4>
            </div>
            <div className="mt-4 space-y-3">
              {hooks.length ? hooks.map((hook) => <RawWebhookViewer key={hook.id} hook={hook} />) : <p className="text-sm text-zinc-500">No webhook rows match this reference.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
