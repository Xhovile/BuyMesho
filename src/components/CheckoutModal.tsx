import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, ShoppingBag, X } from "lucide-react";
import type { Listing } from "../types";
import { apiFetch } from "../lib/api";

type CheckoutStep = "form" | "loading" | "success" | "error";

interface CheckoutResult {
  orderId: string;
  paymentId: string;
  reference: string;
  checkoutUrl: string | null;
}

interface CheckoutModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  buyerName?: string | null;
  buyerEmail?: string | null;
}

function formatPrice(amount: number): string {
  return `MK ${Number(amount).toLocaleString()}`;
}

export default function CheckoutModal({
  listing,
  isOpen,
  onClose,
  buyerName,
  buyerEmail,
}: CheckoutModalProps) {
  const [step, setStep] = useState<CheckoutStep>("form");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>("");

  const maxQty = Math.max(
    1,
    Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0),
  );
  const unitPrice = Number(listing.price);
  const total = unitPrice * quantity;

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setQuantity(1);
      setError(null);
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setStep("loading");
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/payment/return`;
      const cancelUrl = `${window.location.origin}/payment/return?cancelled=1`;

      const result = (await apiFetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          listingId: listing.id,
          quantity,
          method: "mobile_money",
          returnUrl,
          cancelUrl,
          buyerName: buyerName || buyerEmail || undefined,
        }),
      })) as CheckoutResult;

      setStep("success");

      if (result.checkoutUrl) {
        setTimeout(() => {
          window.location.href = result.checkoutUrl!;
        }, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setStep("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[97] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === "loading" ? undefined : onClose}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    Checkout
                  </p>
                  <h2 className="text-base font-extrabold text-zinc-900">
                    Complete your purchase
                  </h2>
                </div>
              </div>

              {step !== "loading" && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-zinc-100 transition-colors"
                  aria-label="Close checkout"
                >
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {step === "loading" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
                  <p className="text-sm font-semibold text-zinc-600">
                    Initialising secure checkout…
                  </p>
                </div>
              )}

              {step === "success" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="text-sm font-bold text-zinc-800">
                    Redirecting you to the payment page…
                  </p>
                </div>
              )}

              {(step === "form" || step === "error") && (
                <>
                  {/* Listing preview */}
                  <div className="flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    {listing.photos?.[0] && (
                      <img
                        src={listing.photos[0]}
                        alt={listing.name}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-zinc-900">
                        {listing.name}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">{listing.university}</p>
                      <p className="mt-1 text-base font-black text-zinc-900">
                        {formatPrice(unitPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Quantity */}
                  {maxQty > 1 && (
                    <div>
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                        Quantity
                      </label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-lg font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-extrabold text-zinc-900">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                          disabled={quantity >= maxQty}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-lg font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                        >
                          +
                        </button>
                        <span className="text-xs text-zinc-400">{maxQty} available</span>
                      </div>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                    <span className="text-sm font-bold text-zinc-600">Total</span>
                    <span className="text-lg font-black text-zinc-900">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* Payment info */}
                  <p className="text-xs text-zinc-400 leading-5">
                    You will be redirected to PayChangu's secure payment page to complete
                    your purchase. Your funds are held in escrow until delivery is confirmed.
                  </p>

                  {step === "error" && error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {(step === "form" || step === "error") && (
              <div className="flex gap-3 border-t border-zinc-100 px-6 pb-6 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-zinc-200 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  className="flex-1 rounded-2xl bg-zinc-900 py-3 text-sm font-extrabold text-white hover:bg-zinc-800 transition-colors"
                >
                  {step === "error" ? "Retry" : "Confirm & Pay"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
