import { CreditCard, ShieldAlert } from 'lucide-react';

type DisputeActionsCardProps = {
  disputeReason: string;
  submitting: 'release' | 'dispute' | null;
  canConfirmDelivery: boolean;
  releaseCountdownText?: string | null;
  onChangeReason: (value: string) => void;
  onConfirmDelivery: () => void;
  onOpenDispute: () => void;
};

export default function DisputeActionsCard({
  disputeReason,
  submitting,
  canConfirmDelivery,
  releaseCountdownText,
  onChangeReason,
  onConfirmDelivery,
  onOpenDispute,
}: DisputeActionsCardProps) {
  const releaseInProgress = submitting === 'release';
  const releaseStale = releaseInProgress || !canConfirmDelivery;

  return (
    <div className="space-y-3">
      {!canConfirmDelivery && releaseCountdownText ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          {releaseCountdownText}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onConfirmDelivery}
        disabled={releaseStale || submitting !== null}
        aria-disabled={releaseStale || submitting !== null}
        className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
          releaseStale
            ? 'border border-zinc-200 bg-zinc-100 text-zinc-500'
            : 'bg-zinc-900 text-white hover:bg-zinc-800'
        }`}
      >
        <CreditCard className="h-4 w-4" />
        {releaseInProgress
          ? 'Submitting escrow…'
          : releaseStale
            ? 'Escrow released'
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