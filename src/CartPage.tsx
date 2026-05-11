import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, ShoppingCart, Trash2 } from "lucide-react";

import { navigateBackOrPath, EXPLORE_PATH } from "./lib/appNavigation";
import {
  readBuyerCart,
  removeBuyerCartItem,
  touchBuyerPaymentFromCheckout,
  type BuyerCartItem,
} from "./lib/buyerState";
import { formatMoney } from "./shared/utils/formatMoney";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";
import { apiFetch } from "./lib/api";
import { ENDPOINTS } from "./shared/api/endpoints";

export default function CartPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <CartPageContent />;
}

function CartPageContent() {
  const [items, setItems] = useState<BuyerCartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const sync = () => {
      if (!mounted) return;
      setItems(readBuyerCart());
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

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.totalPrice, 0), [items]);

  const handleRemoveItem = (listingId: string) => {
    removeBuyerCartItem(listingId);
    setItems((current) => current.filter((item) => String(item.listingId) !== String(listingId)));
  };

  const handleBuy = async () => {
    if (!items.length || checkingOut) return;

    setCheckingOut(true);
    setCheckoutError(null);

    try {
      const firstListingId = String(items[0].listingId);
      const returnUrl = `${window.location.origin}/payment/return?listingId=${encodeURIComponent(firstListingId)}`;
      const cancelUrl = `${window.location.origin}/payment/return?cancelled=1&listingId=${encodeURIComponent(firstListingId)}`;

      const result = (await apiFetch(ENDPOINTS.payments.checkout, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            listingId: item.listingId,
            quantity: item.quantity,
          })),
          method: "mobile_money",
          returnUrl,
          cancelUrl,
        }),
      })) as {
        orderId: string;
        paymentId: string;
        reference: string;
        checkoutUrl: string | null;
      };

      touchBuyerPaymentFromCheckout({
        reference: result.reference,
        orderId: result.orderId,
        paymentId: result.paymentId,
        listingId: firstListingId,
        listingIds: items.map((item) => String(item.listingId)),
        listingTitle: items.length === 1 ? items[0].listingTitle : `Cart checkout (${items.length} items)`,
        quantity: itemCount,
        totalPrice: subtotal,
        checkoutUrl: result.checkoutUrl,
        txRef: result.reference,
      });

      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }

      setCheckoutError("Checkout was created, but no payment link was returned. Please try again from your payments page.");
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Cart checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <p className="mt-6 text-xl font-black uppercase tracking-[0.2em] text-zinc-600">CART</p>

        <section className="mt-2 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">

            <div>
              <h1 className="text-lg font-black tracking-tight text-zinc-950">Your selected items</h1>
              <p className="mt-1 text-sm text-zinc-500">Review items, remove anything unnecessary, then buy everything in one checkout.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-zinc-950">Added items</h2>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-zinc-500">
                  {items.length} saved
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {items.length ? (
                  items.map((item) => (
                    <div key={`${item.listingId}-${item.addedAt}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{item.listingTitle}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            Quantity: {item.quantity} · {formatMoney(item.totalPrice)}
                          </p>
                          {item.university ? (
                            <p className="mt-1 text-sm text-zinc-500">Campus: {item.university}</p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(String(item.listingId))}
                          className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
                          aria-label={`Remove ${item.listingTitle}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm leading-6 text-zinc-600">
                    No items have been added yet. Go to Market, add items to the cart, then return here to check out.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <h2 className="text-lg font-black text-zinc-950">Order summary</h2>

                <div className="mt-4 space-y-3 text-sm text-zinc-600">
                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span>Lines</span>
                    <span className="font-bold text-zinc-900">{items.length}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span>Total units</span>
                    <span className="font-bold text-zinc-900">{itemCount}</span>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-900">{formatMoney(subtotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={!items.length || checkingOut}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Buy Now
                </button>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <h2 className="text-lg font-black text-zinc-950">Payment status</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {checkoutError
                    ? checkoutError
                    : "Tap Buy to create one secure payment for every item currently in your cart."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
