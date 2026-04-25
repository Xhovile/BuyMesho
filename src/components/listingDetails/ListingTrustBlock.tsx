import { ShieldCheck, Store } from "lucide-react";
import type { Listing } from "../../types";
import { navigateToSellerProfile } from "../../lib/appNavigation";
import { formatDate } from "./ListingDetailsShared";

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
};

export default function ListingTrustBlock({ listing, seller }: ListingTrustBlockProps) {
  return (
    <div className="space-y-6 border-t border-zinc-200 pt-6">
      <div className="space-y-4 border-t border-zinc-200 pt-6">
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
            <p className="mt-1 text-sm text-zinc-500">
              {listing.university}
            </p>
          </div>
        </button>

        <div className="grid gap-0 sm:grid-cols-3">
          <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Seller status</p>
              <p className="mt-1 text-base font-extrabold text-zinc-900">
                {seller?.is_verified || listing.is_verified ? "Verified" : "Not verified"}
              </p>
            </div>
            <Store className="h-4 w-4 shrink-0 text-zinc-400" />
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Joined</p>
              <p className="mt-1 text-base font-extrabold text-zinc-900">{formatDate(seller?.join_date)}</p>
            </div>
            <Store className="h-4 w-4 shrink-0 text-zinc-400" />
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Profile views</p>
              <p className="mt-1 text-base font-extrabold text-zinc-900">{seller?.profile_views ?? 0}</p>
            </div>
            <Store className="h-4 w-4 shrink-0 text-zinc-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
