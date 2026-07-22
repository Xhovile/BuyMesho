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
}) {
  const isOwner = !!currentUserUid && currentUserUid === listing.seller_uid;
  const listingMode = listing.listing_mode || "normal";
  const canBuy = !!onBuyNow && availableQuantity > 0 && listing.status !== "sold";
  const canAddToCart = !!onAddToCart && availableQuantity > 0 && listing.status !== "sold";

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

        <div className="border-t border-zinc-200 pt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
            <button
              type="button"
              onClick={isOwner ? undefined : onMessageSeller}
              disabled={isOwner}
              aria-disabled={isOwner}
              className={`${actionButtonClass} bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-45`}
              title={isOwner ? "Messaging your own listing is disabled" : undefined}
            >
              <MessageCircle className="h-4 w-4 shrink-0" />
              <span className="truncate">Message</span>
            </button>

            <button
              type="button"
              onClick={isOwner ? undefined : onBuyNow}
              disabled={isOwner || !canBuy}
              aria-disabled={isOwner || !canBuy}
              className={`${actionButtonClass} bg-lime-400 text-zinc-950 hover:bg-lime-500 disabled:cursor-not-allowed disabled:opacity-45`}
              title={isOwner ? "Buying your own listing is disabled" : undefined}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" />
              <span className="truncate">Buy</span>
            </button>

            <button
              type="button"
              onClick={isOwner ? undefined : onAddToCart}
              disabled={isOwner || !canAddToCart}
              aria-disabled={isOwner || !canAddToCart}
              className={`${actionButtonClass} bg-yellow-500 text-white hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-45`}
              title={isOwner ? "Adding your own listing to cart is disabled" : undefined}
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

          {isOwner ? (
            <p className="mt-3 text-xs font-medium text-zinc-500">
              You can still share this listing, but messaging and buying are disabled for the owner.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
