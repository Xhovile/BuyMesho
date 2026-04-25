import { MessageCircle, Share2, ShieldCheck, Star } from "lucide-react";
import type { Listing, RatingSummary } from "../../types";
import { formatDate, InfoPill, StatTile } from "./ListingDetailsShared";

type SellerProfile = {
  business_name?: string;
  university?: string;
  is_verified?: boolean;
  join_date?: string;
};

export default function ListingSummary({
  listing,
  seller,
  ratingSummary,
  availableQuantity,
  isLoggedIn,
  onContactSeller,
  onShare,
}: {
  listing: Listing;
  seller: SellerProfile | null;
  ratingSummary: RatingSummary | null;
  availableQuantity: number;
  isLoggedIn: boolean;
  onContactSeller: () => void;
  onShare: () => void;
}) {
  const averageRating =
    ratingSummary && Number.isFinite(ratingSummary.averageRating)
      ? ratingSummary.averageRating.toFixed(1)
      : "—";
  const ratingCount = ratingSummary?.ratingCount ?? 0;
  const listedSince = formatDate(seller?.join_date || listing.created_at);

  return (
    <aside className="space-y-5">
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
              Listing summary
            </p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">{listing.name}</h1>
            <p className="text-3xl font-black tracking-tight text-zinc-900">MK {Number(listing.price).toLocaleString()}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <InfoPill>{listing.university}</InfoPill>
            <InfoPill>{listing.status === "sold" ? "Sold" : "Available"}</InfoPill>
            {seller?.is_verified || listing.is_verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified seller
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile label="Available qty" value={Math.max(0, availableQuantity)} />
          <StatTile
            label="Seller rating"
            value={ratingCount > 0 ? `${averageRating} (${ratingCount})` : "No ratings yet"}
            icon={<Star className="h-4 w-4" />}
          />
          <StatTile label="Listed since" value={listedSince} />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onContactSeller}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
          >
            <MessageCircle className="h-4 w-4" />
            {isLoggedIn ? "Contact seller" : "Log in to contact"}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-extrabold text-zinc-900 transition-colors hover:bg-zinc-50"
          >
            <Share2 className="h-4 w-4" />
            Share listing
          </button>
        </div>
      </div>
    </aside>
  );
}
