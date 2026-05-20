import { BadgeInfo, CircleAlert, Loader2, RefreshCw, ShieldCheck, Wallet, X } from "lucide-react";
import type { OverrideAction, PayoutRow, RowAction } from "./AdminPayoutsManager";

type PayoutQueueCardProps = {
  row: PayoutRow;
  busy: boolean;
  visibleActions: string[];
  canAction: (row: PayoutRow, action: RowAction) => boolean;
  statusTone: (status: string) => string;
  formatStatus: (value: string | null | undefined) => string;
  onOpenDetails: () => void;
  onOpenReconcile: () => void;
  onOpenRetry: () => void;
  onOpenOverride: (action: OverrideAction, confirmLabel: string) => void;
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 break-all font-medium text-zinc-900">{value}</p>
    </div>
  );
}

export default function PayoutQueueCard({
  row,
  busy,
  visibleActions,
  canAction,
  statusTone,
  formatStatus,
  onOpenDetails,
  onOpenReconcile,
  onOpenRetry,
  onOpenOverride,
}: PayoutQueueCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusTone(row.status)}`}>
              {formatStatus(row.status)}
            </span>
            {row.retryEligible ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                retry eligible
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-600">
                {row.retryBlockedReason ?? "retry unavailable"}
              </span>
            )}
            {row.destinationVerificationStatus ? (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700">
                destination {formatStatus(row.destinationVerificationStatus)}
              </span>
            ) : null}
          </div>

          <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2 xl:grid-cols-4">
            <Info label="Payout ID" value={row.id} />
            <Info label="Seller ID" value={row.sellerId} />
            <Info label="Order ID" value={row.orderId ?? "—"} />
            <Info label="Amount" value={`${row.currency} ${Number(row.amount).toLocaleString()}`} />
            <Info label="Destination" value={row.destinationMaskedAccount ?? "—"} />
          </div>

          {Array.isArray(row.verificationBlockers) && row.verificationBlockers.length > 0 ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <strong>Verification blockers:</strong> {row.verificationBlockers.join(" • ")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 lg:w-[340px] lg:justify-end">
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            <BadgeInfo className="h-4 w-4" />
            Details
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={onOpenReconcile}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reconcile
          </button>

          {visibleActions.includes("retry") ? (
            <button
              type="button"
              disabled={busy || !canAction(row, "retry")}
              onClick={onOpenRetry}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Retry
            </button>
          ) : null}

          {visibleActions.includes("hold") ? (
            <button
              type="button"
              disabled={busy || !canAction(row, "hold")}
              onClick={() => onOpenOverride("hold", "hold")}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Hold
            </button>
          ) : null}

          {visibleActions.includes("mark_paid") ? (
            <button
              type="button"
              disabled={busy || !canAction(row, "mark_paid")}
              onClick={() => onOpenOverride("mark_paid", "mark paid")}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Mark paid
            </button>
          ) : null}

          {visibleActions.includes("mark_failed") ? (
            <button
              type="button"
              disabled={busy || !canAction(row, "mark_failed")}
              onClick={() => onOpenOverride("mark_failed", "mark failed")}
              className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleAlert className="h-4 w-4" />}
              Mark failed
            </button>
          ) : null}

          {visibleActions.includes("cancel") ? (
            <button
              type="button"
              disabled={busy || !canAction(row, "cancel")}
              onClick={() => onOpenOverride("cancel", "cancel")}
              className="inline-flex items-center gap-2 rounded-2xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
