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
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}

export default function ListingOffersBlock({ listing }: ListingOffersBlockProps) {
  const pricing = getListingPricing(listing);
  const dealExpiry = formatExpiryLabel(pricing.dealExpiresAt);
  const originalPrice = pricing.originalPrice;
  const hasActiveDeal = pricing.dealStatus === "active";
  const canSellIndividually = pricing.canSellIndividually;

  return (
    <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-2 border-b border-zinc-100 pb-4">
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OfferStat label="Current price" value={formatMoney(pricing.price)} />
        <OfferStat
          label="Original price"
          value={originalPrice ? formatMoney(originalPrice) : "Not listed"}
        />
        <OfferStat
          label="Deal status"
          value={
            hasActiveDeal
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

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OfferStat
          label="Wholesale"
          value={pricing.isWholesale ? "Available" : "Not enabled"}
        />
        <OfferStat
          label="Pack size"
          value={
            pricing.isWholesale
              ? pricing.wholesalePackLabel || "Pack details not set"
              : "—"
          }
        />
        <OfferStat
          label="Single items"
          value={
            pricing.isWholesale
              ? canSellIndividually === null
                ? "Not specified"
                : canSellIndividually
                  ? "Allowed"
                  : "Not allowed"
              : "—"
          }
        />
        <OfferStat
          label="Stock left"
          value={
            pricing.availableQuantity === null
              ? "Not tracked"
              : `${pricing.availableQuantity.toLocaleString()} ${pricing.availableQuantity === 1 ? "unit" : "units"}`
          }
        />
      </div>

      {pricing.isWholesale && (pricing.wholesaleQuantityLabel || pricing.wholesalePackLabel) ? (
        <div className="mt-4 rounded-3xl bg-zinc-50 p-4 text-sm text-zinc-600">
          <p className="font-bold text-zinc-900">Wholesale summary</p>
          <p className="mt-1 leading-6">
            {pricing.wholesalePackLabel ? `${pricing.wholesalePackLabel}` : "Wholesale pricing is active."}
            {pricing.wholesaleQuantityLabel ? ` ${pricing.wholesaleQuantityLabel} remain.` : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
