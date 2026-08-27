import { useState, type ReactNode } from "react";
import { Check, Copy, Webhook, X } from "lucide-react";

export type AdminPaymentRow = {
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

export type AdminWebhookEventRow = {
  id: number;
  provider: string;
  reference: string | null;
  event_type: string | null;
  signature_valid: number;
  payload: string | null;
  created_at: string;
};

type Tone = "zinc" | "emerald" | "amber" | "rose" | "blue";

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

function StatusPill({ label, tone = "zinc" }: { label: string; tone?: Tone }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${TONE_CLASSES[tone]}`}>{label}</span>;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="break-all font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function RawWebhookViewer({ hook }: { hook: AdminWebhookEventRow }) {
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
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-all font-black text-zinc-900">{toText(hook.event_type)}</p>
          <p className="mt-2 break-all font-mono text-xs text-zinc-500">{toText(hook.reference)}</p>
          <p className="mt-2 text-xs text-zinc-500">{formatDate(hook.created_at)}</p>
        </div>
        <StatusPill label={Number(hook.signature_valid) === 1 ? "Valid" : "Invalid"} tone={Number(hook.signature_valid) === 1 ? "emerald" : "rose"} />
      </div>

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

export default function AdminPaymentDetailsDrawer({
  payment,
  hooks,
  onClose,
}: {
  payment: AdminPaymentRow;
  hooks: AdminWebhookEventRow[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex bg-zinc-900/50 backdrop-blur-sm" onClick={onClose}>
      <aside className="ml-auto h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-zinc-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Payment detail</p>
            <h3 className="mt-1 text-lg font-black text-zinc-950">{toText(payment.reference)}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-2xl border border-zinc-200 p-2 hover:bg-zinc-50" aria-label="Close payment details">
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
