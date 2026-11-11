import { ChevronRight, ShieldCheck, Star } from "lucide-react";
import type { Listing, RatingSummary } from "../../types";
import { normalizeRatingSummary } from "../ratings/ratingSummaryUtils";
import { navigateToSellerProfile } from "../../lib/appNavigation";
import { formatDate } from "./ListingDetailsShared";

export type SellerProfile = {
  uid?: string;
  business_name?: string;
  business_logo?: string;
  bio?: string;
  is_verified?: boolean;
  join_date?: string;
  profile_views?: number;
  ratingSummary?: RatingSummary | null;
};

type ListingTrustBlockProps = {
  listing: Listing;
  seller: SellerProfile | null;
  ratingSummary?: RatingSummary | null;
};

export default function ListingTrustBlock({ listing, seller, ratingSummary }: ListingTrustBlockProps) {
  const normalized = normalizeRatingSummary(seller?.ratingSummary ?? ratingSummary);
  const sellerUid = seller?.uid || listing.seller_uid;
  const sellerName = (seller?.business_name || listing.business_name || "Seller").trim() || "Seller";
  const verified = Boolean(seller?.is_verified || listing.is_verified);

  return (
    <div className="rounded-3xl border border-bm-border bg-gradient-to-br from-bm-surface-muted via-bm-surface to-bm-surface p-4 shadow-sm ring-1 ring-bm-border-subtle sm:p-5">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => navigateToSellerProfile(sellerUid)}
          className="flex w-full min-w-0 items-center gap-3 rounded-[1.5rem] text-left transition"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-bm-border bg-bm-surface sm:h-16 sm:w-16">
            {seller?.business_logo ? (
              <img src={seller.business_logo} alt={sellerName} className="h-full w-full object-cover" />
            ) : (
              <span className="px-2 text-sm font-black leading-none text-bm-text-muted sm:text-base">
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
            <h3 className="min-w-0 break-words text-base font-black tracking-tight text-bm-text sm:text-xl">
              {sellerName}
            </h3>
            {verified ? (
              <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-bm-border bg-bm-surface px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bm-text-muted sm:text-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </div>
            ) : null}
          </div>
        </button>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          {normalized.hasRatings ? (
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-bm-border bg-bm-surface px-3 py-1.5 text-sm font-extrabold text-bm-text">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              {normalized.averageRating.toFixed(1)}
              <span className="text-xs font-semibold text-bm-text-muted/70">({normalized.ratingCount})</span>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center rounded-full border border-bm-border bg-bm-surface px-3 py-1.5 text-sm font-extrabold text-bm-text-muted/70">
              No ratings yet
            </div>
          )}

          <button
            type="button"
            onClick={() => navigateToSellerProfile(sellerUid)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-bm-brand px-4 py-2 text-sm font-bold text-bm-on-brand transition hover:bg-bm-brand-hover sm:w-auto"
          >
            View Seller
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-bm-border-subtle pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">Joined</p>
          <p className="mt-1 text-base font-extrabold text-bm-text">{formatDate(seller?.join_date)}</p>
        </div>
      </div>
    </div>
  );
}
