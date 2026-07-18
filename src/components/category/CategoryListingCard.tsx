import { ArrowRight } from "lucide-react";
import { navigateToListingDetails } from "../../lib/appNavigation";
import { formatMoney, getListingPricing } from "../../lib/listingPricing";
import {
  getListingAvailabilityLabel,
  getListingCardHighlights,
  getListingConditionLabel,
} from "../../lib/listingCardDisplay";
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

  const highlights = getListingCardHighlights(item, 3);
  const conditionLabel = getListingConditionLabel(item.condition);
  const availabilityLabel = getListingAvailabilityLabel(item.quantity, item.sold_quantity);

  return (
    <button
      type="button"
      onClick={() => navigateToListingDetails(item.id)}
      className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <img
          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm">
          {categoryLabel}
        </div>

        {offerLabel ? (
          <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white shadow-sm">
            {offerLabel}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="line-clamp-1 text-sm font-extrabold text-zinc-900">{item.name}</p>

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              {offerLabel ? (
                <div className="inline-flex flex-col gap-0.5">
                  <span className="text-[8px] font-black uppercase tracking-[0.18em] text-red-600">{offerLabel}</span>
                  <span className="text-[9px] font-extrabold leading-none text-red-700">{offerValue}</span>
                </div>
              ) : (
                <p className="text-sm font-bold text-red-900">{formatMoney(Number(item.price) || 0)}</p>
              )}
            </div>
          </div>
        </div>

        {highlights.length > 0 ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-600">
            {highlights.join(", ")}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {conditionLabel ? (
            <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-600">
              {conditionLabel}
            </span>
          ) : null}

          {availabilityLabel ? (
            <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-600">
              {availabilityLabel}
            </span>
          ) : null}

          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-600">
            Open listing
          </span>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-700">
          Open listing
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}
