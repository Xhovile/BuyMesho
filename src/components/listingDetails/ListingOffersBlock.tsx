import type { Listing } from "../../types";
import { formatMoney, getListingPricing } from "../../lib/listingPricing";

type ListingOffersBlockProps = {
  listing: Listing;
};

function formatExpiryLabel(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function OfferStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}

export default function ListingOffersBlock({ listing }: ListingOffersBlockProps) {
  const pricing = getListingPricing(listing);
  const mode = listing.listing_mode || pricing.listingMode;

  if (mode === "normal") return null;

  const dealExpiry = formatExpiryLabel(pricing.dealExpiresAt);
  const stockLeft =
    pricing.availableQuantity === null
      ? "Not tracked"
      : `${pricing.availableQuantity.toLocaleString()} ${pricing.availableQuantity === 1 ? "unit" : "units"}`;

  return (
    <section className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="border-b border-zinc-200 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
          Offers & pricing
        </p>
        <h3 className="text-xl font-black tracking-tight text-zinc-950 sm:text-2xl">
          Pricing details
        </h3>
        <p className="max-w-3xl text-sm leading-6 text-zinc-500">
          Deal and wholesale pricing is shown here only when the listing mode requires it.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OfferStat label="Current price" value={formatMoney(pricing.price)} />
        <OfferStat
          label="Listing mode"
          value={mode === "deal" ? "Deal" : "Wholesale"}
        />
        <OfferStat
          label="Availability"
          value={listing.status === "sold" ? "Sold" : stockLeft}
        />
        <OfferStat
          label="Visibility"
          value={listing.status === "sold" ? "Completed" : "Active"}
        />
      </div>

      {mode === "deal" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OfferStat
            label="Original price"
            value={pricing.originalPrice ? formatMoney(pricing.originalPrice) : "Not set"}
          />
          <OfferStat
            label="Discount"
            value={
              pricing.discountPercent && pricing.discountPercent > 0
                ? `${pricing.discountPercent}% off`
                : "Calculated automatically"
            }
          />
          <OfferStat
            label="Deal label"
            value={pricing.dealLabel || "No label"}
          />
          <OfferStat
            label="Deal expiry"
            value={dealExpiry || "No expiry set"}
          />
        </div>
      ) : null}

      {mode === "wholesale" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OfferStat
            label="Pack size"
            value={pricing.wholesalePackLabel || "Pack details not set"}
          />
          <OfferStat
            label="Bulk units"
            value={pricing.bulkUnits || "Not set"}
          />
          <OfferStat
            label="Single item sale"
            value={
              pricing.canSellIndividually === null
                ? "Not specified"
                : pricing.canSellIndividually
                  ? "Allowed"
                  : "Not allowed"
            }
          />
          <OfferStat
            label="Single item price"
            value={pricing.singleItemPrice === null ? "Not set" : formatMoney(pricing.singleItemPrice)}
          />
        </div>
      ) : null}
    </section>
  );
}
