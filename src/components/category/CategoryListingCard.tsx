import { ArrowRight, MapPin } from "lucide-react";
import { navigateToListingDetails } from "../../lib/appNavigation";
import { formatMoney, getListingPricing } from "../../lib/listingPricing";

type ListingPreview = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
  listing_mode?: "normal" | "deal" | "wholesale";
  original_price?: number | string | null;
  discount_percent?: number | string | null;
  is_wholesale?: boolean | number | string | null;
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

  return (
    <button
      type="button"
      onClick={() => navigateToListingDetails(item.id)}
      className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
        <img
          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm">
          {categoryLabel}
        </div>
      </div>

      <div className="p-4">
        <p className="text-sm font-extrabold text-zinc-900 line-clamp-1">{item.name}</p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {offerLabel ? (
              <div className="mb-0.5 inline-flex flex-col gap-0.5">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-red-600">{offerLabel}</span>
                <span className="text-[9px] font-extrabold leading-none text-red-700">{offerValue}</span>
              </div>
            ) : (
              <p className="text-sm font-bold text-red-900">{formatMoney(Number(item.price) || 0)}</p>
            )}
          </div>

          {item.university ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <MapPin className="w-3 h-3" />
              {item.university}
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
          {item.description || "Tap to open the full listing details."}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-700">
          Open listing
          <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
