import { Eye, ShieldCheck, Star, Store } from "lucide-react";
import type { Listing, RatingSummary } from "../../types";
import { navigateToSellerProfile } from "../../lib/appNavigation";
import { formatDate, StatTile } from "./ListingDetailsShared";

type SellerProfile = {
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
  ratingSummary: RatingSummary | null;
};

export default function ListingTrustBlock({ listing, seller, ratingSummary }: ListingTrustBlockProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Seller business" value={seller?.business_name || listing.business_name} icon={<Store className="h-4 w-4" />} />
        <StatTile label="Verification" value={seller?.is_verified || listing.is_verified ? "Verified" : "Not verified"} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatTile label="Joined" value={formatDate(seller?.join_date)} icon={<Eye className="h-4 w-4" />} />
        <StatTile label="Profile views" value={seller?.profile_views ?? 0} icon={<Eye className="h-4 w-4" />} />
      </div>

      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <button type="button" onClick={() => seller?.uid && navigateToSellerProfile(seller.uid)} className="flex items-center gap-3 text-left">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
              {seller?.business_logo ? (
                <img src={seller.business_logo} alt={seller.business_name || listing.business_name || "Seller"} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-black text-zinc-500">
                  {(seller?.business_name || listing.business_name || "S").trim().split(/\s+/).filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight text-zinc-900">{seller?.business_name || listing.business_name}</h3>
                {seller?.is_verified || listing.is_verified ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : null}
              </div>
              <p className="mt-1 text-sm text-zinc-500">{listing.university} · {listing.category}</p>
            </div>
          </button>

          <div className="text-right text-sm text-zinc-500">
            <p>WhatsApp clicks: <span className="font-semibold text-zinc-900">{listing.whatsapp_clicks ?? 0}</span></p>
            <p className="mt-1">Listing views: <span className="font-semibold text-zinc-900">{listing.views_count ?? 0}</span></p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatTile label="Rating average" value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} />
          <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
          <StatTile label="Campus" value={listing.university} icon={<Eye className="h-4 w-4" />} />
        </div>
      </div>
    </div>
  );
}
