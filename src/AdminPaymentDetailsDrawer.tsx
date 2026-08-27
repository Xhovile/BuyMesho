import { type ReactNode } from "react";
import { CreditCard, Webhook, X } from "lucide-react";

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

export default function AdminPaymentDetailsDrawer({ payment, hooks, onClose }: { payment: PaymentRow; hooks: WebhookEventRow[]; onClose: () => void }) {
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
              {hooks.length ? hooks.map((hook) => (
                <div key={hook.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-zinc-900">{toText(hook.event_type)}</p>
                    <StatusPill label={Number(hook.signature_valid) === 1 ? "Valid" : "Invalid"} tone={Number(hook.signature_valid) === 1 ? "emerald" : "rose"} />
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-zinc-500">{toText(hook.reference)}</p>
                  <p className="mt-2 text-xs text-zinc-500">{formatDate(hook.created_at)}</p>
                </div>
              )) : <p className="text-sm text-zinc-500">No webhook rows match this reference.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
