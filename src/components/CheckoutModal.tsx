import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, ShoppingBag, X } from "lucide-react";
import type { Listing } from "../types";
import { apiFetch } from "../lib/api";
import { ENDPOINTS } from "../shared/api/endpoints";
import { touchBuyerPaymentFromCheckout } from "../lib/buyerState";
import { calculateCustomerCheckoutFees } from "../../server/modules/payouts/payout.policy";
import BuyerDetailsForm, { type BuyerDeliveryDetails } from "./checkout/BuyerDetailsForm";

type CheckoutStep = "form" | "loading" | "success" | "error";
type SettlementRoute = "escrow" | "connect";

interface CheckoutResult {
  orderId: string;
  paymentId?: string;
  reference?: string;
  checkoutUrl?: string | null;
  payment?: {
    id?: string;
    reference?: string;
    checkoutUrl?: string | null;
  };
}

interface CheckoutModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  buyerName?: string | null;
  buyerEmail?: string | null;
}

const EMPTY_BUYER_DETAILS: BuyerDeliveryDetails = {
  fullName: "",
  phone: "",
  addressLine: "",
  area: "",
  townOrDistrict: "",
  landmark: "",
};

function formatPrice(amount: number): string {
  return `MK ${Number(amount).toLocaleString()}`;
}

function isBuyerDetailsComplete(details: BuyerDeliveryDetails): boolean {
  return Boolean(
    details.fullName.trim() &&
      details.phone.trim() &&
      details.addressLine.trim() &&
      details.area.trim() &&
      details.townOrDistrict.trim(),
  );
}

const settlementOptions: Array<{
  route: SettlementRoute;
  label: string;
  description: string;
  buttonClassName: string;
}> = [
  {
    route: "escrow",
    label: "Pay and confirm later",
    description: "Funds are held until delivery is confirmed.",
    buttonClassName: "border-orange-800 bg-orange-700 text-white shadow-[0_18px_34px_-18px_rgba(154,52,18,0.75)] ring-1 ring-orange-950/10 hover:-translate-y-0.5 hover:bg-orange-800 hover:shadow-[0_22px_42px_-18px_rgba(154,52,18,0.85)]",
  },
  // Direct seller payments are hidden until PayChangu Connect is ready to enable.
  // {
  //   route: "connect",
  //   label: "Pay directly to seller",
  //   description: "Money goes to the seller's connected account.",
  //   buttonClassName: "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800",
  // },
];

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
  const [buyerDetails, setBuyerDetails] = useState<BuyerDeliveryDetails>(EMPTY_BUYER_DETAILS);
  const [saveBuyerDetails, setSaveBuyerDetails] = useState(false);
  const [buyerDetailsLoading, setBuyerDetailsLoading] = useState(false);
  const idempotencyKeyRef = useRef<string>("");

  const maxQty = Math.max(
    1,
    Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0),
  );
  const unitPrice = Number(listing.price);
  const total = unitPrice * quantity;
  const feeBreakdown = calculateCustomerCheckoutFees({
    itemTotalAmount: total,
    currency: "MWK",
  });

  useEffect(() => {
    if (isOpen) {
      setStep("form");
      setQuantity(1);
      setError(null);
      setBuyerDetails({ ...EMPTY_BUYER_DETAILS, fullName: buyerName?.trim() ?? "" });
      setSaveBuyerDetails(false);
      setBuyerDetailsLoading(false);
      idempotencyKeyRef.current = crypto.randomUUID();
    }
  }, [isOpen, buyerName]);

  const handleBuyerDetailsChange = useCallback((next: BuyerDeliveryDetails) => {
    setBuyerDetails(next);
  }, []);

  const handleSaveBuyerDetailsChange = useCallback((next: boolean) => {
    setSaveBuyerDetails(next);
  }, []);

  const handleBuyerDetailsLoadingChange = useCallback((loading: boolean) => {
    setBuyerDetailsLoading(loading);
  }, []);

  const handleConfirm = async (settlementRoute: SettlementRoute) => {
    if (!isBuyerDetailsComplete(buyerDetails)) {
      setError("Complete your delivery details before continuing.");
      return;
    }

    setStep("loading");
    setError(null);

    try {
      if (saveBuyerDetails) {
        await apiFetch("/api/profile/buyer-details", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ buyerDetails }),
        });
      }

      const returnUrl = `${window.location.origin}/payment/return?listingId=${encodeURIComponent(String(listing.id))}`;
      const cancelUrl = `${window.location.origin}/payment/return?cancelled=1&listingId=${encodeURIComponent(String(listing.id))}`;

      const result = (await apiFetch(ENDPOINTS.payments.checkout, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKeyRef.current,
        },
        body: JSON.stringify({
          listingId: listing.id,
          quantity,
          method: "mobile_money",
          settlementRoute,
          returnUrl,
          cancelUrl,
          buyerName: buyerDetails.fullName || buyerName || buyerEmail || undefined,
          buyerPhone: buyerDetails.phone || undefined,
          buyerDetails,
        }),
      })) as CheckoutResult;

      const checkoutUrl = result.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
      const paymentId = result.paymentId ?? result.payment?.id ?? "";
      const reference = result.reference ?? result.payment?.reference ?? "";

      touchBuyerPaymentFromCheckout({
        reference,
        orderId: result.orderId,
        paymentId,
        listingId: String(listing.id),
        listingIds: [String(listing.id)],
        checkoutItems: [{ listingId: String(listing.id), quantity }],
        listingTitle: listing.name,
        quantity,
        totalPrice: feeBreakdown.itemTotalAmount,
        checkoutUrl,
        txRef: reference,
      });

      if (checkoutUrl) {
        setStep("success");
        window.location.href = checkoutUrl;
        return;
      }

      throw new Error("Payment gateway did not return a checkout URL.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
      setStep("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[97] flex items-center justify-center p-4"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
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
            className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Checkout"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Checkout</p>
                  <h2 className="text-base font-extrabold text-zinc-900">Complete your purchase</h2>
                </div>
              </div>

              {step !== "loading" && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 transition-colors hover:bg-zinc-100"
                  aria-label="Close checkout"
                >
                  <X className="h-5 w-5 text-zinc-500" />
                </button>
              )}
            </div>

            <div className="space-y-5 p-6">
              {step === "loading" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
                  <p className="text-sm font-semibold text-zinc-600">Initializing secure checkout…</p>
                </div>
              )}

              {step === "success" && (
                <div className="flex flex-col items-center gap-4 py-6">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <p className="text-sm font-bold text-zinc-800">Redirecting you to the payment page…</p>
                </div>
              )}

              {(step === "form" || step === "error") && (
                <>
                  <div className="flex gap-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                    {listing.photos?.[0] && (
                      <img
                        src={listing.photos[0]}
                        alt={listing.name}
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-zinc-900">{listing.name}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{listing.university}</p>
                      <p className="mt-1 text-base font-black text-zinc-900">{formatPrice(unitPrice)}</p>
                    </div>
                  </div>

                  <BuyerDetailsForm
                    value={buyerDetails}
                    onChange={handleBuyerDetailsChange}
                    saveForLater={saveBuyerDetails}
                    onSaveForLaterChange={handleSaveBuyerDetailsChange}
                    onLoadingChange={handleBuyerDetailsLoadingChange}
                  />

                  {maxQty > 1 && (
                    <div>
                      <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-lg font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-sm font-extrabold text-zinc-900">{quantity}</span>
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

                  <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4 text-zinc-600">
                        <span>Item total</span>
                        <span className="font-bold text-zinc-900">{formatPrice(feeBreakdown.itemTotalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-zinc-600">
                        <span>Fees</span>
                        <span className="font-bold text-zinc-900">{formatPrice(feeBreakdown.buyerFeeAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-zinc-200 pt-2 text-base font-black text-zinc-900">
                        <span>Total</span>
                        <span>{formatPrice(feeBreakdown.finalTotalAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
                  )}

                  <div className="sticky bottom-0 z-10 space-y-3">
                    {settlementOptions.map((option) => (
                      <button
                        key={option.route}
                        type="button"
                        disabled={buyerDetailsLoading}
                        onClick={() => void handleConfirm(option.route)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${option.buttonClassName}`}
                      >
                        <p className="text-sm font-extrabold">{option.label}</p>
                        <p className="mt-1 text-xs opacity-80">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
