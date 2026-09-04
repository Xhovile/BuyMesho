import { CreditCard, ShieldAlert } from 'lucide-react';

type DisputeActionsCardProps = {
  disputeReason: string;
  submitting: 'release' | 'dispute' | null;
  canConfirmDelivery?: boolean;
  orderDisputed?: boolean;
  escrowReleased: boolean;
  escrowUnavailable: boolean;
  onChangeReason: (value: string) => void;
  onConfirmDelivery: () => void;
  onOpenDispute: () => void;
};

export default function DisputeActionsCard({
  disputeReason,
  submitting,
  canConfirmDelivery = false,
  orderDisputed = false,
  escrowReleased,
  escrowUnavailable,
  onChangeReason,
  onConfirmDelivery,
  onOpenDispute,
}: DisputeActionsCardProps) {
  const releaseInProgress = submitting === 'release';
  const releaseCompleted = escrowReleased && !releaseInProgress;
  const releaseDisabled = releaseCompleted || !canConfirmDelivery || escrowUnavailable || orderDisputed || submitting !== null;

  if (orderDisputed) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="text-sm font-black text-amber-950">Order under dispute review</p>
            <p className="mt-1 text-sm leading-6 text-amber-900/80">
              Delivery confirmation and escrow release are paused while BuyMesho reviews the dispute.
            </p>
          </div>
        </div>
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
