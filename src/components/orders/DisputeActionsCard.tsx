import { useEffect, useState } from 'react';
import { CreditCard, ShieldAlert } from 'lucide-react';

import { fetchOrderByReference, type OrderBundle } from '../../lib/orderApi';

type DisputeActionsCardProps = {
  disputeReason: string;
  submitting: 'release' | 'dispute' | null;
  canConfirmDelivery?: boolean;
  orderDisputed?: boolean;
  disputeStatus?: string | null;
  escrowReleased: boolean;
  escrowUnavailable: boolean;
  onChangeReason: (value: string) => void;
  onConfirmDelivery: () => void;
  onOpenDispute: () => void;
};

function disputeStatusLabel(status: string | null | undefined): string {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'under_review') return 'Under Review';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'resolved') return 'Resolved';
  if (normalized === 'open') return 'Submitted';
  return 'Submitted';
}

function getReferenceFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  return segments[1] ? decodeURIComponent(segments[1]) : null;
}

function disputeIsLocked(bundle: OrderBundle | null): boolean {
  if (!bundle?.dispute) return false;

  const status = String(bundle.dispute.status ?? '').trim().toLowerCase();
  const orderStatus = String(bundle.order?.status ?? '').trim().toLowerCase();
  const escrowState = String(
    bundle.escrow?.state ?? bundle.escrow?.status ?? '',
  ).trim().toLowerCase();

  if (orderStatus === 'refunded' || escrowState === 'refunded') return true;
  return status !== 'resolved' && status !== 'rejected';
}

function getDisputeStatus(bundle: OrderBundle | null): string | null {
  const status = bundle?.dispute?.status;
  return typeof status === 'string' ? status : null;
}

export default function DisputeActionsCard({
  disputeReason,
  submitting,
  canConfirmDelivery = false,
  orderDisputed = false,
  disputeStatus = null,
  escrowReleased,
  escrowUnavailable,
  onChangeReason,
  onConfirmDelivery,
  onOpenDispute,
}: DisputeActionsCardProps) {
  const [remoteBundle, setRemoteBundle] = useState<OrderBundle | null>(null);

  useEffect(() => {
    let cancelled = false;
    const reference = getReferenceFromUrl();
    if (!reference) return undefined;

    void fetchOrderByReference(reference)
      .then((data) => {
        if (!cancelled) setRemoteBundle(data);
      })
      .catch(() => {
        // The parent order page remains the source of truth when this
        // secondary dispute-status lookup is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [submitting]);

  const remoteLocked = disputeIsLocked(remoteBundle);
  const effectiveOrderDisputed = orderDisputed || remoteLocked;
  const effectiveDisputeStatus = disputeStatus || getDisputeStatus(remoteBundle);
  const releaseInProgress = submitting === 'release';
  const releaseCompleted = escrowReleased && !releaseInProgress;
  const releaseDisabled = releaseCompleted || !canConfirmDelivery || escrowUnavailable || effectiveOrderDisputed || submitting !== null;

  if (effectiveOrderDisputed) {
    const statusLabel = disputeStatusLabel(effectiveDisputeStatus);
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-black text-amber-950">This order is under dispute review.</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">
                Your dispute has been submitted and is currently {statusLabel.toLowerCase()}. You cannot submit another dispute for this order while this case remains active.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-500"
        >
          <ShieldAlert className="h-4 w-4" />
          Dispute {statusLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onConfirmDelivery}
        disabled={releaseDisabled}
        aria-disabled={releaseDisabled}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          releaseCompleted || escrowUnavailable || !canConfirmDelivery
            ? 'border border-zinc-200 bg-zinc-100 text-zinc-500'
            : 'bg-[#7F1D1D] text-white hover:bg-[#991B1B]'
        }`}
      >
        <CreditCard className="h-4 w-4" />
        {releaseInProgress
          ? 'Submitting escrow…'
          : releaseCompleted
            ? 'Escrow released'
            : escrowUnavailable
              ? 'Escrow not available'
              : !canConfirmDelivery
                ? 'Delivery confirmation unavailable'
                : 'Confirm delivery (release escrow)'}
      </button>

      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <label className="mb-2 block text-xs font-bold text-zinc-600">
          Dispute reason
        </label>

        <textarea
          value={disputeReason}
          onChange={(e) => onChangeReason(e.target.value)}
          rows={6}
          className="min-h-28 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-6"
          placeholder="Describe the issue"
        />

        <button
          type="button"
          onClick={onOpenDispute}
          disabled={submitting !== null}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
        >
          <ShieldAlert className="h-4 w-4" />
          {submitting === 'dispute' ? 'Submitting...' : 'Open dispute'}
        </button>
      </div>
    </div>
  );
}
