import { type ReactNode } from "react";
import { MessageCircle, Share2, ShieldCheck, ShoppingBag, ShoppingCart } from "lucide-react";
import type { Listing } from "../../types";
import { InfoPill } from "./ListingDetailsShared";

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

  const modeLabel =
    listingMode === "deal"
      ? "Deal"
      : listingMode === "wholesale"
        ? "Wholesale"
        : "Normal";

  const actionButtonClass =
    "inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition-colors";

  return (
    <aside>
      <div className="space-y-4 lg:space-y-5">
        <div className="space-y-3 pb-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
            Listing summary
          </p>
          <h1 className="text-[1.7rem] font-black leading-tight tracking-tight text-zinc-900 sm:text-[2rem]">
            {listing.name}
          </h1>
          <p className="text-[2rem] font-black tracking-tight text-red-950 sm:text-[2.25rem]">
            MK {Number(listing.price).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
          <InfoPill>{listing.university}</InfoPill>
          <InfoPill>{modeLabel}</InfoPill>
          <InfoPill>{listing.status === "sold" ? "Sold" : "Available"}</InfoPill>
          <InfoPill>{listing.condition || "Used"}</InfoPill>
          <InfoPill>{Math.max(0, availableQuantity)} left</InfoPill>
          {seller?.is_verified || listing.is_verified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified seller
            </span>
          ) : null}
        </div>

        {isOwner ? (
          <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-500">
                  Owner view
                </p>
                <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-900">
                  Manage this listing
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Use the tools here to edit details, update stock, record sales, or remove the listing.
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {ownerActionsMenu ? <div className="shrink-0">{ownerActionsMenu}</div> : null}
                <button
                  type="button"
                  onClick={onShare}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50"
                  aria-label="Share listing"
                  title="Share listing"
                >
                  <Share2 className="h-4 w-4 text-zinc-700" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-zinc-200 pt-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <button
                type="button"
                onClick={onMessageSeller}
                className={`${actionButtonClass} bg-sky-500 text-white hover:bg-sky-600`}
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">Message</span>
              </button>

              <button
                type="button"
                onClick={onBuyNow}
                className={`${actionButtonClass} bg-lime-400 text-zinc-950 hover:bg-lime-500`}
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className="truncate">Buy</span>
              </button>

              <button
                type="button"
                onClick={onAddToCart}
                className={`${actionButtonClass} bg-yellow-500 text-white hover:bg-yellow-400`}
              >
                <ShoppingCart className="h-4 w-4 shrink-0" />
                <span className="truncate">Add to Cart</span>
              </button>

              <button
                type="button"
                onClick={onShare}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50"
                aria-label="Share listing"
                title="Share listing"
              >
                <Share2 className="h-4 w-4 text-zinc-700" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
