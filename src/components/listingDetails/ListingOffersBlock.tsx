import type { Listing } from "../../types";
import { formatMoney, getListingPricing } from "../../lib/listingPricing";

export default function ListingOffersBlock({ listing }: { listing: Listing }) {
  const pricing = getListingPricing(listing);
  const { hasDeal, dealLabel, originalPrice, discountPercent, isWholesale, wholesalePackLabel, wholesaleQuantityLabel } = pricing;

  if (!hasDeal && !isWholesale) return null;

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-700">Special Offer</p>
      <div className="mt-3 space-y-2">
        {dealLabel ? (
          <p className="text-base font-black tracking-tight text-amber-900">{dealLabel}</p>
        ) : null}
        {hasDeal && originalPrice ? (
          <p className="text-sm font-bold text-amber-800">
            Was{" "}
            <span className="line-through">{formatMoney(originalPrice)}</span>
            {discountPercent ? ` — save ${discountPercent}%` : ""}
          </p>
        ) : null}
        {listing.deal_expires_at ? (
          <p className="text-sm text-amber-700">
            Offer ends:{" "}
            {new Date(listing.deal_expires_at ?? "").toLocaleDateString()}
          </p>
        ) : null}
        {isWholesale ? (
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-800">Wholesale available</p>
            {wholesalePackLabel ? (
              <p className="text-sm text-amber-700">{wholesalePackLabel}</p>
            ) : null}
            {wholesaleQuantityLabel ? (
              <p className="text-sm text-amber-700">{wholesaleQuantityLabel} in stock</p>
            ) : null}
            {listing.can_sell_individually ? (
              <p className="text-sm text-amber-700">Can also be sold individually</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
