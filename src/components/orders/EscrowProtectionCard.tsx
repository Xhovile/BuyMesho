import { ShieldCheck, ShieldAlert } from 'lucide-react';
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
}: EscrowProtectionCardProps) {
  const disputed = state.escrowState === 'disputed';

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white">
          {disputed ? (
            <ShieldAlert className="h-5 w-5" />
          ) : (
            <ShieldCheck className="h-5 w-5" />
          )}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
            BuyMesho escrow protection
          </p>

          <h3 className="mt-1 text-lg font-black text-zinc-950">
            {getEscrowHeadline(state)}
          </h3>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-zinc-600">
        {getEscrowDescription(state)}
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
            Escrow updated
          </span>

          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {formatDate(escrowUpdatedAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 sm:col-span-2">
          <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
            Payment verified
          </span>

          <p className="mt-1 text-sm font-semibold text-zinc-900">
            {formatDate(paidAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
