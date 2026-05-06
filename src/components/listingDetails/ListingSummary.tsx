import { MessageCircle, Share2, ShieldCheck, ShoppingBag } from "lucide-react";
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
}: {
  listing: Listing;
  seller: SellerProfile | null;
  availableQuantity: number;
  isLoggedIn: boolean;
  currentUserUid?: string | null;
  onMessageSeller: () => void;
  onShare: () => void;
  onBuyNow?: () => void;
}) {
  const isOwner = !!currentUserUid && currentUserUid === listing.seller_uid;
  const listingMode = listing.listing_mode || "normal";
  const canBuy = !!onBuyNow && availableQuantity > 0 && listing.status !== "sold";

  const modeLabel =
    listingMode === "deal"
      ? "Deal"
      : listingMode === "wholesale"
        ? "Wholesale"
        : "Normal";

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
          <p className="text-[2rem] font-black tracking-tight text-zinc-900 sm:text-[2.25rem]">
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

        {!isOwner ? (
          <div className="border-t border-zinc-200 pt-4">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <button
                type="button"
                onClick={onMessageSeller}
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 py-3 text-sm font-extrabold text-white transition-colors hover:bg-sky-600"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span className="truncate">Message</span>
              </button>

              <button
                type="button"
                onClick={onBuyNow}
                disabled={!canBuy}
                className="inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl bg-lime-400 px-3 py-3 text-sm font-extrabold text-zinc-950 transition-colors hover:bg-lime-500 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span className="truncate">Buy</span>
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
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-500">
            This is your listing.
          </div>
        )}
      </div>
    </aside>
  );
}
