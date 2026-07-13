import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CreditCard,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  navigateBackOrPath,
  navigateToListingDetails,
  navigateToPath,
  EXPLORE_PATH,
} from "./lib/appNavigation";
import {
  readBuyerCart,
  readBuyerPayments,
  removeBuyerCartItem,
  touchBuyerPaymentFromCheckout,
  type BuyerCartItem,
  type BuyerPaymentRecord,
} from "./lib/buyerState";
import { formatMoney } from "./shared/utils/formatMoney";
import { apiFetch } from "./lib/api";
import { ENDPOINTS } from "./shared/api/endpoints";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

export default function CartPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;

  return <CartPageContent />;
}

function CartPageContent() {
  const [items, setItems] = useState<BuyerCartItem[]>([]);
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const previousCartIdsRef = useRef<string[]>([]);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const sync = () => {
      if (!mounted) return;
      setItems(readBuyerCart());
      setPayments(readBuyerPayments());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);

    return () => {
      mounted = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  useEffect(() => {
    const nextCartIds = items.map((item) => String(item.listingId));
    const previousCartIds = previousCartIdsRef.current;
    const previousCartIdSet = new Set(previousCartIds);

    setSelectedQuantities((current) => {
      const next: Record<string, number> = {};
      for (const item of items) {
        const listingId = String(item.listingId);
        const previousValue = current[listingId];
        const isExistingItem = previousCartIdSet.has(listingId);
        const fallbackQuantity = isExistingItem ? previousValue ?? 0 : 1;
        const safeQuantity = Math.max(
          0,
          Math.min(Number(item.quantity) || 0, Math.floor(Number(fallbackQuantity) || 0)),
        );
        next[listingId] = safeQuantity;
      }
      return next;
    });

    previousCartIdsRef.current = nextCartIds;
  }, [items]);

  const latestPendingCheckoutUrl = useMemo(
    () =>
      payments.find(
        (record) => record.status === "pending" && record.checkoutUrl,
      )?.checkoutUrl ?? null,
    [payments],
  );

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const selectedItems = useMemo(
    () =>
      items
        .map((item) => ({
          item,
          checkoutQuantity: Math.max(0, Math.min(item.quantity, selectedQuantities[String(item.listingId)] ?? 0)),
        }))
        .filter(({ checkoutQuantity }) => checkoutQuantity > 0),
    [items, selectedQuantities],
  );

  const selectedCount = selectedItems.length;
  const selectedUnits = selectedItems.reduce(
    (total, entry) => total + entry.checkoutQuantity,
    0,
  );
  const selectedSubtotal = selectedItems.reduce(
    (total, entry) => total + entry.checkoutQuantity * entry.item.unitPrice,
    0,
  );
  const allSelected = items.length > 0 && selectedCount === items.length;
  const someSelected = selectedCount > 0 && selectedCount < items.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleRemoveItem = (listingId: string) => {
    removeBuyerCartItem(listingId);
    setItems((current) =>
      current.filter((item) => String(item.listingId) !== String(listingId)),
    );
    setSelectedQuantities((current) => {
      const next = { ...current };
      delete next[listingId];
      return next;
    });
  };

  const setSelectedQuantity = (listingId: string, quantity: number, maxQuantity: number) => {
    setSelectedQuantities((current) => ({
      ...current,
      [listingId]: Math.max(0, Math.min(maxQuantity, Math.floor(quantity))),
    }));
  };

  const toggleItemSelection = (listingId: string, maxQuantity: number) => {
    setSelectedQuantities((current) => {
      const currentQuantity = current[listingId] ?? 0;
      const nextQuantity = currentQuantity > 0 ? 0 : Math.min(1, maxQuantity);
      return {
        ...current,
        [listingId]: nextQuantity,
      };
    });
  };

  const setAllSelected = (checked: boolean) => {
    setSelectedQuantities((current) => {
      const next = { ...current };
      for (const item of items) {
        next[String(item.listingId)] = checked ? item.quantity : 0;
      }
      return next;
    });
  };

  const handleCheckout = async (checkoutItems: Array<{ item: BuyerCartItem; checkoutQuantity: number }>) => {
    if (!checkoutItems.length || checkoutLoading) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const listingIds = checkoutItems.map(({ item }) => String(item.listingId));
      const listingIdQuery = encodeURIComponent(listingIds.join(","));
      const returnUrl = `${window.location.origin}/payment/return?listingIds=${listingIdQuery}`;
      const cancelUrl = `${window.location.origin}/payment/return?cancelled=1&listingIds=${listingIdQuery}`;
      const idempotencyKey = crypto.randomUUID();

      const result = (await apiFetch(ENDPOINTS.payments.checkout, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          items: checkoutItems.map(({ item, checkoutQuantity }) => ({
            listingId: item.listingId,
            quantity: checkoutQuantity,
          })),
          method: "mobile_money",
          returnUrl,
          cancelUrl,
        }),
      })) as {
        orderId: string;
        paymentId?: string;
        reference?: string;
        checkoutUrl?: string | null;
        payment?: {
          id?: string;
          reference?: string;
          checkoutUrl?: string | null;
        };
      };

      const checkoutUrl = result.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
      const paymentId = result.paymentId ?? result.payment?.id ?? "";
      const reference = result.reference ?? result.payment?.reference ?? "";

      touchBuyerPaymentFromCheckout({
        reference,
        orderId: result.orderId,
        paymentId,
        listingId: listingIds[0] ?? "",
        listingIds,
        checkoutItems: checkoutItems.map(({ item, checkoutQuantity }) => ({
          listingId: String(item.listingId),
          quantity: checkoutQuantity,
        })),
        listingTitle:
          checkoutItems.length === 1
            ? checkoutItems[0].item.listingTitle
            : `${checkoutItems[0].item.listingTitle} + ${checkoutItems.length - 1} more`,
        quantity: checkoutItems.reduce((total, entry) => total + entry.checkoutQuantity, 0),
        totalPrice: checkoutItems.reduce(
          (total, entry) => total + entry.checkoutQuantity * entry.item.unitPrice,
          0,
        ),
        checkoutUrl,
        txRef: reference,
      });

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      throw new Error("Payment gateway did not return a checkout URL.");
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckoutSelected = () => {
    void handleCheckout(selectedItems);
  };

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
              <p className="text-xs font-black uppercase tracking-[0.28em] text-zinc-400">
                Cart
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
                Review your items
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base">
                Tap any item to open its listing details again. Remove anything
                you do not want before buying.
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
                {selectedCount} selected • {formatMoney(selectedSubtotal)}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
            <div className="w-full">
              {items.length ? (
                <div className="divide-y divide-zinc-200 border-y border-zinc-200 bg-white/60">
                  {items.map((item) => {
                    const listingId = String(item.listingId);
                    const selectedQuantity = Math.max(0, Math.min(item.quantity, selectedQuantities[listingId] ?? 0));
                    const isSelected = selectedQuantity > 0;

                    return (
                      <div
                        key={`${item.listingId}-${item.addedAt}`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          navigateToListingDetails(String(item.listingId))
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            navigateToListingDetails(String(item.listingId));
                          }
                        }}
                        className={`flex cursor-pointer items-center gap-4 px-0 py-4 transition hover:bg-zinc-50/80 focus:outline-none focus-visible:bg-zinc-50 ${isSelected ? "bg-zinc-50/70 ring-1 ring-inset ring-zinc-200" : ""}`}
                      >
                        <div className="flex shrink-0 items-start pt-2 pl-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={() => toggleItemSelection(listingId, item.quantity)}
                            className="h-5 w-5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
                            aria-label={`Select ${item.listingTitle}`}
                          />
                        </div>

                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-zinc-200 sm:h-24 sm:w-24">
                          {item.listingImage ? (
                            <img
                              src={item.listingImage}
                              alt={item.listingTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-zinc-500">
                              <ShoppingCart className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 pr-3">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-base font-bold text-zinc-950 sm:text-lg">
                                {item.listingTitle}
                              </p>
                              <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-zinc-500">
                                {item.listingDescription?.trim()
                                  ? item.listingDescription
                                  : "Open this item to review the full listing details."}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-500">
                                {formatMoney(item.unitPrice)} each
                              </span>
                              <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-500">
                                Available {item.quantity}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedQuantity(listingId, selectedQuantity - 1, item.quantity);
                                }}
                                disabled={!isSelected}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg font-black text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Decrease checkout quantity for ${item.listingTitle}`}
                              >
                                −
                              </button>
                              <span className="min-w-10 text-center text-sm font-black text-zinc-900">
                                {selectedQuantity || 0}
                              </span>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedQuantity(listingId, selectedQuantity + 1, item.quantity);
                                }}
                                disabled={!isSelected && item.quantity <= 0}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg font-black text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={`Increase checkout quantity for ${item.listingTitle}`}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveItem(listingId);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                              <ChevronRight className="h-5 w-5 text-zinc-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-y border-zinc-200 bg-white/70 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-zinc-950">
                    Cart is empty
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Add items from a listing page or from the market, then
                    come back here to review them.
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

            <aside className="w-full">
              <div className="sticky top-4 space-y-4">
                <div className="border border-zinc-200 bg-white p-5">
                  <h2 className="text-lg font-black text-zinc-950">
                    Selection summary
                  </h2>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Cart items</span>
                      <span className="font-bold text-zinc-950">
                        {items.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Selected items</span>
                      <span className="font-bold text-zinc-950">
                        {selectedCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Selected units</span>
                      <span className="font-bold text-zinc-950">
                        {selectedUnits}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                      <span className="text-zinc-500">Selected total</span>
                      <span className="text-lg font-black text-zinc-950">
                        {formatMoney(selectedSubtotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {checkoutError ? (
                  <div className="border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                    {checkoutError}
                  </div>
                ) : null}

                <div className="border border-zinc-200 bg-white p-5">
                  <h2 className="text-lg font-black text-zinc-950">
                    Payment status
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {latestPendingCheckoutUrl
                      ? "A previous checkout attempt is still pending. Buying again starts a fresh secure checkout; your cart is only cleared after verified payment."
                      : "Buying starts a secure checkout. If you leave the gateway before paying, these cart items stay here."}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={handleCheckoutSelected}
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
            <span className="text-base font-black">
              {formatMoney(selectedSubtotal)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
