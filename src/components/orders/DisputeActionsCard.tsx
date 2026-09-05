import { CreditCard, ShieldAlert } from 'lucide-react';

type DisputeEligibility = {
  eligible: boolean;
  phase: 'delivery' | 'escrow' | 'post_delivery' | 'expired' | 'settled' | 'active';
  eligibleAt: string | null;
  windowEndsAt: string | null;
  reason: string;
};

type DisputeActionsCardProps = {
  submitting: 'release' | null;
  canConfirmDelivery?: boolean;
  orderDisputed?: boolean;
  disputeStatus?: string | null;
  escrowReleased: boolean;
  escrowUnavailable: boolean;
  deliveryPeriodDays?: number | null;
  eligibility: DisputeEligibility;
  onConfirmDelivery: () => void;
  onOpenDispute: () => void;
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

function disputeStatusLabel(status: string | null | undefined): string {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'under_review') return 'Under Review';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'resolved') return 'Resolved';
  if (normalized === 'open') return 'Submitted';
  return 'Submitted';
}

export default function DisputeActionsCard({
  submitting,
  canConfirmDelivery = false,
  orderDisputed = false,
  disputeStatus = null,
  escrowReleased,
  escrowUnavailable,
  deliveryPeriodDays = null,
  eligibility,
  onConfirmDelivery,
  onOpenDispute,
}: DisputeActionsCardProps) {
  const releaseInProgress = submitting === 'release';
  const releaseCompleted = escrowReleased && !releaseInProgress;
  const releaseDisabled = releaseCompleted || !canConfirmDelivery || escrowUnavailable || orderDisputed || submitting !== null;

  if (orderDisputed || eligibility.phase === 'active') {
    const statusLabel = disputeStatusLabel(disputeStatus);
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-black text-amber-950">This order is under dispute review.</p>
              <p className="mt-1 text-sm leading-6 text-amber-900/80">Your dispute has been submitted and is currently {statusLabel.toLowerCase()}. You cannot submit another dispute for this order while this case remains active.</p>
            </div>
          </div>
        </div>
        <button type="button" disabled aria-disabled="true" className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm font-bold text-zinc-500">
          <ShieldAlert className="h-4 w-4" />
          Dispute {statusLabel}
        </button>
      </div>
    );
  }

  const deliveryDaysLabel = deliveryPeriodDays && deliveryPeriodDays > 0 ? `${deliveryPeriodDays} day${deliveryPeriodDays === 1 ? '' : 's'}` : 'the stated delivery period';
  const deliveryDeadline = formatDate(eligibility.eligibleAt);
  const disputeStart = formatDate(eligibility.eligibleAt);
  const disputeEnd = formatDate(eligibility.windowEndsAt);

  return (
    <div className="space-y-4">
      <button type="button" onClick={onConfirmDelivery} disabled={releaseDisabled} aria-disabled={releaseDisabled} className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${releaseCompleted || escrowUnavailable || !canConfirmDelivery ? 'border border-zinc-200 bg-zinc-100 text-zinc-500' : 'bg-[#7F1D1D] text-white hover:bg-[#991B1B]'}`}>
        <CreditCard className="h-4 w-4" />
        {releaseInProgress ? 'Submitting escrow…' : releaseCompleted ? 'Escrow released' : escrowUnavailable ? 'Escrow not available' : !canConfirmDelivery ? 'Delivery confirmation unavailable' : 'Confirm delivery (release escrow)'}
      </button>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">Dispute availability</p>

        {eligibility.phase === 'delivery' ? (
          <>
            <p className="mt-2 text-sm font-bold text-zinc-900">Delivery in progress</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">Delivery window: {deliveryDaysLabel}{deliveryDeadline ? ` · ends ${deliveryDeadline}` : ''}.</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">Escrow dispute: Available after the delivery period ends if delivery has not been confirmed.</p>
          </>
        ) : eligibility.phase === 'escrow' ? (
          <>
            <p className="mt-2 text-sm font-bold text-zinc-900">Delivery period has ended</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">Delivery has not been confirmed and escrow is still held. You may request a refund through BuyMesho's dispute process.</p>
          </>
        ) : eligibility.phase === 'post_delivery' ? (
          <>
            <p className="mt-2 text-sm font-bold text-zinc-900">Order delivered</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">Dispute period: {disputeStart ?? 'confirmed delivery'}{disputeEnd ? ` – ${disputeEnd}` : ''}.</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">You can report an issue during the 30-day post-delivery dispute period.</p>
          </>
        ) : eligibility.phase === 'expired' ? (
          <>
            <p className="mt-2 text-sm font-bold text-zinc-900">Dispute period has ended</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">This order can no longer be disputed because the 30-day post-delivery dispute period has expired.</p>
          </>
        ) : eligibility.phase === 'settled' ? (
          <>
            <p className="mt-2 text-sm font-bold text-zinc-900">This order has a settled dispute</p>
            <p className="mt-1 text-sm leading-6 text-zinc-600">A second dispute cannot be opened for this order.</p>
          </>
        ) : null}

        {eligibility.eligible ? (
          <button type="button" onClick={onOpenDispute} disabled={submitting !== null} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-900 bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60">
            <ShieldAlert className="h-4 w-4" />
            Open Dispute
          </button>
        ) : null}
      </div>
    </div>
  );
}
