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
    <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}

export default function ListingOffersBlock({ listing }: ListingOffersBlockProps) {
  const pricing = getListingPricing(listing);

  const mode = listing.listing_mode || (pricing.isWholesale ? "wholesale" : pricing.dealStatus === "active" ? "deal" : "normal");
  const dealExpiry = formatExpiryLabel(pricing.dealExpiresAt);
  const stockLeft =
    pricing.availableQuantity === null
      ? "Not tracked"
      : `${pricing.availableQuantity.toLocaleString()} ${pricing.availableQuantity === 1 ? "unit" : "units"}`;

  const showDealSection = mode === "deal";
  const showWholesaleSection = mode === "wholesale";

  return (
    <section className="space-y-5">
      <div className="border-b border-zinc-200 pb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
          Offers & Pricing
        </p>
        <h3 className="text-xl font-black tracking-tight text-zinc-950 sm:text-2xl">
          Full offer logic
        </h3>
        <p className="max-w-3xl text-sm leading-6 text-zinc-500">
          The card stays clean. This section carries the real pricing, deal, and wholesale rules.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OfferStat label="Current price" value={formatMoney(pricing.price)} />
        <OfferStat label="Stock left" value={stockLeft} />
        <OfferStat
          label="Listing mode"
          value={
            mode === "deal"
              ? "Deal"
              : mode === "wholesale"
                ? "Wholesale"
                : "Normal"
          }
        />
        <OfferStat
          label="Visibility"
          value={listing.status === "sold" ? "Sold" : "Available"}
        />
      </div>

      {showDealSection ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OfferStat
            label="Original price"
            value={pricing.originalPrice ? formatMoney(pricing.originalPrice) : "Not listed"}
          />
          <OfferStat
            label="Discount"
            value={
              pricing.discountPercent && pricing.discountPercent > 0
                ? `${pricing.discountPercent}% off`
                : "Not specified"
            }
          />
          <OfferStat
            label="Deal status"
            value={
              pricing.dealStatus === "active"
                ? pricing.dealLabel || "Active deal"
                : pricing.dealStatus === "expired"
                  ? "Expired"
                  : "No active deal"
            }
          />
          <OfferStat
            label="Deal expiry"
            value={dealExpiry || "No expiry set"}
          />
        </div>
      ) : null}

      {showWholesaleSection ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OfferStat
            label="Wholesale"
            value={pricing.isWholesale ? "Enabled" : "Not enabled"}
          />
          <OfferStat
            label="Pack size"
            value={pricing.wholesalePackLabel || "Pack details not set"}
          />
          <OfferStat
            label="Single items"
            value={
              pricing.canSellIndividually === null
                ? "Not specified"
                : pricing.canSellIndividually
                  ? "Allowed"
                  : "Not allowed"
            }
          />
          <OfferStat
            label="Wholesale stock"
            value={pricing.wholesaleQuantityLabel || stockLeft}
          />
        </div>
      ) : null}

      {mode === "normal" ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <p className="font-bold text-zinc-900">Normal listing</p>
          <p className="mt-1 leading-6">
            One price only. No deal terms. No wholesale terms.
          </p>
        </div>
      ) : null}
    </section>
  );
}
