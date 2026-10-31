import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, ShoppingBag, X } from "lucide-react";

import type { CartCheckoutEntry, CartCheckoutFormDetails } from "../../cart/useCartPageState";
import { formatMoney } from "../../shared/utils/formatMoney";
import TicketHolderForm from "../tickets/TicketHolderForm";
import BuyerDetailsForm, { type BuyerDeliveryDetails } from "./BuyerDetailsForm";

type CartCheckoutModalProps = {
  open: boolean;
  entries: CartCheckoutEntry[];
  subtotal: number;
  buyerName?: string | null;
  buyerEmail?: string | null;
  buyerPhone?: string | null;
  checkoutLoading: boolean;
  checkoutError: string | null;
  onClose: () => void;
  onSubmit: (details: CartCheckoutFormDetails) => void;
};

const EMPTY_BUYER_DETAILS: BuyerDeliveryDetails = {
  fullName: "",
  phone: "",
  addressLine: "",
  area: "",
  townOrDistrict: "",
  landmark: "",
};

export function CartCheckoutModal({
  open,
  entries,
  subtotal,
  buyerName,
  buyerEmail,
  buyerPhone,
  checkoutLoading,
  checkoutError,
  onClose,
  onSubmit,
}: CartCheckoutModalProps) {
  const hasListingItems = entries.some(({ item }) => item.kind === "listing");
  const hasEventTickets = entries.some(({ item }) => item.kind === "event_ticket");
  const isEventCheckout = hasEventTickets && !hasListingItems;

  const [buyerDetails, setBuyerDetails] = useState<BuyerDeliveryDetails>({
    ...EMPTY_BUYER_DETAILS,
    fullName: buyerName?.trim() ?? "",
    phone: buyerPhone?.trim() ?? "",
  });
  const [saveBuyerDetails, setSaveBuyerDetails] = useState(false);
  const [buyerDetailsLoading, setBuyerDetailsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBuyerDetails({
      ...EMPTY_BUYER_DETAILS,
      fullName: buyerName?.trim() ?? "",
      phone: buyerPhone?.trim() ?? "",
    });
    setSaveBuyerDetails(false);
    setFormError(null);
  }, [open, buyerName, buyerPhone]);

  const handleBuyerDetailsChange = useCallback((next: BuyerDeliveryDetails) => {
    setBuyerDetails(next);
    setFormError(null);
  }, []);

  const handleSaveBuyerDetailsChange = useCallback((next: boolean) => {
    setSaveBuyerDetails(next);
  }, []);

  const handleBuyerDetailsLoadingChange = useCallback((loading: boolean) => {
    setBuyerDetailsLoading(loading);
  }, []);

  const handleListingCheckout = () => {
    const details = {
      fullName: buyerDetails.fullName.trim(),
      phone: buyerDetails.phone.trim(),
      addressLine: buyerDetails.addressLine.trim(),
      area: buyerDetails.area.trim(),
      townOrDistrict: buyerDetails.townOrDistrict.trim(),
      landmark: buyerDetails.landmark.trim(),
    };

    if (details.fullName.length < 2) {
      setFormError("Enter your full name to continue.");
      return;
    }
    if (details.phone.length < 7) {
      setFormError("Enter a valid phone number to continue.");
      return;
    }
    if (details.addressLine.length < 3) {
      setFormError("Enter your delivery address to continue.");
      return;
    }
    if (details.area.length < 2) {
      setFormError("Enter your area or location to continue.");
      return;
    }
    if (details.townOrDistrict.length < 2) {
      setFormError("Enter your town or district to continue.");
      return;
    }

    setFormError(null);
    onSubmit({ buyerDetails: details, saveBuyerDetails });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[98] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        aria-label="Close cart checkout"
        onClick={onClose}
        disabled={checkoutLoading}
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm disabled:cursor-not-allowed"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-checkout-title"
        className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-zinc-50 shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Cart checkout</p>
              <h2 id="cart-checkout-title" className="text-lg font-black text-zinc-950">Complete your order</h2>
              <p className="mt-0.5 text-xs text-zinc-500">Review your selection and confirm the details before payment.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={checkoutLoading}
            aria-label="Close"
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-zinc-900">Items for checkout</h3>
              <span className="text-xs font-semibold text-zinc-500">{entries.length} selected</span>
            </div>
            <div className="divide-y divide-zinc-100">
              {entries.map(({ item, checkoutQuantity }) => (
                <div key={item.cartKey} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  {item.image ? (
                    <img src={item.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-400">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {item.kind === "event_ticket" ? "Event ticket" : "Marketplace item"} · Qty {checkoutQuantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-extrabold text-zinc-900">
                    {formatMoney(item.unitPrice * checkoutQuantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4">
              <span className="text-sm font-bold text-zinc-600">Selected total</span>
              <span className="text-lg font-black text-zinc-950">{formatMoney(subtotal)}</span>
            </div>
          </div>

          {checkoutError || formError ? (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {formError ?? checkoutError}
            </div>
          ) : null}

          {isEventCheckout ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <TicketHolderForm
                initialValue={{
                  fullName: buyerName ?? "",
                  email: buyerEmail ?? "",
                  phone: buyerPhone ?? "",
                }}
                onSubmit={(ticketHolder) => onSubmit({ ticketHolder })}
                onCancel={onClose}
                submitting={checkoutLoading}
              />
            </div>
          ) : (
            <>
              <BuyerDetailsForm
                value={buyerDetails}
                onChange={handleBuyerDetailsChange}
                saveForLater={saveBuyerDetails}
                onSaveForLaterChange={handleSaveBuyerDetailsChange}
                onLoadingChange={handleBuyerDetailsLoadingChange}
              />
              <button
                type="button"
                onClick={handleListingCheckout}
                disabled={buyerDetailsLoading || checkoutLoading}
                className="inline-flex w-full items-center justify-between gap-3 rounded-2xl bg-zinc-950 px-5 py-4 text-left text-white shadow-lg shadow-zinc-950/10 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2 text-sm font-black">
                  {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  {checkoutLoading ? "Preparing secure checkout…" : "Continue to payment"}
                </span>
                <span className="text-sm font-black">{formatMoney(subtotal)}</span>
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
