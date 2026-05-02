import type { Listing } from "../../types";

export default function ListingOffersBlock({ listing }: { listing: Listing }) {
  const hasDiscount = listing.discount_percent && listing.discount_percent > 0;
  const hasDealLabel = listing.deal_label && listing.deal_label.trim();
  const hasDealExpiry = listing.deal_expires_at && listing.deal_expires_at.trim();
  const isWholesale = listing.is_wholesale;
  const canSellIndividually = listing.can_sell_individually;
  const packSize = listing.pack_size;
  const bulkUnits = listing.bulk_units;

  const hasAnyOffer = hasDiscount || hasDealLabel || hasDealExpiry || isWholesale;

  if (!hasAnyOffer) return null;

  return (
    <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-amber-700">Special Offer</p>
      <div className="mt-3 space-y-2">
        {hasDealLabel ? (
          <p className="text-base font-black tracking-tight text-amber-900">{listing.deal_label}</p>
        ) : null}
        {hasDiscount && listing.original_price ? (
          <p className="text-sm font-bold text-amber-800">
            Was{" "}
            <span className="line-through">MK {Number(listing.original_price).toLocaleString()}</span>
            {" "}— save {listing.discount_percent}%
          </p>
        ) : null}
        {hasDealExpiry ? (
          <p className="text-sm text-amber-700">
            Offer ends:{" "}
            {new Date(listing.deal_expires_at ?? "").toLocaleDateString()}
          </p>
        ) : null}
        {isWholesale ? (
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-800">Wholesale available</p>
            {packSize ? (
              <p className="text-sm text-amber-700">
                Pack size: {packSize} unit{packSize !== 1 ? "s" : ""}
                {bulkUnits ? ` · ${bulkUnits}` : ""}
              </p>
            ) : null}
            {canSellIndividually ? (
              <p className="text-sm text-amber-700">Can also be sold individually</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
