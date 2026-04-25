import { MessageCircle, Share2, ShieldCheck } from "lucide-react";
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
  onContactSeller,
  onShare,
}: {
  listing: Listing;
  seller: SellerProfile | null;
  availableQuantity: number;
  isLoggedIn: boolean;
  onContactSeller: () => void;
  onShare: () => void;
}) {
  return (
    <aside className="space-y-0 border-t border-zinc-200 pt-6 xl:border-t-0 xl:pt-0">
      <div className="space-y-5">
        <div className="space-y-3 pb-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Listing summary</p>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">{listing.name}</h1>
          <p className="text-3xl font-black tracking-tight text-zinc-900">MK {Number(listing.price).toLocaleString()}</p>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-zinc-200 pt-4">
          <InfoPill>{listing.university}</InfoPill>
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

        <div className="grid gap-3 border-t border-zinc-200 pt-4 sm:grid-cols-2">
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
