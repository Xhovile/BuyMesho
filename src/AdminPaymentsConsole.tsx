import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeInfo,
  CircleAlert,
  CreditCard,
  Loader2,
  ShieldCheck,
  Wallet,
  Webhook,
  X,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import AdminPayoutDetailDrawer from "./AdminPayoutDetailDrawer";
import type { OverrideAction, PayoutAdjustment, PayoutRow, RowAction } from "./AdminPayoutsManager";
import {
  getSellerPayoutStatusDetail,
  getSellerPayoutStatusLabel,
  sellerOperationalSignals,
} from "./modules/payouts/uiModel";
import type { PayoutRecord } from "./modules/payouts/types";
import { money, payoutFeeNote, payoutMathBreakdown } from "./pages/seller-payouts/sellerPayouts.helpers";
import SellerPayoutsHistorySection from "./pages/seller-payouts/components/SellerPayoutsHistorySection";

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

type PaymentsListResponse = {
  rows?: PaymentRow[];
  pagination?: {
    total?: number;
    hasMore?: boolean;
    limit?: number;
    offset?: number;
  };
};

type PayoutsListResponse = {
  rows?: PayoutRow[];
  pagination?: {
    total?: number;
    hasMore?: boolean;
    limit?: number;
    offset?: number;
  };
};

type Tone = "zinc" | "emerald" | "amber" | "rose" | "blue";
type LifecycleState = "done" | "active" | "waiting" | "issue";
type SortMode = "recent" | "verified" | "paid" | "pending";
type WebhookSortMode = "recent" | "valid" | "invalid";
type PayoutSortMode = "recent" | "paid" | "failed" | "held";

type LifecycleStep = {
  number: number;
  title: string;
  detail: string;
  state: LifecycleState;
};

type DiagnosticTone = Tone;

type Diagnostic = {
  title: string;
  detail: string;
  tone: DiagnosticTone;
};

const TONE_CLASSES: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
};

const PAYMENT_SORTS: Array<{ key: SortMode; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "verified", label: "Verified" },
  { key: "paid", label: "Paid" },
  { key: "pending", label: "Pending" },
];

const WEBHOOK_SORTS: Array<{ key: WebhookSortMode; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "valid", label: "Valid hooks" },
  { key: "invalid", label: "Invalid hooks" },
];

const PAYOUT_SORTS: Array<{ key: PayoutSortMode; label: string }> = [
  { key: "recent", label: "Recent" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "held", label: "Held" },
];

const STATIC_PAYOUT_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "disabled", label: "Disabled" },
] as const;

const STATIC_ADJUSTMENT_TYPE_OPTIONS = [
  { value: "manual_adjustment", label: "Manual payout adjustment" },
  { value: "processing_fee", label: "Legacy compatibility amount" },
] as const;

const STATIC_VISIBLE_ACTIONS: Array<OverrideAction | RowAction> = [
  "retry",
  "hold",
  "mark_paid",
  "mark_failed",
  "cancel",
];

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

function extractArray<T>(value: unknown, keys: string[] = ["rows", "events", "webhookEvents", "webhooks", "payments", "payouts", "adjustments"]): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const candidate = record[key];
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
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
  if (["captured", "paid", "success"].includes(s)) return "emerald";
  if (s === "pending") return "amber";
  if (["failed", "cancelled", "error"].includes(s)) return "rose";
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

function StatButton({
  label,
  value,
  active,
  onClick,
  badge = "Sort",
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex min-h-[5.75rem] flex-col justify-between rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-4 ${
        active
          ? "border-zinc-950 bg-zinc-950 text-white shadow-zinc-950/15"
          : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${active ? "text-zinc-300" : "text-zinc-500"}`}>{label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] ${active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200/70"}`}>{badge}</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-black leading-none tracking-tight sm:text-3xl">{value}</p>
        <span className={`h-1.5 w-8 rounded-full ${active ? "bg-white/60" : "bg-zinc-200 group-hover:bg-zinc-300"}`} />
      </div>
    </button>
  );
}

function sortPayments(payments: PaymentRow[], mode: SortMode) {
  return [...payments].sort((left, right) => {
    const leftTime = Date.parse(left.updated_at || left.created_at || "");
    const rightTime = Date.parse(right.updated_at || right.created_at || "");

    const leftRank =
      mode === "verified"
        ? Number(left.verified) === 1
          ? 0
          : 1
        : mode === "paid"
          ? ["paid", "captured", "success"].includes(token(left.payment_status))
            ? 0
            : 1
          : mode === "pending"
            ? token(left.payment_status) === "pending"
              ? 0
              : 1
            : 0;
    const rightRank =
      mode === "verified"
        ? Number(right.verified) === 1
          ? 0
          : 1
        : mode === "paid"
          ? ["paid", "captured", "success"].includes(token(right.payment_status))
            ? 0
            : 1
          : mode === "pending"
            ? token(right.payment_status) === "pending"
              ? 0
              : 1
            : 0;

    if (leftRank !== rightRank) return leftRank - rightRank;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.reference.localeCompare(right.reference);
  });
}

function sortWebhooks(events: WebhookEventRow[], mode: WebhookSortMode) {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(left.created_at || "");
    const rightTime = Date.parse(right.created_at || "");

    const leftRank =
      mode === "valid"
        ? Number(left.signature_valid) === 1
          ? 0
          : 1
        : mode === "invalid"
          ? Number(left.signature_valid) === 1
            ? 1
            : 0
          : 0;
    const rightRank =
      mode === "valid"
        ? Number(right.signature_valid) === 1
          ? 0
          : 1
        : mode === "invalid"
          ? Number(right.signature_valid) === 1
            ? 1
            : 0
          : 0;

    if (leftRank !== rightRank) return leftRank - rightRank;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.id - right.id;
  });
}

function sortPayouts(rows: PayoutRow[], mode: PayoutSortMode) {
  return [...rows].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || left.createdAt || "");
    const rightTime = Date.parse(right.updatedAt || right.createdAt || "");

    const leftRank =
      mode === "paid"
        ? token(left.status) === "paid"
          ? 0
          : 1
        : mode === "failed"
          ? token(left.status) === "failed"
            ? 0
            : 1
          : mode === "held"
            ? token(left.status) === "held"
              ? 0
              : 1
            : 0;
    const rightRank =
      mode === "paid"
        ? token(right.status) === "paid"
          ? 0
          : 1
        : mode === "failed"
          ? token(right.status) === "failed"
            ? 0
            : 1
          : mode === "held"
            ? token(right.status) === "held"
              ? 0
              : 1
            : 0;

    if (leftRank !== rightRank) return leftRank - rightRank;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return left.id.localeCompare(right.id);
  });
}

function buildLifecycleSteps(payment?: PaymentRow | null, hooks: WebhookEventRow[] = [], payout?: PayoutRow | null): LifecycleStep[] {
  const hasPayment = !!payment;
  const hasCheckout = !!payment?.checkout_url;
  const hasWebhook = hooks.length > 0;
  const hasValidWebhook = hooks.some((hook) => Number(hook.signature_valid) === 1);
  const isPaid = !!payment && (["paid", "captured", "success"].includes(token(payment.payment_status)) || !!payment.paid_at);
  const isEscrowActive = !!payment && (["in_escrow", "paid"].includes(token(payment.order_status)) || !!payment.escrow_id);
  const isDelivered = !!payment && token(payment.order_status) === "fulfilled";
  const isSettled = !!payment && ["released", "refunded"].includes(token(payment.escrow_state));
  const isDisputed = !!payment && token(payment.escrow_state) === "disputed";
  const hasPayout = !!payout;
  const destinationVerified = !!payout && token(payout.destinationVerificationStatus) === "verified" && payout.destinationActive !== false;
  const payoutProcessing = !!payout && ["queued", "processing", "pending", "held"].includes(token(payout.status));
  const payoutComplete = !!payout && token(payout.status) === "paid";

  return [
    { number: 1, title: "Payment created", detail: hasPayment ? "BuyMesho stored a payment row for this checkout attempt." : "No payment row exists yet.", state: hasPayment ? "done" : "waiting" },
    { number: 2, title: "Checkout opened", detail: hasCheckout ? "The buyer was sent to the provider checkout URL." : "Waiting for checkout creation.", state: hasCheckout ? "done" : hasPayment ? "active" : "waiting" },
    { number: 3, title: "Webhook received", detail: hasWebhook ? "PayChangu callback delivery was captured." : "No webhook event has arrived yet.", state: hasWebhook ? "active" : "waiting" },
    { number: 4, title: "Signature verified", detail: hasValidWebhook ? "At least one webhook signature passed verification." : hasWebhook ? "Webhook arrived, but verification has not passed yet." : "Waiting for a webhook to verify.", state: hasValidWebhook ? "done" : hasWebhook ? "active" : "waiting" },
    { number: 5, title: "Order confirmed", detail: isPaid ? "The order was marked paid and moved into the confirmed flow." : "The order is still pending confirmation.", state: isPaid ? "done" : "waiting" },
    { number: 6, title: "Escrow active", detail: isEscrowActive ? "Funds are represented as active escrow for the order." : "Escrow has not started yet.", state: isEscrowActive ? (isDisputed ? "issue" : "active") : "waiting" },
    { number: 7, title: "Buyer confirmed delivery", detail: isDelivered ? "The order has been marked fulfilled after delivery confirmation." : "Waiting for delivery confirmation.", state: isDelivered ? "done" : "waiting" },
    { number: 8, title: "Funds released or refunded", detail: isSettled ? (token(payment?.escrow_state) === "released" ? "Funds were released to the seller." : "Funds were refunded to the buyer.") : "Final settlement has not happened yet.", state: token(payment?.escrow_state) === "released" ? "done" : token(payment?.escrow_state) === "refunded" ? "issue" : "waiting" },
    { number: 9, title: "Payout row created", detail: hasPayout ? "A seller payout record exists for this transaction." : "No seller payout row has been linked yet.", state: hasPayout ? "done" : "waiting" },
    { number: 10, title: "Destination verified", detail: destinationVerified ? "The payout destination is verified and active." : hasPayout ? "Destination still needs verification or activation." : "No payout destination context yet.", state: destinationVerified ? "done" : hasPayout ? "active" : "waiting" },
    { number: 11, title: "Seller payout processed", detail: payoutComplete ? "The seller payout has completed successfully." : payoutProcessing ? "The payout is still moving through the settlement flow." : hasPayout ? "The payout is not finished yet." : "No seller payout to process.", state: payoutComplete ? "done" : payoutProcessing ? "active" : "waiting" },
    { number: 12, title: "Flow closed", detail: hasPayout && payoutComplete ? "The payout path is fully closed out." : hasPayout ? "The payout path is still open." : "The transaction has not closed the payout loop yet.", state: hasPayout && payoutComplete ? "done" : "waiting" },
  ];
}

function buildDiagnostics(payment?: PaymentRow | null, hooks: WebhookEventRow[] = [], payout?: PayoutRow | null): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  if (payment) {
    diagnostics.push({
      title: "Payment row present",
      detail: `Reference ${payment.reference} loaded from Admin Payments.`,
      tone: "emerald",
    });
  } else {
    diagnostics.push({
      title: "Missing payment row",
      detail: "No payment row was returned by the admin payments endpoint.",
      tone: "rose",
    });
  }

  if (payment?.provider_reference) {
    diagnostics.push({
      title: "Gateway reference mapped",
      detail: payment.provider_reference,
      tone: "emerald",
    });
  } else if (payment) {
    diagnostics.push({
      title: "Gateway reference missing",
      detail: "The provider reference was not returned or not persisted.",
      tone: "amber",
    });
  }

  const matchingWebhook = payment ? hooks.filter((hook) => hook.reference === payment.reference) : [];
  if (payment && matchingWebhook.length > 0) {
    diagnostics.push({
      title: "Webhook correlation",
      detail: `${matchingWebhook.length} webhook event(s) match the payment reference.`,
      tone: matchingWebhook.some((hook) => Number(hook.signature_valid) === 1) ? "emerald" : "amber",
    });
  } else if (payment) {
    diagnostics.push({
      title: "Webhook correlation missing",
      detail: "No webhook event matched the selected payment reference.",
      tone: "rose",
    });
  }

  if (payment && payout) {
    const paymentAmount = Number(payment.amount || 0);
    const payoutAmount = Number(payout.amount || 0);
    if (paymentAmount !== payoutAmount) {
      diagnostics.push({
        title: "Amount mismatch",
        detail: `Payment shows ${payment.currency} ${paymentAmount.toLocaleString()}, payout shows ${payout.currency} ${payoutAmount.toLocaleString()}.`,
        tone: "rose",
      });
    } else {
      diagnostics.push({
        title: "Amount reconciled",
        detail: `${payment.currency} ${paymentAmount.toLocaleString()} matches the payout row.`,
        tone: "emerald",
      });
    }
  }

  if (payout) {
    const destinationVerified = token(payout.destinationVerificationStatus) === "verified" && payout.destinationActive !== false;
    diagnostics.push({
      title: "Payout row present",
      detail: `${payout.id} loaded from Admin Payouts.`,
      tone: "emerald",
    });

    diagnostics.push({
      title: "Destination state",
      detail: destinationVerified ? "Destination is verified and active." : `Destination status: ${toText(payout.destinationVerificationStatus)}${payout.destinationActive === false ? " (inactive)" : ""}.`,
      tone: destinationVerified ? "emerald" : "amber",
    });

    if (payout.providerReference || payout.providerTransactionId) {
      diagnostics.push({
        title: "Provider linkage",
        detail: [payout.providerReference, payout.providerTransactionId].filter(Boolean).join(" · "),
        tone: "emerald",
      });
    } else {
      diagnostics.push({
        title: "Provider linkage missing",
        detail: "No provider reference or provider transaction id is attached to this payout.",
        tone: "amber",
      });
    }

    if (payout.retryBlockedReason || payout.manualReviewReason || payout.holdReason || payout.latestAttemptFailureReason || payout.lastError) {
      diagnostics.push({
        title: "Blocking reason present",
        detail: payout.retryBlockedReason || payout.manualReviewReason || payout.holdReason || payout.latestAttemptFailureReason || payout.lastError || "Pending manual review",
        tone: "amber",
      });
    }
  }

  return diagnostics;
}

function DiagnosticCard({ diagnostic }: { diagnostic: Diagnostic }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${diagnostic.tone === "emerald" ? "border-emerald-200 bg-emerald-50/70" : diagnostic.tone === "amber" ? "border-amber-200 bg-amber-50/70" : diagnostic.tone === "rose" ? "border-rose-200 bg-rose-50/70" : diagnostic.tone === "blue" ? "border-blue-200 bg-blue-50/70" : "border-zinc-200 bg-white"}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 font-black text-zinc-900 shadow-sm">
          {diagnostic.tone === "emerald" ? "✓" : diagnostic.tone === "rose" ? "!" : diagnostic.tone === "amber" ? "?" : "i"}
        </div>
        <div className="min-w-0">
          <h4 className="text-sm font-black tracking-tight text-zinc-900">{diagnostic.title}</h4>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">{diagnostic.detail}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({
  label,
  value,
  sublabel,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-4">
        <p className="text-3xl font-black tracking-tight text-zinc-950">{value}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${TONE_CLASSES[tone]}`}>{label}</span>
      </div>
      {sublabel ? <p className="mt-2 text-sm text-zinc-600">{sublabel}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="break-all font-semibold text-zinc-900">{value}</span>
    </div>
  );
}

function PayloadBlock({ title, payload }: { title: string; payload?: string | null }) {
  return (
    <details className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <summary className="cursor-pointer list-none text-sm font-black text-zinc-900">{title}</summary>
      <pre className="mt-3 max-h-72 overflow-auto rounded-2xl bg-zinc-950 p-4 text-[11px] leading-relaxed text-zinc-100">
        {payload || "—"}
      </pre>
    </details>
  );
}

function PaymentDrawer({
  payment,
  hooks,
  onClose,
}: {
  payment: PaymentRow;
  hooks: WebhookEventRow[];
  onClose: () => void;
}) {
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
                  {hook.payload ? <PayloadBlock title="View payload" payload={hook.payload} /> : null}
                </div>
              )) : <p className="text-sm text-zinc-500">No webhook rows match this reference.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function PayoutDrawer({
  selected,
  onClose,
  adjustments,
  adjustmentsLoading,
  visibleActions,
}: {
  selected: PayoutRow;
  onClose: () => void;
  adjustments: PayoutAdjustment[];
  adjustmentsLoading: boolean;
  visibleActions: Array<OverrideAction | RowAction>;
}) {
  return (
    <AdminPayoutDetailDrawer
      selected={selected}
      visibleActions={visibleActions as string[]}
      actionBusyId={null}
      adjustments={adjustments}
      adjustmentsLoading={adjustmentsLoading}
      destinationStatus={selected.destinationVerificationStatus || "pending"}
      destinationReason={selected.destinationLastError || ""}
      sellerControlReason={selected.holdReason || selected.manualReviewReason || ""}
      adjustmentType="manual_adjustment"
      adjustmentAmount=""
      adjustmentReason=""
      adjustmentProviderRef={selected.providerReference || ""}
      destinationStatusOptions={STATIC_PAYOUT_STATUS_OPTIONS}
      adjustmentTypeOptions={STATIC_ADJUSTMENT_TYPE_OPTIONS}
      canAction={() => false}
      statusTone={statusTone}
      formatStatus={formatStatus}
      toDate={formatDate}
      onClose={onClose}
      onOpenRetryDialog={() => undefined}
      onOpenOverrideDialog={() => undefined}
      onOpenReconcileDialog={() => undefined}
      onOpenRefundEscrowDialog={() => undefined}
      isAdmin={true}
      onDestinationStatusChange={() => undefined}
      onDestinationReasonChange={() => undefined}
      onUpdateDestinationVerification={() => undefined}
      onApproveDestinationVerification={() => undefined}
      onSellerControlReasonChange={() => undefined}
      onUpdateSellerSuspension={() => undefined}
      onReloadAdjustments={() => undefined}
      onAdjustmentTypeChange={() => undefined}
      onAdjustmentAmountChange={() => undefined}
      onAdjustmentReasonChange={() => undefined}
      onAdjustmentProviderRefChange={() => undefined}
      onCreateAdjustment={() => undefined}
    />
  );
}

function statusTone(status: string) {
  const normalized = token(status);
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["failed", "cancelled"].includes(normalized)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["queued", "processing", "pending", "held", "eligible", "ready_for_payout", "pending_settlement"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = String(value || "").toLowerCase();
  if (["eligible", "queued", "processing", "pending", "held", "paid", "failed", "cancelled", "ready_for_payout", "pending_settlement"].includes(normalized)) {
    return getSellerPayoutStatusLabel(normalized);
  }
  return value.replace(/_/g, " ");
}

function mapPaymentToPayoutHints(payment?: PaymentRow | null, payout?: PayoutRow | null): string[] {
  const hints: string[] = [];
  if (payment && payout) {
    if (payment.order_id !== payout.orderId) {
      hints.push(`Order mismatch: payment ${payment.order_id} vs payout ${toText(payout.orderId)}`);
    }
    if (payment.escrow_id && payout.escrowId && payment.escrow_id !== payout.escrowId) {
      hints.push(`Escrow mismatch: payment ${payment.escrow_id} vs payout ${toText(payout.escrowId)}`);
    }
    if (Number(payment.amount) !== Number(payout.amount)) {
      hints.push(`Amount mismatch: payment ${payment.currency} ${Number(payment.amount).toLocaleString()} vs payout ${payout.currency} ${Number(payout.amount).toLocaleString()}`);
    }
  }
  if (payment && !payment.provider_reference) {
    hints.push("Payment gateway reference is missing.");
  }
  if (payout && token(payout.destinationVerificationStatus) !== "verified") {
    hints.push("Payout destination still needs verification.");
  }
  if (payout && payout.destinationActive === false) {
    hints.push("Payout destination is disabled.");
  }
  return hints;
}

function PayoutTableRow({
  payout,
  onSelect,
}: {
  payout: PayoutRow;
  onSelect: (payout: PayoutRow) => void;
}) {
  const payoutMath = payoutMathBreakdown({
    ...payout,
    grossAmount: payout.grossAmount ?? undefined,
    platformFeeAmount: payout.platformFeeAmount ?? undefined,
    reserveAmount: payout.reserveAmount ?? undefined,
    payoutFeeAmount: payout.legacyProcessingFeeAmount ?? undefined,
    sellerReceivesAmount: payout.netAmount ?? payout.amount,
  } as PayoutRecord);

  const signals = sellerOperationalSignals({
    status: payout.status,
    destinationStatus: payout.destinationStatus,
    retryAllowed: payout.retryAllowed,
    manualReviewPending: payout.manualReviewPending,
    verificationBlockers: payout.verificationBlockers,
  });

  return (
    <tr className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50" onClick={() => onSelect(payout)}>
      <td className="p-4 align-top">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Payout</p>
        <p className="mt-1 break-all font-mono text-xs">{payout.id}</p>
        <p className="mt-2 text-[11px] text-zinc-400">Seller {payout.sellerId}</p>
      </td>
      <td className="p-4 align-top">
        <StatusPill label={formatStatus(payout.status)} tone={token(payout.status) === "paid" ? "emerald" : token(payout.status) === "failed" ? "rose" : token(payout.status) === "held" ? "amber" : "zinc"} />
        <div className="mt-2 text-xs text-zinc-500">{getSellerPayoutStatusDetail(payout.status)}</div>
        <div className="mt-2 space-y-1">
          {signals.slice(0, 3).map((message) => (
            <div key={`${payout.id}-${message}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
              {message}
            </div>
          ))}
        </div>
      </td>
      <td className="p-4 align-top text-zinc-600">
        <div className="font-bold text-zinc-900">{money(Number(payoutMath.sellerReceivesAmount), payoutMath.currency)}</div>
        <div className="mt-2 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] font-semibold text-zinc-500">
          <div className="flex justify-between gap-3">
            <span>Gross</span>
            <span>{money(Number(payoutMath.grossAmount), payoutMath.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Fees</span>
            <span>-{money(Number(payoutMath.platformFeeAmount) + Number(payoutMath.payChanguFeeAmount), payoutMath.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Total you receive</span>
            <span>{money(Number(payoutMath.sellerReceivesAmount), payoutMath.currency)}</span>
          </div>
          <div className="rounded-lg bg-white px-2 py-1 text-[10px] leading-4 text-zinc-600">
            {payoutFeeNote({
              ...payout,
              grossAmount: payout.grossAmount ?? undefined,
              platformFeeAmount: payout.platformFeeAmount ?? undefined,
              reserveAmount: payout.reserveAmount ?? undefined,
              payoutFeeAmount: payout.legacyProcessingFeeAmount ?? undefined,
              sellerReceivesAmount: payout.netAmount ?? payout.amount,
            } as PayoutRecord)}
          </div>
        </div>
      </td>
      <td className="p-4 align-top text-zinc-600">{payout.orderId || payout.escrowId || "—"}</td>
      <td className="p-4 align-top text-zinc-500">{formatDate(payout.updatedAt)}</td>
    </tr>
  );
}

function PaymentRowView({
  payment,
  onSelect,
}: {
  payment: PaymentRow;
  onSelect: (payment: PaymentRow) => void;
}) {
  return (
    <tr className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50" onClick={() => onSelect(payment)}>
      <td className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">BuyMesho reference</p>
        <p className="mt-1 break-all font-mono text-xs">{toText(payment.reference)}</p>
        <p className="mt-2 text-[11px] text-zinc-400">{toText(payment.provider)}</p>
      </td>
      <td className="p-4">
        <StatusPill label={normalizeStatusLabel(payment.payment_status)} tone={paymentTone(payment.payment_status)} />
        <div className="mt-2 text-xs text-zinc-500">{toText(payment.method)}</div>
        <div className="mt-1 text-[11px] text-zinc-400">Verified: {Number(payment.verified) === 1 ? "yes" : "no"}</div>
      </td>
      <td className="p-4">
        <StatusPill label={normalizeStatusLabel(payment.order_status)} tone={orderTone(payment.order_status)} />
        <div className="mt-2 break-all text-xs text-zinc-500">{toText(payment.order_id)}</div>
        <div className="mt-1 text-[11px] text-zinc-400">Order paid: {formatDate(payment.order_paid_at)}</div>
      </td>
      <td className="p-4">
        <StatusPill label={normalizeStatusLabel(payment.escrow_state)} tone={escrowTone(payment.escrow_state)} />
        <div className="mt-2 text-xs text-zinc-500">{payment.escrow_id || "No escrow yet"}</div>
        <div className="mt-1 text-[11px] text-zinc-400">Escrow updated: {formatDate(payment.escrow_updated_at)}</div>
      </td>
      <td className="p-4">
        <div className="font-bold">
          {payment.currency} {Number(payment.amount).toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">Gateway reference: {toText(payment.provider_reference)}</div>
      </td>
      <td className="p-4 text-xs text-zinc-500">{formatDate(payment.updated_at)}</td>
    </tr>
  );
}

function WebhookRowView({ event }: { event: WebhookEventRow }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="p-4 align-top">{toText(event.event_type)}</td>
      <td className="p-4 align-top font-mono text-xs break-all">{toText(event.reference)}</td>
      <td className="p-4 align-top">
        <StatusPill label={Number(event.signature_valid) === 1 ? "Valid" : "Invalid"} tone={Number(event.signature_valid) === 1 ? "emerald" : "rose"} />
      </td>
      <td className="p-4 align-top text-zinc-500">{formatDate(event.created_at)}</td>
      <td className="p-4 align-top">{event.payload ? <PayloadBlock title="View payload" payload={event.payload} /> : "—"}</td>
    </tr>
  );
}

function PaymentDrawer({
  payment,
  hooks,
  onClose,
}: {
  payment: PaymentRow;
  hooks: WebhookEventRow[];
  onClose: () => void;
}) {
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
                  {hook.payload ? <PayloadBlock title="View payload" payload={hook.payload} /> : null}
                </div>
              )) : <p className="text-sm text-zinc-500">No webhook rows match this reference.</p>}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

function PayoutDrawer({
  selected,
  onClose,
  adjustments,
  adjustmentsLoading,
  visibleActions,
}: {
  selected: PayoutRow;
  onClose: () => void;
  adjustments: PayoutAdjustment[];
  adjustmentsLoading: boolean;
  visibleActions: Array<OverrideAction | RowAction>;
}) {
  return (
    <AdminPayoutDetailDrawer
      selected={selected}
      visibleActions={visibleActions as string[]}
      actionBusyId={null}
      adjustments={adjustments}
      adjustmentsLoading={adjustmentsLoading}
      destinationStatus={selected.destinationVerificationStatus || "pending"}
      destinationReason={selected.destinationLastError || ""}
      sellerControlReason={selected.holdReason || selected.manualReviewReason || ""}
      adjustmentType="manual_adjustment"
      adjustmentAmount=""
      adjustmentReason=""
      adjustmentProviderRef={selected.providerReference || ""}
      destinationStatusOptions={STATIC_PAYOUT_STATUS_OPTIONS}
      adjustmentTypeOptions={STATIC_ADJUSTMENT_TYPE_OPTIONS}
      canAction={() => false}
      statusTone={statusTone}
      formatStatus={formatStatus}
      toDate={formatDate}
      onClose={onClose}
      onOpenRetryDialog={() => undefined}
      onOpenOverrideDialog={() => undefined}
      onOpenReconcileDialog={() => undefined}
      onOpenRefundEscrowDialog={() => undefined}
      isAdmin={true}
      onDestinationStatusChange={() => undefined}
      onDestinationReasonChange={() => undefined}
      onUpdateDestinationVerification={() => undefined}
      onApproveDestinationVerification={() => undefined}
      onSellerControlReasonChange={() => undefined}
      onUpdateSellerSuspension={() => undefined}
      onReloadAdjustments={() => undefined}
      onAdjustmentTypeChange={() => undefined}
      onAdjustmentAmountChange={() => undefined}
      onAdjustmentReasonChange={() => undefined}
      onAdjustmentProviderRefChange={() => undefined}
      onCreateAdjustment={() => undefined}
    />
  );
}

function statusTone(status: string) {
  const normalized = token(status);
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["failed", "cancelled"].includes(normalized)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (["queued", "processing", "pending", "held", "eligible", "ready_for_payout", "pending_settlement"].includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = String(value || "").toLowerCase();
  if (["eligible", "queued", "processing", "pending", "held", "paid", "failed", "cancelled", "ready_for_payout", "pending_settlement"].includes(normalized)) {
    return getSellerPayoutStatusLabel(normalized);
  }
  return value.replace(/_/g, " ");
}

function mapPaymentToPayoutHints(payment?: PaymentRow | null, payout?: PayoutRow | null): string[] {
  const hints: string[] = [];
  if (payment && payout) {
    if (payment.order_id !== payout.orderId) {
      hints.push(`Order mismatch: payment ${payment.order_id} vs payout ${toText(payout.orderId)}`);
    }
    if (payment.escrow_id && payout.escrowId && payment.escrow_id !== payout.escrowId) {
      hints.push(`Escrow mismatch: payment ${payment.escrow_id} vs payout ${toText(payout.escrowId)}`);
    }
    if (Number(payment.amount) !== Number(payout.amount)) {
      hints.push(`Amount mismatch: payment ${payment.currency} ${Number(payment.amount).toLocaleString()} vs payout ${payout.currency} ${Number(payout.amount).toLocaleString()}`);
    }
  }
  if (payment && !payment.provider_reference) {
    hints.push("Payment gateway reference is missing.");
  }
  if (payout && token(payout.destinationVerificationStatus) !== "verified") {
    hints.push("Payout destination still needs verification.");
  }
  if (payout && payout.destinationActive === false) {
    hints.push("Payout destination is disabled.");
  }
  return hints;
}

function PayoutTableRow({
  payout,
  onSelect,
}: {
  payout: PayoutRow;
  onSelect: (payout: PayoutRow) => void;
}) {
  const payoutMath = payoutMathBreakdown({
    ...payout,
    grossAmount: payout.grossAmount ?? undefined,
    platformFeeAmount: payout.platformFeeAmount ?? undefined,
    reserveAmount: payout.reserveAmount ?? undefined,
    payoutFeeAmount: payout.legacyProcessingFeeAmount ?? undefined,
    sellerReceivesAmount: payout.netAmount ?? payout.amount,
  } as PayoutRecord);

  const signals = sellerOperationalSignals({
    status: payout.status,
    destinationStatus: payout.destinationStatus,
    retryAllowed: payout.retryAllowed,
    manualReviewPending: payout.manualReviewPending,
    verificationBlockers: payout.verificationBlockers,
  });

  return (
    <tr className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50" onClick={() => onSelect(payout)}>
      <td className="p-4 align-top">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">Payout</p>
        <p className="mt-1 break-all font-mono text-xs">{payout.id}</p>
        <p className="mt-2 text-[11px] text-zinc-400">Seller {payout.sellerId}</p>
      </td>
      <td className="p-4 align-top">
        <StatusPill label={formatStatus(payout.status)} tone={token(payout.status) === "paid" ? "emerald" : token(payout.status) === "failed" ? "rose" : token(payout.status) === "held" ? "amber" : "zinc"} />
        <div className="mt-2 text-xs text-zinc-500">{getSellerPayoutStatusDetail(payout.status)}</div>
        <div className="mt-2 space-y-1">
          {signals.slice(0, 3).map((message) => (
            <div key={`${payout.id}-${message}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700">
              {message}
            </div>
          ))}
        </div>
      </td>
      <td className="p-4 align-top text-zinc-600">
        <div className="font-bold text-zinc-900">{money(Number(payoutMath.sellerReceivesAmount), payoutMath.currency)}</div>
        <div className="mt-2 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] font-semibold text-zinc-500">
          <div className="flex justify-between gap-3">
            <span>Gross</span>
            <span>{money(Number(payoutMath.grossAmount), payoutMath.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Fees</span>
            <span>-{money(Number(payoutMath.platformFeeAmount) + Number(payoutMath.payChanguFeeAmount), payoutMath.currency)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span>Total you receive</span>
            <span>{money(Number(payoutMath.sellerReceivesAmount), payoutMath.currency)}</span>
          </div>
          <div className="rounded-lg bg-white px-2 py-1 text-[10px] leading-4 text-zinc-600">
            {payoutFeeNote({
              ...payout,
              grossAmount: payout.grossAmount ?? undefined,
              platformFeeAmount: payout.platformFeeAmount ?? undefined,
              reserveAmount: payout.reserveAmount ?? undefined,
              payoutFeeAmount: payout.legacyProcessingFeeAmount ?? undefined,
              sellerReceivesAmount: payout.netAmount ?? payout.amount,
            } as PayoutRecord)}
          </div>
        </div>
      </td>
      <td className="p-4 align-top text-zinc-600">{payout.orderId || payout.escrowId || "—"}</td>
      <td className="p-4 align-top text-zinc-500">{formatDate(payout.updatedAt)}</td>
    </tr>
  );
}

function PaymentRowView({
  payment,
  onSelect,
}: {
  payment: PaymentRow;
  onSelect: (payment: PaymentRow) => void;
}) {
  return (
    <tr className="cursor-pointer border-t border-zinc-100 hover:bg-zinc-50" onClick={() => onSelect(payment)}>
      <td className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">BuyMesho reference</p>
        <p className="mt-1 break-all font-mono text-xs">{toText(payment.reference)}</p>
        <p className="mt-2 text-[11px] text-zinc-400">{toText(payment.provider)}</p>
      </td>
      <td className="p-4">
        <StatusPill label={normalizeStatusLabel(payment.payment_status)} tone={paymentTone(payment.payment_status)} />
        <div className="mt-2 text-xs text-zinc-500">{toText(payment.method)}</div>
        <div className="mt-1 text-[11px] text-zinc-400">Verified: {Number(payment.verified) === 1 ? "yes" : "no"}</div>
      </td>
      <td className="p-4">
        <StatusPill label={normalizeStatusLabel(payment.order_status)} tone={orderTone(payment.order_status)} />
        <div className="mt-2 break-all text-xs text-zinc-500">{toText(payment.order_id)}</div>
        <div className="mt-1 text-[11px] text-zinc-400">Order paid: {formatDate(payment.order_paid_at)}</div>
      </td>
      <td className="p-4">
        <StatusPill label={normalizeStatusLabel(payment.escrow_state)} tone={escrowTone(payment.escrow_state)} />
        <div className="mt-2 text-xs text-zinc-500">{payment.escrow_id || "No escrow yet"}</div>
        <div className="mt-1 text-[11px] text-zinc-400">Escrow updated: {formatDate(payment.escrow_updated_at)}</div>
      </td>
      <td className="p-4">
        <div className="font-bold">
          {payment.currency} {Number(payment.amount).toLocaleString()}
        </div>
        <div className="mt-1 text-[11px] text-zinc-400">Gateway reference: {toText(payment.provider_reference)}</div>
      </td>
      <td className="p-4 text-xs text-zinc-500">{formatDate(payment.updated_at)}</td>
    </tr>
  );
}

function WebhookRowView({ event }: { event: WebhookEventRow }) {
  return (
    <tr className="border-t border-zinc-100">
      <td className="p-4 align-top">{toText(event.event_type)}</td>
      <td className="p-4 align-top font-mono text-xs break-all">{toText(event.reference)}</td>
      <td className="p-4 align-top">
        <StatusPill label={Number(event.signature_valid) === 1 ? "Valid" : "Invalid"} tone={Number(event.signature_valid) === 1 ? "emerald" : "rose"} />
      </td>
      <td className="p-4 align-top text-zinc-500">{formatDate(event.created_at)}</td>
      <td className="p-4 align-top">{event.payload ? <PayloadBlock title="View payload" payload={event.payload} /> : "—"}</td>
    </tr>
  );
}

export default function AdminPaymentsConsole() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [sellerHistory, setSellerHistory] = useState<PayoutRecord[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [payoutSummary, setPayoutSummary] = useState<PayoutsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaymentReference, setSelectedPaymentReference] = useState<string | null>(null);
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [paymentSortMode, setPaymentSortMode] = useState<SortMode>("recent");
  const [webhookSortMode, setWebhookSortMode] = useState<WebhookSortMode>("recent");
  const [payoutSortMode, setPayoutSortMode] = useState<PayoutSortMode>("recent");
  const [selectedPayoutAdjustments, setSelectedPayoutAdjustments] = useState<PayoutAdjustment[]>([]);
  const [selectedPayoutAdjustmentsLoading, setSelectedPayoutAdjustmentsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setError(null);
      try {
        const [paymentsData, webhookData, summaryData, payoutsData, payoutSummaryData] = await Promise.allSettled([
          apiFetch("/api/admin/payments"),
          apiFetch("/api/admin/webhook-events"),
          apiFetch("/api/admin/payment-summary"),
          apiFetch("/api/admin/payouts?limit=100&offset=0"),
          apiFetch("/api/admin/payouts/summary"),
        ]);

        if (!mounted) return;

        const paymentRows = paymentsData.status === "fulfilled" ? paymentsData.value : null;
        const webhookRows = webhookData.status === "fulfilled" ? webhookData.value : null;
        const payoutRows = payoutsData.status === "fulfilled" ? payoutsData.value : null;

        setPayments(extractArray<PaymentRow>(paymentRows, ["rows", "payments"]));
        setWebhookEvents(extractArray<WebhookEventRow>(webhookRows, ["rows", "events", "webhookEvents", "webhooks"]));
        setSummary((summaryData.status === "fulfilled" ? (summaryData.value ?? {}) : {}) as SummaryResponse);
        setPayouts(extractArray<PayoutRow>(payoutRows, ["rows", "payouts"]));
        setPayoutSummary((payoutSummaryData.status === "fulfilled" ? (payoutSummaryData.value ?? {}) : {}) as PayoutsSummaryResponse);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load transaction monitoring data.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedPayments = useMemo(() => sortPayments(payments, paymentSortMode), [payments, paymentSortMode]);
  const sortedWebhookEvents = useMemo(() => sortWebhooks(webhookEvents, webhookSortMode), [webhookEvents, webhookSortMode]);
  const sortedPayouts = useMemo(() => sortPayouts(payouts, payoutSortMode), [payouts, payoutSortMode]);

  const latestPayment = useMemo(() => {
    return sortedPayments[0] ?? null;
  }, [sortedPayments]);

  const selectedPayment = useMemo(
    () => payments.find((payment) => payment.reference === selectedPaymentReference) ?? latestPayment,
    [payments, selectedPaymentReference, latestPayment],
  );

  const linkedPayout = useMemo(() => {
    if (!selectedPayment) return null;
    return (
      payouts.find((row) => row.orderId === selectedPayment.order_id) ??
      payouts.find((row) => row.escrowId && selectedPayment.escrow_id && row.escrowId === selectedPayment.escrow_id) ??
      null
    );
  }, [payouts, selectedPayment]);

  const selectedPayout = useMemo(
    () => payouts.find((row) => row.id === selectedPayoutId) ?? linkedPayout ?? sortedPayouts[0] ?? null,
    [linkedPayout, payoutSortMode, payouts, selectedPayoutId, sortedPayouts],
  );

  const selectedPaymentHooks = useMemo(() => {
    if (!selectedPayment) return [];
    return webhookEvents.filter((event) => event.reference === selectedPayment.reference);
  }, [selectedPayment, webhookEvents]);

  const latestWebhook = useMemo(() => sortedWebhookEvents[0] ?? null, [sortedWebhookEvents]);

  const historySellerId = selectedPayout?.sellerId ?? linkedPayout?.sellerId ?? sortedPayouts[0]?.sellerId ?? null;

  useEffect(() => {
    let mounted = true;

    if (!historySellerId) {
      setSellerHistory([]);
      return;
    }

    const loadSellerHistory = async () => {
      setSelectedPayoutAdjustmentsLoading(true);
      try {
        const [historyRes, adjustmentsRes] = await Promise.allSettled([
          apiFetch(`/api/payouts/history/${encodeURIComponent(historySellerId)}`),
          selectedPayout ? apiFetch(`/api/admin/payouts/${encodeURIComponent(selectedPayout.id)}/adjustments`) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        const historyData = historyRes.status === "fulfilled" ? historyRes.value : null;
        setSellerHistory(extractArray<PayoutRecord>(historyData, ["payouts", "rows", "history"]));

        const adjustmentData = adjustmentsRes.status === "fulfilled" ? adjustmentsRes.value : null;
        setSelectedPayoutAdjustments(extractArray<PayoutAdjustment>(adjustmentData, ["adjustments", "rows"]));
      } catch {
        if (!mounted) return;
        setSellerHistory([]);
        setSelectedPayoutAdjustments([]);
      } finally {
        if (mounted) {
          setSelectedPayoutAdjustmentsLoading(false);
        }
      }
    };

    void loadSellerHistory();

    return () => {
      mounted = false;
    };
  }, [historySellerId, selectedPayout]);

  const stats = useMemo(
    () => ({
      totalPayments: summary?.summary?.total_payments ?? payments.length,
      verifiedPayments: summary?.summary?.verified_payments ?? payments.filter((p) => Number(p.verified) === 1).length,
      paidPayments: summary?.summary?.paid_payments ?? payments.filter((p) => ["paid", "captured", "success"].includes(token(p.payment_status))).length,
      pendingPayments: summary?.summary?.pending_payments ?? payments.filter((p) => token(p.payment_status) === "pending").length,
      totalWebhooks: summary?.webhookSummary?.total_webhooks ?? webhookEvents.length,
      validWebhooks: summary?.webhookSummary?.valid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 1).length,
      invalidWebhooks: summary?.webhookSummary?.invalid_webhooks ?? webhookEvents.filter((e) => Number(e.signature_valid) === 0).length,
      totalPayouts: payoutSummary?.summary?.totalPayouts ?? payouts.length,
      paidPayouts: payoutSummary?.summary?.paidPayouts ?? payouts.filter((p) => token(p.status) === "paid").length,
      failedPayouts: payoutSummary?.summary?.failedPayouts ?? payouts.filter((p) => token(p.status) === "failed").length,
      heldPayouts: payoutSummary?.summary?.pendingPayouts ?? payouts.filter((p) => token(p.status) === "held").length,
    }),
    [payments, payoutSummary, payouts, summary, webhookEvents],
  );

  const selectedPaymentDiagnostics = useMemo(
    () => buildDiagnostics(selectedPayment, selectedPaymentHooks, selectedPayout),
    [selectedPayment, selectedPaymentHooks, selectedPayout],
  );

  const lifecycleSteps = useMemo(
    () => buildLifecycleSteps(selectedPayment, selectedPaymentHooks, selectedPayout),
    [selectedPayment, selectedPaymentHooks, selectedPayout],
  );

  const integrityHints = useMemo(
    () => mapPaymentToPayoutHints(selectedPayment, selectedPayout),
    [selectedPayment, selectedPayout],
  );

  const historySummary = useMemo(() => {
    const total = sellerHistory.length;
    const paid = sellerHistory.filter((row) => token(row.status) === "paid").length;
    const held = sellerHistory.filter((row) => token(row.status) === "held").length;
    const failed = sellerHistory.filter((row) => token(row.status) === "failed").length;
    return { total, paid, held, failed };
  }, [sellerHistory]);

  const handleRefresh = async () => {
    window.location.reload();
  };

  const activeSortLabel =
    paymentSortMode === "recent"
      ? "Recent"
      : paymentSortMode === "verified"
        ? "Verified"
        : paymentSortMode === "paid"
          ? "Paid"
          : "Pending";

  const payoutSortLabel =
    payoutSortMode === "recent"
      ? "Recent"
      : payoutSortMode === "paid"
        ? "Paid"
        : payoutSortMode === "failed"
          ? "Failed"
          : "Held";

  const selectedPayoutHistory = sellerHistory;

  return (
    <AdminWorkspaceLayout
      title="Transaction Inspector"
      description="A unified workspace for payments, webhooks, seller payouts, and payout history. The goal is to spot broken links instantly instead of chasing screens one by one."
      onRefresh={handleRefresh}
    >
      <main className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStat label="Payments" value={stats.totalPayments} sublabel={`${stats.verifiedPayments} verified · ${stats.paidPayments} paid`} tone="zinc" />
          <SummaryStat label="Webhooks" value={stats.totalWebhooks} sublabel={`${stats.validWebhooks} valid · ${stats.invalidWebhooks} invalid`} tone="blue" />
          <SummaryStat label="Payouts" value={stats.totalPayouts} sublabel={`${stats.paidPayouts} paid · ${stats.failedPayouts} failed`} tone="emerald" />
          <SummaryStat label="Held" value={stats.heldPayouts} sublabel={`${stats.pendingPayments} payment pending`} tone="amber" />
        </section>

        {latestPayment ? (
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h2 className="text-lg font-black">Latest Transaction Lifecycle</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-600">Showing latest order reference: {toText(latestPayment.reference)}</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {lifecycleSteps.map((step) => (
                <div key={step.number} className={`rounded-2xl border p-4 shadow-sm ${step.state === "done" ? "border-emerald-200 bg-emerald-50/70" : step.state === "active" ? "border-blue-200 bg-blue-50/70" : step.state === "issue" ? "border-rose-200 bg-rose-50/70" : "border-zinc-200 bg-white"}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 font-black text-zinc-900 shadow-sm">{step.number}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-black tracking-tight text-zinc-900">{step.title}</h3>
                        <StatusPill label={step.state === "done" ? "Done" : step.state === "active" ? "Active" : step.state === "issue" ? "Issue" : "Waiting"} tone={lifecycleTone(step.state)} />
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{step.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><ShieldCheck className="h-5 w-5" /></div>
              <div className="space-y-2">
                <p className="text-sm font-black text-zinc-900">Transaction integrity</p>
                <p className="text-sm leading-relaxed text-zinc-600">These checks are the fast path for the random failures you were seeing. The page compares payment, webhook, payout, and history records before you waste time opening separate screens.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {selectedPaymentDiagnostics.map((diagnostic) => (
                <DiagnosticCard key={`${diagnostic.title}-${diagnostic.detail}`} diagnostic={diagnostic} />
              ))}
            </div>

            {integrityHints.length ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-black text-amber-950">Mismatch hints</p>
                <ul className="mt-2 space-y-1">
                  {integrityHints.map((hint) => (
                    <li key={hint}>• {hint}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <h3 className="text-base font-black">Seller payout snapshot</h3>
            </div>

            {selectedPayout ? (
              <div className="mt-4 space-y-3">
                <Row label="Payout ID" value={selectedPayout.id} />
                <Row label="Seller ID" value={selectedPayout.sellerId} />
                <Row label="Status" value={<StatusPill label={formatStatus(selectedPayout.status)} tone={token(selectedPayout.status) === "paid" ? "emerald" : token(selectedPayout.status) === "failed" ? "rose" : token(selectedPayout.status) === "held" ? "amber" : "zinc"} />} />
                <Row label="Destination" value={selectedPayout.destinationMaskedAccount || "—"} />
                <Row label="Destination type" value={toText(selectedPayout.destinationType)} />
                <Row label="Requested at" value={formatDate(selectedPayout.requestedAt)} />
                <Row label="Latest webhook" value={latestWebhook ? `${toText(latestWebhook.event_type)} · ${formatDate(latestWebhook.created_at)}` : "—"} />
                <Row label="Updated at" value={formatDate(selectedPayout.updatedAt)} />
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                  <p className="font-black text-zinc-950">Quick read</p>
                  <p className="mt-2">{getSellerPayoutStatusDetail(selectedPayout.status)}</p>
                  <div className="mt-3 space-y-1">
                    {sellerOperationalSignals({
                      status: selectedPayout.status,
                      destinationStatus: selectedPayout.destinationStatus,
                      retryAllowed: selectedPayout.retryAllowed,
                      manualReviewPending: selectedPayout.manualReviewPending,
                      verificationBlockers: selectedPayout.verificationBlockers,
                    }).map((message) => (
                      <div key={message} className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold">
                        {message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">No payout row selected yet.</p>
            )}

            <div className="mt-5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
              <p className="font-black text-zinc-950">Seller history summary</p>
              <p className="mt-2">Total: {historySummary.total} · Paid: {historySummary.paid} · Held: {historySummary.held} · Failed: {historySummary.failed}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Payment sort</p>
            <p className="mt-1 text-sm text-zinc-600">Current sort: <span className="font-bold text-zinc-900">{activeSortLabel}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PAYMENT_SORTS.map((item) => (
              <StatButton key={item.key} label={item.label} value={item.key === "recent" ? stats.totalPayments : item.key === "verified" ? stats.verifiedPayments : item.key === "paid" ? stats.paidPayments : stats.pendingPayments} active={paymentSortMode === item.key} onClick={() => setPaymentSortMode(item.key)} />
            ))}
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h2 className="text-lg font-black">Payment records</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
          ) : sortedPayments.length === 0 ? (
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
                  {sortedPayments.map((payment) => (
                    <PaymentRowView
                      key={payment.id}
                      payment={payment}
                      onSelect={(nextPayment) => {
                        setSelectedPaymentReference(nextPayment.reference);
                        const linked = payouts.find((row) => row.orderId === nextPayment.order_id) ?? payouts.find((row) => row.escrowId && nextPayment.escrow_id && row.escrowId === nextPayment.escrow_id) ?? null;
                        if (linked) {
                          setSelectedPayoutId(linked.id);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Webhook sort</p>
            <p className="mt-1 text-sm text-zinc-600">Current sort: <span className="font-bold text-zinc-900">{webhookSortMode === "recent" ? "Recent" : webhookSortMode === "valid" ? "Valid hooks" : "Invalid hooks"}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {WEBHOOK_SORTS.map((item) => (
              <StatButton key={item.key} label={item.label} value={item.key === "recent" ? stats.totalWebhooks : item.key === "valid" ? stats.validWebhooks : stats.invalidWebhooks} active={webhookSortMode === item.key} onClick={() => setWebhookSortMode(item.key)} />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              <h2 className="text-lg font-black">Webhook log</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
          ) : sortedWebhookEvents.length === 0 ? (
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
                    <th className="p-4 text-left">Payload</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWebhookEvents.map((event) => (
                    <WebhookRowView key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Payout sort</p>
            <p className="mt-1 text-sm text-zinc-600">Current sort: <span className="font-bold text-zinc-900">{payoutSortLabel}</span></p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PAYOUT_SORTS.map((item) => (
              <StatButton
                key={item.key}
                label={item.label}
                value={item.key === "recent" ? stats.totalPayouts : item.key === "paid" ? stats.paidPayouts : item.key === "failed" ? stats.failedPayouts : stats.heldPayouts}
                active={payoutSortMode === item.key}
                onClick={() => setPayoutSortMode(item.key)}
              />
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <h2 className="text-lg font-black">Seller payout records</h2>
            </div>
            <p className="mt-2 text-sm text-zinc-600">This is the admin-side payout list, shown alongside the seller history below.</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
          ) : sortedPayouts.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">No payout rows found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="p-4 text-left">Payout</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Amount</th>
                    <th className="p-4 text-left">Order</th>
                    <th className="p-4 text-left">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPayouts.map((payout) => (
                    <PayoutTableRow
                      key={payout.id}
                      payout={payout}
                      onSelect={(nextPayout) => {
                        setSelectedPayoutId(nextPayout.id);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <SellerPayoutsHistorySection payouts={selectedPayoutHistory} canViewHistory={true} />
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><BadgeInfo className="h-5 w-5" /></div>
            <div className="space-y-2">
              <p className="text-sm font-black text-zinc-900">How to read this page</p>
              <p className="text-sm leading-relaxed text-zinc-600">This view should tell you immediately whether the problem is payment capture, webhook verification, payout routing, destination verification, or a seller-side history issue. No more jumping between five screens to diagnose one broken record.</p>
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><CircleAlert className="h-3.5 w-3.5" />Escrow control belongs to the order flow; payout control belongs here.</p>
            </div>
          </div>
        </section>
      </main>

      {selectedPayment ? <PaymentDrawer payment={selectedPayment} hooks={selectedPaymentHooks} onClose={() => setSelectedPaymentReference(null)} /> : null}
      {selectedPayout ? (
        <PayoutDrawer
          selected={selectedPayout}
          onClose={() => setSelectedPayoutId(null)}
          adjustments={selectedPayoutAdjustments}
          adjustmentsLoading={selectedPayoutAdjustmentsLoading}
          visibleActions={STATIC_VISIBLE_ACTIONS}
        />
      ) : null}
    </AdminWorkspaceLayout>
  );
}
