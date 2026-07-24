import { ArrowRight } from "lucide-react";

import { EXPLORE_PATH, navigateToListingDetails, navigateToPath } from "../../lib/appNavigation";
import { getOptimizedImageUrl } from "../../lib/imageUrl";
import type { ListingStripVariant, SectionListing } from "../../home/home.types";

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

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
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
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-900 hover:bg-zinc-50 sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold sm:normal-case sm:tracking-normal"
        >
          <span className="sm:hidden">All</span>
          <span className="hidden sm:inline">Browse all</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {loading ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            Loading listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            No listings yet
          </div>
        ) : (
          listings.slice(0, maxItems).map((item) => {
            const imageSrc = getOptimizedImageUrl(item.photos?.[0], 540) || `https://picsum.photos/seed/${item.id}/480/360`;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToListingDetails(item.id)}
                className="group w-[220px] shrink-0 snap-start overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md sm:w-[260px]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                  <img
                    src={imageSrc}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                <div className="p-4">
                  <p className="text-sm font-extrabold text-zinc-900 line-clamp-1">{item.name}</p>
                  <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
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
