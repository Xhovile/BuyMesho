import { ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  getEscrowDescription,
  getEscrowHeadline,
  getSellerPayoutLabel,
  type EscrowMessageState,
} from '../../lib/escrowMessaging';

type EscrowProtectionCardProps = {
  state: EscrowMessageState;
  paidAt?: string | null;
  escrowUpdatedAt?: string | null;
  viewer?: 'buyer' | 'seller';
};

function formatDate(value?: string | null): string {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function EscrowProtectionCard({
  state,
  paidAt,
  escrowUpdatedAt,
  viewer = 'buyer',
}: EscrowProtectionCardProps) {
  const disputed = state.escrowState === 'disputed';
  const isSellerView = viewer === 'seller';

  const headline = isSellerView
    ? state.escrowState === 'released'
      ? 'Escrow released to payout queue'
      : state.escrowState === 'refunded'
        ? 'Escrow refunded — seller payout cancelled'
        : state.escrowState === 'disputed'
          ? 'Escrow under dispute review'
          : state.orderStatus === 'in_escrow' || state.escrowState === 'funded' || state.escrowState === 'held'
            ? 'Escrow holding funds before seller payout'
            : state.paymentStatus === 'pending'
              ? 'Payment verification pending'
              : 'Order payout status in progress'
    : getEscrowHeadline(state);
  const description = isSellerView
    ? state.escrowState === 'released'
      ? 'Funds are released from escrow and automatically enter the payout queue for admin review and provider processing.'
      : state.escrowState === 'refunded'
        ? 'This order was refunded, so no seller payout will be sent for this payment.'
        : state.escrowState === 'disputed'
          ? 'Payout stays paused while BuyMesho resolves the dispute outcome.'
          : state.orderStatus === 'in_escrow' || state.escrowState === 'funded' || state.escrowState === 'held'
            ? 'Funds remain protected in escrow and will move to payout only after release conditions are met.'
            : state.paymentStatus === 'pending'
              ? 'Provider confirmation has not completed, so escrow and payout cannot move forward yet.'
              : 'The payout lifecycle is still being updated for this order.'
    : getEscrowDescription(state);

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
          {disputed ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            {isSellerView ? 'BuyMesho payout release state' : 'BuyMesho escrow protection'}
          </p>

          <h3 className="mt-1 text-lg font-black text-zinc-950">
            {headline}
          </h3>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-600">
        {description}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Seller payout
          </span>

          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {getSellerPayoutLabel(state)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            LAST ESCROW UPDATE
          </span>

          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {formatDate(escrowUpdatedAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            PAYMENT VERIFIED TIME
          </span>

          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {formatDate(paidAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
