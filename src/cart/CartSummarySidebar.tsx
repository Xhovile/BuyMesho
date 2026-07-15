import { formatMoney } from "../shared/utils/formatMoney";

type CartSummarySidebarProps = {
  itemsCount: number;
  selectedCount: number;
  selectedUnits: number;
  selectedSubtotal: number;
  latestPendingCheckoutUrl: string | null;
  checkoutError: string | null;
};

export function CartSummarySidebar({
  itemsCount,
  selectedCount,
  selectedUnits,
  selectedSubtotal,
  latestPendingCheckoutUrl,
  checkoutError,
}: CartSummarySidebarProps) {
  return (
    <aside className="w-full">
      <div className="sticky top-4 space-y-4">
        <div className="border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-black text-zinc-950">Selection summary</h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Cart items</span>
              <span className="font-bold text-zinc-950">{itemsCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Selected items</span>
              <span className="font-bold text-zinc-950">{selectedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Selected units</span>
              <span className="font-bold text-zinc-950">{selectedUnits}</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
              <span className="text-zinc-500">Selected total</span>
              <span className="text-lg font-black text-zinc-950">{formatMoney(selectedSubtotal)}</span>
            </div>
          </div>
        </div>

        {checkoutError ? (
          <div className="border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
            {checkoutError}
          </div>
        ) : null}

        <div className="border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-black text-zinc-950">Payment status</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            {latestPendingCheckoutUrl
              ? "A previous checkout attempt is still pending. Buying again starts a fresh secure checkout; your cart is only cleared after verified payment."
              : "Buying starts a secure checkout. If you leave the gateway before paying, these cart items stay here."}
          </p>
        </div>
      </div>
    </aside>
  );
}
