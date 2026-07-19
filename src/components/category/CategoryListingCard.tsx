import { navigateToListingDetails } from "../../lib/appNavigation";
import { formatMoney, getListingPricing } from "../../lib/listingPricing";
import {
  getListingAvailabilityLabel,
  getListingCardSpecs,
  getListingConditionLabel,
} from "../../lib/listingCardHighlights";
import type { ListingSpecValues } from "../../types";

type ListingPreview = {
  id: number | string;
  name: string;
  price: number | string;
  photos?: string[];
  category?: string;
  subcategory?: string | null;
  item_type?: string | null;
  spec_values?: ListingSpecValues | null;
  condition?: string | null;
  quantity?: number | string | null;
  sold_quantity?: number | string | null;
  listing_mode?: "normal" | "deal" | "wholesale";
  original_price?: number | string | null;
  discount_percent?: number | string | null;
  is_wholesale?: boolean | number | string | null;
  can_sell_individually?: boolean | number | string | null;
  pack_size?: number | string | null;
  bulk_units?: string | null;
  single_item_price?: number | string | null;
  deal_label?: string | null;
  deal_expires_at?: string | null;
};

type Props = {
  item: ListingPreview;
  categoryLabel: string;
};

export default function CategoryListingCard({ item, categoryLabel }: Props) {
  const pricing = getListingPricing(item);
  const offerLabel =
    pricing.listingMode === "deal" ? "Discount" : pricing.listingMode === "wholesale" ? "Wholesale" : null;
  const offerValue =
    pricing.listingMode === "deal"
      ? `${formatMoney(pricing.price)}${pricing.discountPercent !== null ? ` -${pricing.discountPercent}%` : ""}`
      : pricing.listingMode === "wholesale"
        ? formatMoney(pricing.price)
        : null;

  const cardSpecs = getListingCardSpecs(item, 3);
  const conditionLabel = getListingConditionLabel(item.condition);
  const availabilityLabel = getListingAvailabilityLabel(item.quantity, item.sold_quantity);

  return (
    <button
      type="button"
      onClick={() => navigateToListingDetails(item.id)}
      className="group w-full max-w-[220px] max-h-[320px] overflow-hidden bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40"
      aria-label={`Open listing details for ${item.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
        <img
          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur-sm">
          {categoryLabel}
        </div>

        {offerLabel ? (
          <div className="absolute right-3 top-3 rounded-full border border-white/25 bg-white/55 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-red-800 shadow-sm backdrop-blur-sm">
            {offerLabel}
          </div>
        ) : null}
      </div>

      <div className="space-y-2 py-3">
        <div>
          <p className="line-clamp-1 text-sm font-extrabold text-zinc-900">{item.name}</p>

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {offerLabel ? (
                <div className="inline-flex flex-col gap-0.5 rounded-xl border border-white/25 bg-white/60 px-2 py-1 shadow-sm backdrop-blur-sm">
                  <span className="text-[8px] font-black uppercase tracking-[0.18em] text-red-700">{offerLabel}</span>
                  <span className="text-[9px] font-extrabold leading-none text-red-800">{offerValue}</span>
                </div>
              ) : (
                <p className="text-sm font-bold text-red-900">{formatMoney(Number(item.price) || 0)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex min-h-[2rem] flex-wrap gap-1 text-[10px]">
          {cardSpecs.map((spec) => (
            <span key={spec.key} className="rounded-full bg-zinc-100 px-2 py-0.5 font-semibold text-zinc-700">
              {spec.label}: {spec.value}
            </span>
          ))}
        </div>

        <div className="min-h-[1.25rem] text-[10px] font-extrabold uppercase tracking-wider text-zinc-600">
          {[conditionLabel, availabilityLabel].filter(Boolean).join(" • ")}
        </div>
      </div>
    </button>
  );
}
