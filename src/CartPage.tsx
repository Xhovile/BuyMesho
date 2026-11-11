import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { CartCheckoutBar } from "./cart/CartCheckoutBar";
import { CartItemCard } from "./cart/CartItemCard";
import { CartSummarySidebar } from "./cart/CartSummarySidebar";
import { useCartPageState } from "./cart/useCartPageState";
import {
  EVENTS_PATH,
  navigateBackOrPath,
  navigateToListingDetails,
  navigateToPath,
  EXPLORE_PATH,
} from "./lib/appNavigation";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import { useAuthUser } from "./hooks/useAuthUser";
import { formatMoney } from "./shared/utils/formatMoney";
import { CartCheckoutModal } from "./components/checkout/CartCheckoutModal";

export default function CartPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <CartPageContent />;
}

function CartPageContent() {
  const { user: firebaseUser } = useAuthUser();
  const [cartCheckoutOpen, setCartCheckoutOpen] = useState(false);

  const {
    items,
    itemCount,
    selectedItems,
    selectedQuantities,
    selectedCount,
    selectedUnits,
    selectedSubtotal,
    latestPendingCheckoutUrl,
    checkoutError,
    checkoutLoading,
    checkoutSelectionError,
    selectAllRef,
    allSelected,
    setAllSelected,
    setSelectedQuantity,
    toggleItemSelection,
    handleRemoveItem,
    handleCheckoutSelected,
  } = useCartPageState();

  const handleCheckout = () => {
    if (!selectedCount || checkoutSelectionError) return;
    setCartCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3 text-sm font-bold text-bm-text dark:text-bm-text-muted shadow-sm hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to market
          </button>
          <div className="text-sm font-semibold text-bm-text-subtle dark:text-bm-text-subtle">
            {itemCount} item{itemCount === 1 ? "" : "s"} in cart
          </div>
        </div>

        <section className="mt-6 w-full">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-bm-border dark:border-bm-border pb-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-bm-text-subtle">Cart</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text sm:text-4xl">
                Review your items
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-bm-text-subtle dark:text-bm-text-subtle sm:text-base">
                Tap any item to open it again. Remove anything you do not want before buying.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-full border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2 text-sm font-bold text-bm-text dark:text-bm-text-muted shadow-sm hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
            >
              Continue browsing
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {items.length ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-3">
              <label className="inline-flex items-center gap-3 text-sm font-bold text-bm-text dark:text-bm-text-muted">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setAllSelected(event.target.checked)}
                  className="h-4 w-4 rounded border-bm-border dark:border-bm-border text-bm-text focus:ring-bm-focus"
                />
                Select all
              </label>

              <div className="text-sm font-semibold text-bm-text-subtle dark:text-bm-text-subtle">
                {selectedCount} selected • {selectedUnits} units • {formatMoney(selectedSubtotal)}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="w-full">
              {items.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => {
                    const maxSelectable = Math.max(
                      0,
                      Number(item.availableQuantity ?? item.quantity) || 0,
                    );
                    const selectedQuantity = Math.max(
                      0,
                      Math.min(maxSelectable, selectedQuantities[item.cartKey] ?? 0),
                    );
                    const isSelected = selectedQuantity > 0;

                    return (
                      <CartItemCard
                        key={item.cartKey}
                        item={item}
                        isSelected={isSelected}
                        selectedQuantity={selectedQuantity}
                        maxSelectable={maxSelectable}
                        onOpen={() => {
                          if (item.kind === "listing") {
                            navigateToListingDetails(item.itemId);
                            return;
                          }
                          navigateToPath(`${EVENTS_PATH}?event=${encodeURIComponent(item.itemId)}`);
                        }}
                        onToggleSelection={() => toggleItemSelection(item.cartKey, maxSelectable)}
                        onDecrease={() =>
                          setSelectedQuantity(item.cartKey, selectedQuantity - 1, maxSelectable)
                        }
                        onIncrease={() =>
                          setSelectedQuantity(item.cartKey, selectedQuantity + 1, maxSelectable)
                        }
                        onRemove={() => void handleRemoveItem(item.cartKey)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="border-y border-bm-border dark:border-bm-border bg-bm-surface/70 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text-subtle">
                    <span className="text-xl">🛒</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-bm-text">Cart is empty</h2>
                  <p className="mt-2 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                    Add items from a listing page or from the events page, then come back here to review them.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigateToPath(EXPLORE_PATH)}
                    className="mt-6 inline-flex items-center justify-center rounded-2xl bg-bm-brand px-5 py-3 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
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
        checkoutDisabledReason={checkoutSelectionError}
        onCheckoutSelected={handleCheckout}
      />

      <CartCheckoutModal
        open={cartCheckoutOpen}
        entries={selectedItems}
        subtotal={selectedSubtotal}
        buyerName={firebaseUser?.displayName ?? null}
        buyerEmail={firebaseUser?.email ?? null}
        buyerPhone={firebaseUser?.phoneNumber ?? null}
        checkoutLoading={checkoutLoading}
        checkoutError={checkoutError}
        onClose={() => setCartCheckoutOpen(false)}
        onSubmit={handleCheckoutSelected}
      />
    </div>
  );
}
