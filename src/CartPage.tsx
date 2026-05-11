import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CreditCard, ShoppingCart, Trash2 } from "lucide-react";

import { navigateBackOrPath, navigateToPath, PAYMENTS_HUB_PATH, EXPLORE_PATH } from "./lib/appNavigation";
import {
  readBuyerCart,
  readBuyerPayments,
  removeBuyerCartItem,
  type BuyerCartItem,
  type BuyerPaymentRecord,
} from "./lib/buyerState";
import { formatMoney } from "./shared/utils/formatMoney";
import { useRequireVerifiedUser } from "./hooks/useRequireVerifiedUser";

export default function CartPage() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <CartPageContent />;
}

function CartPageContent() {
  const [items, setItems] = useState<BuyerCartItem[]>([]);
  const [payments, setPayments] = useState<BuyerPaymentRecord[]>([]);

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

  const latestPendingCheckoutUrl = useMemo(
    () => payments.find((record) => record.status === "pending" && record.checkoutUrl)?.checkoutUrl ?? null,
    [payments]
  );

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.totalPrice, 0), [items]);

  const handleRemoveItem = (listingId: string) => {
    removeBuyerCartItem(listingId);
    setItems((current) => current.filter((item) => String(item.listingId) !== String(listingId)));
  };

  const handlePay = () => {
    if (latestPendingCheckoutUrl) {
      window.location.href = latestPendingCheckoutUrl;
      return;
    }

    navigateToPath(PAYMENTS_HUB_PATH);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to market
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
            >
              <ShoppingCart className="h-4 w-4" />
              Add more items
            </button>

            <button
              type="button"
              onClick={handlePay}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800"
            >
              <CreditCard className="h-4 w-4" />
              Pay
            </button>
          </div>
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-zinc-600">Cart</p>

        <section className="mt-2 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-zinc-950">Your selected items</h1>
              <p className="mt-1 text-sm text-zinc-500">Review items, remove anything unnecessary, then continue to payment.</p>
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
                  onClick={handlePay}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
                >
                  Continue to payment
                </button>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
                <h2 className="text-lg font-black text-zinc-950">Payment status</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {latestPendingCheckoutUrl
                    ? "A pending checkout exists. Continue payment from here."
                    : "No pending checkout is available. You will be taken to the payments hub."}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
