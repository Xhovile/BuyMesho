import { ArrowRight } from "lucide-react";

import { EXPLORE_PATH, navigateToListingDetails, navigateToPath } from "../../lib/appNavigation";
import { getOptimizedImageUrl } from "../../lib/imageUrl";
import ListingImage from "../ListingImage";
import type { ListingStripVariant, SectionListing } from "../../home/home.types";

function ListingCardSkeleton() {
  return (
    <div className="w-[220px] shrink-0 snap-start bg-transparent sm:w-[260px]">
      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-zinc-100" />
      <div className="space-y-3 px-1 py-4">
        <div className="h-4 w-3/4 rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-3 w-full rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-3 w-5/6 rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-4 w-24 rounded-full bg-zinc-100 animate-pulse" />
        <div className="h-3 w-20 rounded-full bg-zinc-100 animate-pulse" />
      </div>
    </div>
  );
}

export default function ListingStrip({
  title,
  description,
  listings,
  loading,
  maxItems = 8,
  variant = "featured",
  viewMorePath = EXPLORE_PATH,
}: {
  title: string;
  description: string;
  listings: SectionListing[];
  loading: boolean;
  maxItems?: number;
  variant?: ListingStripVariant;
  viewMorePath?: string;
}) {
  const isFeatured = variant === "featured";
  const skeletonCount = typeof window !== "undefined" && window.innerWidth >= 640 ? 4 : 2;

  return (
    <section className="mx-[-1rem] w-[calc(100%+2rem)] rounded-none border-x-0 border-y border-zinc-200 bg-white px-4 py-6 shadow-sm sm:mx-0 sm:w-auto sm:rounded-[2rem] sm:border sm:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
            {title}
          </h2>
          {isFeatured ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigateToPath(viewMorePath)}
          className="inline-flex items-center gap-2 rounded-2xl border border-red-950/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-900 shadow-sm shadow-zinc-900/10 transition-all hover:-translate-y-0.5 hover:border-red-900/25 hover:shadow-md sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold sm:normal-case sm:tracking-normal"
        >
          <span className="sm:hidden">All</span>
          <span className="hidden sm:inline">Browse all</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {loading ? (
          Array.from({ length: skeletonCount }).map((_, index) => <ListingCardSkeleton key={index} />)
        ) : listings.length === 0 ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            No listings yet
          </div>
        ) : (
          listings.slice(0, maxItems).map((item) => {
            const imageSrc = getOptimizedImageUrl(item.photos?.[0], 420);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToListingDetails(item.id)}
                className="group flex w-[220px] shrink-0 snap-start flex-col bg-transparent text-left sm:w-[260px]"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
                  <ListingImage
                    src={imageSrc}
                    alt={item.name}
                    category={item.category}
                  />
                </div>

                <div className="px-1 py-4">
                  <p className="line-clamp-1 text-sm font-extrabold text-zinc-900">{item.name}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
                    {item.description || item.university || "Tap to open the full listing details."}
                  </p>
                  <p className="mt-2 text-sm font-bold text-red-900">
                    MWK {Number(item.price).toLocaleString()}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-900">
                    Open listing <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
