import { CreditCard } from "lucide-react";

import { formatMoney } from "../shared/utils/formatMoney";

type CartCheckoutBarProps = {
  selectedCount: number;
  selectedSubtotal: number;
  checkoutLoading: boolean;
  onCheckoutSelected: () => void;
};

export function CartCheckoutBar({
  selectedCount,
  selectedSubtotal,
  checkoutLoading,
  onCheckoutSelected,
}: CartCheckoutBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onCheckoutSelected}
          disabled={!selectedCount || checkoutLoading}
          className="inline-flex w-full items-center justify-between rounded-2xl bg-zinc-950 px-5 py-4 text-white shadow-lg shadow-zinc-950/10 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em]">
            <CreditCard className="h-4 w-4" />
            {checkoutLoading
              ? "Starting checkout…"
              : selectedCount > 0
                ? `Checkout Selected (${selectedCount})`
                : "Select items to checkout"}
          </span>
          <span className="text-base font-black">{formatMoney(selectedSubtotal)}</span>
        </button>
      </div>
    </div>
  );
}
