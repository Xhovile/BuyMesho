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
        disabled={!canConfirmDelivery || submitting !== null}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        <CreditCard className="h-4 w-4" />
        {submitting === 'release'
          ? 'Confirming...'
          : 'Confirm delivery (release escrow)'}
      </button>

      <div className="rounded-2xl border border-zinc-200 bg-white p-3">
        <label className="mb-2 block text-xs font-bold text-zinc-600">
          Dispute reason
        </label>

        <input
          value={disputeReason}
          onChange={(e) => onChangeReason(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
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
