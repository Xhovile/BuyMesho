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
      className="group overflow-hidden rounded-[1.9rem] border border-zinc-100 bg-white text-left shadow-[0_10px_30px_rgba(24,24,27,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-200 hover:shadow-[0_18px_45px_rgba(24,24,27,0.08)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <img
          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-transparent opacity-70" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur">
            {categoryLabel}
          </span>
          {item.category ? (
            <span className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold text-zinc-600 shadow-sm backdrop-blur">
              {item.category}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="space-y-1.5">
          <p className="line-clamp-1 text-[0.96rem] font-black tracking-tight text-zinc-950 sm:text-[1.05rem]">
            {item.name}
          </p>

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {offerLabel ? (
                <div className="inline-flex flex-col gap-0.5">
                  <span className="text-[9px] font-black uppercase tracking-[0.18em] text-red-600">{offerLabel}</span>
                  <span className="text-[10px] font-bold leading-none text-red-700">{offerValue}</span>
                </div>
              ) : (
                <p className="text-base font-black text-zinc-950">{formatMoney(Number(item.price) || 0)}</p>
              )}
            </div>

            {item.university ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200/70">
                <MapPin className="h-3 w-3" />
                <span className="max-w-[8.5rem] truncate">{item.university}</span>
              </span>
            ) : null}
          </div>

          <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500">
            {item.description || "Tap to open the full listing details."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Curated listing</span>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-2 text-[11px] font-bold text-white transition-transform duration-300 group-hover:translate-x-0.5">
            Open listing
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}
