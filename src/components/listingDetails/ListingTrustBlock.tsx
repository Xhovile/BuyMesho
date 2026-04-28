import { ChevronRight, ShieldCheck, Star, Store } from "lucide-react";
import type { Listing, RatingSummary } from "../../types";
import { navigateToSellerProfile } from "../../lib/appNavigation";
import { formatDate } from "./ListingDetailsShared";

export type SellerProfile = {
  uid?: string;
  business_name?: string;
  business_logo?: string;
  university?: string;
  bio?: string;
  is_verified?: boolean;
  join_date?: string;
  whatsapp_number?: string;
  profile_views?: number;
};

type ListingTrustBlockProps = {
  listing: Listing;
  seller: SellerProfile | null;
  ratingSummary?: RatingSummary | null;
};

export default function ListingTrustBlock({ listing, seller, ratingSummary }: ListingTrustBlockProps) {
  const sellerRating = ratingSummary ? ratingSummary.averageRating.toFixed(1) : null;
  const ratingCount = ratingSummary?.ratingCount ?? 0;
  const sellerUid = seller?.uid || listing.seller_uid;
  const sellerName = (seller?.business_name || listing.business_name || "Seller").trim() || "Seller";

  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <button
          type="button"
          onClick={() => navigateToSellerProfile(sellerUid)}
          className="flex w-full min-w-0 items-center gap-3 rounded-[1.5rem] text-left transition md:flex-1 md:min-w-0"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 sm:h-16 sm:w-16">
            {seller?.business_logo ? (
              <img
                src={seller.business_logo}
                alt={sellerName}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-sm font-black leading-none text-zinc-500 sm:text-base">
                {sellerName
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="min-w-0 break-words text-base font-black tracking-tight text-zinc-900 sm:text-xl">
                {sellerName}
              </h3>
              {seller?.is_verified || listing.is_verified ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-blue-500" />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-500">{listing.university}</p>
          </div>
        </button>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
          {sellerRating ? (
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-extrabold text-zinc-900">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              {sellerRating}
              <span className="text-xs font-semibold text-zinc-500">({ratingCount})</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigateToSellerProfile(sellerUid)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 sm:w-auto"
          >
            View Seller
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3 sm:gap-0">
        <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3 sm:border-t-0 sm:border-r sm:pr-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Seller status</p>
            <p className="mt-1 text-base font-extrabold text-zinc-900">{seller?.is_verified || listing.is_verified ? "Verified" : "Not verified"}</p>
          </div>
          <Store className="h-4 w-4 shrink-0 text-zinc-400" />
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3 sm:border-t-0 sm:border-r sm:px-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Joined</p>
            <p className="mt-1 text-base font-extrabold text-zinc-900">{formatDate(seller?.join_date)}</p>
          </div>
          <Store className="h-4 w-4 shrink-0 text-zinc-400" />
        </div>
        <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3 sm:border-t-0 sm:pl-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Profile views</p>
            <p className="mt-1 text-base font-extrabold text-zinc-900">{seller?.profile_views ?? 0}</p>
          </div>
          <Store className="h-4 w-4 shrink-0 text-zinc-400" />
        </div>
      </div>
    </div>
  );
}
