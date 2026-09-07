import { type ReactNode } from "react";
import { Plus, Share2, ShieldCheck, ShoppingBag, ShoppingCart } from "lucide-react";
import type { Listing } from "../../types";
import { InfoPill } from "./ListingDetailsShared";
import BuyBasketIcon from "../BuyBasketIcon";

type SellerProfile = {
  business_name?: string;
  university?: string;
  is_verified?: boolean;
};

export default function ListingSummary({
  listing,
  seller,
  availableQuantity,
  isLoggedIn,
  currentUserUid,
  onMessageSeller,
  onShare,
  onBuyNow,
  onAddToCart,
  ownerActionsMenu,
}: {
  listing: Listing;
  seller: SellerProfile | null;
  availableQuantity: number;
  isLoggedIn: boolean;
  currentUserUid?: string | null;
  onMessageSeller: () => void;
  onShare: () => void;
  onBuyNow?: () => void;
  onAddToCart?: () => void;
  ownerActionsMenu?: ReactNode;
}) {
  const isOwner = !!currentUserUid && String(currentUserUid).trim() === String(listing.seller_uid).trim();
  const listingMode = listing.listing_mode || "normal";
  const stockCount = Math.max(0, availableQuantity);
  const isSold = listing.status === "sold";
  const isLowStock = !isSold && stockCount < 10;

  const modeLabel = listingMode === "deal" ? "Deal" : listingMode === "wholesale" ? "Wholesale" : "Normal";

  const actionButtonClass =
    "inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition-colors";

  const stockPillClass = isSold
    ? "border-red-200 bg-red-600 text-white"
    : isLowStock
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-zinc-200 bg-white text-zinc-600";

  const statusPillClass = isSold
    ? "border-red-200 bg-red-600 text-white"
    : "border-zinc-200 bg-white text-zinc-600";

  return (
    <aside>
      <div className="space-y-4 lg:space-y-5">
        <div className="space-y-3 pb-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Listing summary</p>
          <h1 className="text-[1.7rem] font-black leading-tight tracking-tight text-zinc-900 sm:text-[2rem]">{listing.name}</h1>
          <p className="text-[2rem] font-black tracking-tight text-red-950 sm:text-[2.25rem]">MK {Number(listing.price).toLocaleString()}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
          <InfoPill>{listing.university}</InfoPill>
          <InfoPill>{modeLabel}</InfoPill>
          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${statusPillClass}`}>
            {isSold ? "Sold" : "Available"}
          </span>
          <InfoPill>{listing.condition || "Used"}</InfoPill>
          <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${stockPillClass}`}>
            {isSold ? "Sold" : `${stockCount} left`}
          </span>
          {seller?.is_verified || listing.is_verified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified seller
            </span>
          ) : null}
        </div>

        {isOwner ? (
          <div className="relative overflow-visible rounded-3xl border border-zinc-700 border-l-4 border-l-red-800 bg-zinc-900 p-4 text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] ring-1 ring-zinc-800/80">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Owner view</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-white">Manage this listing</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-300">Use the tools here to edit details, update stock, record sales, or remove the listing.</p>
              </div>
              <div className="relative z-20 flex shrink-0 items-center gap-2">
                {ownerActionsMenu ? <div className="shrink-0">{ownerActionsMenu}</div> : null}
                <button type="button" onClick={onShare} className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-white shadow-sm transition-colors hover:bg-zinc-700" aria-label="Share listing" title="Share listing">
                  <Share2 className="h-4 w-4 text-zinc-200" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-zinc-200 pt-4">
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={onBuyNow} className={`${actionButtonClass} bg-lime-400 text-zinc-950 hover:bg-lime-500`}>
                <BuyBasketIcon className="hidden h-6 w-6 shrink-0 text-[#8F171D] lg:block" />
                <span>Buy</span>
              </button>

              <button
                type="button"
                onClick={onAddToCart}
                className={`${actionButtonClass} bg-yellow-500 text-white hover:bg-yellow-400`}
                aria-label="Add to cart"
                title="Add to cart"
              >
                <span className="inline-flex items-center gap-2" aria-hidden="true">
                  <span className="relative inline-flex h-5 w-6 items-center justify-center">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-yellow-600 shadow-sm">
                      <Plus className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  </span>
                  <span className="hidden truncate sm:inline">Add to Cart</span>
                </span>
              </button>

              <button type="button" onClick={onMessageSeller} className="flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-0 shadow-sm transition-all hover:bg-zinc-50 active:translate-y-px" aria-label="Message seller" title="Message seller">
                <svg viewBox="190 240 220 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-8 w-9 drop-shadow-[0_3px_3px_rgba(0,0,0,0.18)]">
                  <path d="M232 250 H360 C379 250 394 265 394 284 V351 C394 370 379 385 360 385 H351 V414 C351 424 343 429 335 421 L298 385 H232 C213 385 198 370 198 351 V284 C198 265 213 250 232 250 Z" fill="#198FC7" />
                  <circle cx="245" cy="316" r="12" fill="#FFFFFF" />
                  <circle cx="284" cy="316" r="12" fill="#FFFFFF" />
                  <circle cx="323" cy="316" r="12" fill="#FFFFFF" />
                </svg>
                <span className="hidden truncate font-extrabold sm:inline">Message</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
