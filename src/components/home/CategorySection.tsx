import { ArrowRight } from "lucide-react";
import { type ElementType, type FC } from "react";
import { navigateToExploreWithCategory } from "../../lib/appNavigation";
import ListingPreviewCard from "./ListingPreviewCard";

type Listing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
};

type CategorySectionProps = {
  title: string;
  description: string;
  categoryKey: string;
  icon: ElementType;
  listings: Listing[];
  loading?: boolean;
};

const CategorySection: FC<CategorySectionProps> = ({
  title,
  description,
  categoryKey,
  icon: Icon,
  listings,
  loading = false,
}) => {
  const liveCount = listings.length;
  const liveLabel = loading
    ? "Loading live listings"
    : liveCount > 0
      ? `${liveCount} live listing${liveCount === 1 ? "" : "s"}`
      : "No listings yet";

  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-4 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-900 via-red-700 to-amber-300 opacity-70" />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-black tracking-tight text-zinc-950 sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 hidden text-sm leading-relaxed text-zinc-500 sm:block">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[1.1rem] bg-zinc-950 text-white shadow-lg shadow-zinc-900/15 transition-transform duration-300 group-hover:scale-105">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
        {liveLabel}
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-zinc-400">No listings yet</p>
        ) : (
          <>
            {listings.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="snap-start shrink-0 w-[220px] sm:w-[260px]"
              >
                <ListingPreviewCard item={item} />
              </div>
            ))}
            <button
              type="button"
              onClick={() => navigateToExploreWithCategory(categoryKey)}
              className="snap-start shrink-0 w-[220px] sm:w-[260px] rounded-2xl border border-zinc-200 bg-white/90 p-4 text-left shadow-sm transition-colors hover:bg-zinc-50"
            >
              <div className="flex h-full min-h-[220px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 text-center">
                <span className="inline-flex items-center gap-2 text-sm font-extrabold text-zinc-900">
                  View more listings
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => navigateToExploreWithCategory(categoryKey)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
      >
        View more
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CategorySection;
