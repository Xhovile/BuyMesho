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
  onMessageSeller: () => void | Promise<void>;
  onShare: () => void;
  onBuyNow?: () => void;
  onAddToCart?: () => void | Promise<void>;
  ownerActionsMenu?: ReactNode;
}) {
  const isOwner = !!currentUserUid && String(currentUserUid).trim() === String(listing.seller_uid).trim();
  const listingMode = listing.listing_mode || "normal";
  const stockCount = Math.max(0, availableQuantity);
  const isSold = listing.status === "sold";
  const isLowStock = !isSold && stockCount < 10;

  const modeLabel = listingMode === "deal" ? "Deal" : listingMode === "wholesale" ? "Wholesale" : "Normal";

  const actionButtonClass =
    "inline-flex h-12 min-w-0 w-full items-center justify-center gap-2 rounded-2xl border border-bm-border bg-bm-surface px-3 py-3 text-sm font-extrabold shadow-sm transition-all hover:bg-bm-surface-muted hover:shadow-md active:translate-y-px";

  const stockPillClass = isSold
    ? "border-bm-danger/35 bg-bm-danger-bg text-bm-danger"
    : isLowStock
      ? "border-bm-warning/35 bg-bm-warning-bg text-bm-warning"
      : "border-bm-border bg-bm-surface text-bm-text-muted";

  const statusPillClass = isSold
    ? "border-bm-danger/35 bg-bm-danger-bg text-bm-danger"
    : "border-bm-border bg-bm-surface text-bm-text-muted";

  return (
    <aside>
      <div className="space-y-4 lg:space-y-5">
        <div className="space-y-3 pb-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bm-text-subtle">Listing summary</p>
          <h1 className="text-[1.7rem] font-black leading-tight tracking-tight text-bm-text sm:text-[2rem]">{listing.name}</h1>
          <p className="text-[2rem] font-black tracking-tight text-bm-brand sm:text-[2.25rem]">MK {Number(listing.price).toLocaleString()}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-bm-border pt-4">
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
            <span className="inline-flex items-center gap-1 rounded-full border border-bm-success/35 bg-bm-success-bg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-bm-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified seller
            </span>
          ) : null}
        </div>

        {isOwner ? (
          <div className="relative overflow-visible rounded-3xl border border-bm-border border-l-4 border-l-bm-brand bg-bm-surface-muted p-4 text-bm-text shadow-[0_18px_50px_-28px_rgba(0,0,0,0.7)] ring-1 ring-bm-border">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-bm-text-subtle">Owner view</p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-bm-text">Manage this listing</h2>
                <p className="mt-1 text-sm leading-6 text-bm-text-muted">Use the tools here to edit details, update stock, record sales, or remove the listing.</p>
              </div>
              <div className="relative z-20 flex shrink-0 items-center gap-2">
                {ownerActionsMenu ? <div className="shrink-0">{ownerActionsMenu}</div> : null}
                <button type="button" onClick={onShare} className="flex h-10 w-10 items-center justify-center rounded-full border border-bm-border bg-bm-surface text-bm-text shadow-sm transition-colors hover:bg-bm-surface-raised" aria-label="Share listing" title="Share listing">
                  <Share2 className="h-4 w-4 text-bm-text-muted" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-bm-border pt-4">
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={onBuyNow} className={`${actionButtonClass} text-bm-brand`}>
                <BuyBasketIcon className="h-5 w-5 shrink-0 text-[#8F171D]" />
                <span>Buy</span>
              </button>

              <button
                type="button"
                onClick={onAddToCart}
                className={`${actionButtonClass} text-bm-success`}
                aria-label="Add to cart"
                title="Add to cart"
              >
                <span className="inline-flex items-center gap-2" aria-hidden="true">
                  <span className="relative inline-flex h-5 w-6 items-center justify-center">
                    <ShoppingCart className="h-5 w-5" />
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-bm-bg text-bm-success shadow-sm">
                      <Plus className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  </span>
                  <span className="hidden truncate sm:inline">Add to Cart</span>
                </span>
              </button>

              <button type="button" onClick={onMessageSeller} className="flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl border border-bm-border bg-bm-surface p-0 shadow-sm transition-all hover:bg-bm-surface-muted active:translate-y-px" aria-label="Message seller" title="Message seller">
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
