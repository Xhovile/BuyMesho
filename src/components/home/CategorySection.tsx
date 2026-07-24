import { ArrowRight } from "lucide-react";
import { type ElementType, type FC, useEffect, useRef, useState } from "react";
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

const INITIAL_VISIBLE_COUNT_MOBILE = 2;
const INITIAL_VISIBLE_COUNT_DESKTOP = 4;
const LOAD_MORE_COUNT = 4;

function PreviewSkeleton() {
  return (
    <div className="snap-start shrink-0 w-[174px] sm:w-[260px] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="aspect-[4/3] bg-zinc-100 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-3 w-full rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-3 w-5/6 rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-4 w-24 rounded-full bg-zinc-100 animate-pulse" />
      </div>
    </div>
  );
}

const CategorySection: FC<CategorySectionProps> = ({
  title,
  description,
  categoryKey,
  icon: Icon,
  listings,
  loading = false,
}) => {
  const [visibleCount, setVisibleCount] = useState(
    () => (typeof window !== "undefined" && window.innerWidth < 640 ? INITIAL_VISIBLE_COUNT_MOBILE : INITIAL_VISIBLE_COUNT_DESKTOP)
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(
      typeof window !== "undefined" && window.innerWidth < 640
        ? INITIAL_VISIBLE_COUNT_MOBILE
        : INITIAL_VISIBLE_COUNT_DESKTOP,
    );
  }, [categoryKey]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    if (visibleCount >= listings.length) return;

    const target = sentinelRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setVisibleCount((current) => Math.min(listings.length, current + LOAD_MORE_COUNT));
      },
      { root: null, rootMargin: "0px 160px 0px 0px", threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [listings.length, visibleCount]);

  const liveCount = listings.length;
  const liveLabel = loading
    ? "Loading live listings"
    : liveCount > 0
      ? `${liveCount} live listing${liveCount === 1 ? "" : "s"}`
      : "No listings yet";

  const visibleListings = listings.slice(0, visibleCount);

  return (
    <div className="group relative overflow-hidden rounded-[1.65rem] border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-3 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-900 via-red-700 to-amber-300 opacity-70" />

      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-[1rem] font-black tracking-tight text-zinc-950 sm:text-2xl">
            {title}
          </h3>
          <p className="mt-1.5 hidden text-sm leading-relaxed text-zinc-500 sm:block">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 sm:h-11 sm:w-11 flex-shrink-0 items-center justify-center rounded-[0.95rem] bg-zinc-950 text-white shadow-lg shadow-zinc-900/15 transition-transform duration-300 group-hover:scale-105">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-zinc-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white sm:mt-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
        {liveLabel}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory sm:mt-4 sm:gap-3">
        {loading ? (
          <>
            <PreviewSkeleton />
            <PreviewSkeleton />
          </>
        ) : listings.length === 0 ? (
          <p className="text-sm text-zinc-400">No listings yet</p>
        ) : (
          <>
            {visibleListings.map((item) => (
              <div
                key={item.id}
                className="snap-start shrink-0 w-[174px] sm:w-[260px]"
              >
                <ListingPreviewCard item={item} />
              </div>
            ))}

            {visibleCount < listings.length ? (
              <div
                ref={sentinelRef}
                className="snap-start shrink-0 w-[174px] sm:w-[260px] rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-3 text-left text-xs font-semibold text-zinc-500 sm:p-4"
              >
                Scroll to load more
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => navigateToExploreWithCategory(categoryKey)}
              className="snap-start shrink-0 w-[174px] sm:w-[260px] rounded-2xl border border-zinc-200 bg-white/90 p-3 text-left shadow-sm transition-colors hover:bg-zinc-50"
            >
              <div className="flex h-full min-h-[168px] sm:min-h-[220px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 text-center">
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
