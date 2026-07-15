import { ArrowLeft, ChevronRight } from "lucide-react";

import { CartCheckoutBar } from "./cart/CartCheckoutBar";
import { CartItemCard } from "./cart/CartItemCard";
import { CartSummarySidebar } from "./cart/CartSummarySidebar";
import { useCartPageState } from "./cart/useCartPageState";
import {
  navigateBackOrPath,
  navigateToListingDetails,
  navigateToPath,
  EXPLORE_PATH,
} from "./lib/appNavigation";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import { formatMoney } from "./shared/utils/formatMoney";

export default function CartPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;

  return <CartPageContent />;
}

function CartPageContent() {
  const {
    items,
    itemCount,
    selectedQuantities,
    selectedCount,
    selectedUnits,
    selectedSubtotal,
    latestPendingCheckoutUrl,
    checkoutError,
    checkoutLoading,
    selectAllRef,
    allSelected,
    setAllSelected,
    setSelectedQuantity,
    toggleItemSelection,
    handleRemoveItem,
    handleCheckoutSelected,
  } = useCartPageState();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to market
          </button>

          <div className="text-sm font-semibold text-zinc-500">
            {itemCount} item{itemCount === 1 ? "" : "s"} in cart
          </div>
        </div>

        <section className="mt-6 w-full">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-400">Cart</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Review your items
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Tap any item to open its listing details again. Remove anything you do not want before buying.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              Continue browsing
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {items.length ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
              <label className="inline-flex items-center gap-3 text-sm font-bold text-zinc-800">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setAllSelected(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
                />
                Select all
              </label>

              <div className="text-sm font-semibold text-zinc-500">
                {selectedCount} selected • {selectedUnits} units • {formatMoney(selectedSubtotal)}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="w-full">
              {items.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => {
                    const listingId = String(item.listingId);
                    const maxSelectable = Math.max(
                      0,
                      Number(item.availableQuantity ?? item.quantity) || 0,
                    );
                    const selectedQuantity = Math.max(
                      0,
                      Math.min(maxSelectable, selectedQuantities[listingId] ?? 0),
                    );
                    const isSelected = selectedQuantity > 0;

                    return (
                      <CartItemCard
                        key={`${item.listingId}-${item.addedAt}`}
                        item={item}
                        isSelected={isSelected}
                        selectedQuantity={selectedQuantity}
                        maxSelectable={maxSelectable}
                        onOpen={() => navigateToListingDetails(String(item.listingId))}
                        onToggleSelection={() => toggleItemSelection(listingId, maxSelectable)}
                        onDecrease={() =>
                          setSelectedQuantity(listingId, selectedQuantity - 1, maxSelectable)
                        }
                        onIncrease={() =>
                          setSelectedQuantity(listingId, selectedQuantity + 1, maxSelectable)
                        }
                        onRemove={() => void handleRemoveItem(listingId)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="border-y border-zinc-200 bg-white/70 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <span className="text-xl">🛒</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-zinc-950">Cart is empty</h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Add items from a listing page or from the market, then come back here to review them.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateToPath(EXPLORE_PATH)}
                    className="mt-6 inline-flex items-center justify-center rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800"
                  >
                    Go to market
                  </button>
                </div>
              )}
            </div>

            <CartSummarySidebar
              itemsCount={items.length}
              selectedCount={selectedCount}
              selectedUnits={selectedUnits}
              selectedSubtotal={selectedSubtotal}
              latestPendingCheckoutUrl={latestPendingCheckoutUrl}
              checkoutError={checkoutError}
            />
          </div>
        </section>
      </div>

      <CartCheckoutBar
        selectedCount={selectedCount}
        selectedSubtotal={selectedSubtotal}
        checkoutLoading={checkoutLoading}
        onCheckoutSelected={handleCheckoutSelected}
      />
    </div>
  );
}
