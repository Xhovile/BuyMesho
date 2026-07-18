import { ArrowRight } from "lucide-react";
import { navigateToListingDetails } from "../../lib/appNavigation";
import type { HomePreviewListing } from "../../hooks/useHomePageData";

type ListingPreviewCardProps = {
  item: HomePreviewListing;
};

function truncateWords(text: string, maxWords: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

export default function ListingPreviewCard({ item }: ListingPreviewCardProps) {
  const descriptionSource = item.description || item.category || "Tap to open the listing.";
  const description = truncateWords(descriptionSource, 12);

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
          {item.category ? (
            <span className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm backdrop-blur">
              {item.category}
            </span>
          ) : null}
          {item.university ? (
            <span className="rounded-full bg-white/92 px-3 py-1 text-[10px] font-semibold text-zinc-600 shadow-sm backdrop-blur">
              {item.university}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3 p-4 sm:p-5">
        <div className="space-y-1.5">
          <p className="line-clamp-1 text-[0.96rem] font-black tracking-tight text-zinc-950 sm:text-[1.05rem]">
            {item.name}
          </p>
          <p className="line-clamp-2 text-sm leading-relaxed text-zinc-500">
            {description}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Price</p>
            <p className="mt-0.5 text-base font-black text-zinc-950">MWK {Number(item.price).toLocaleString()}</p>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-2 text-[11px] font-bold text-white transition-transform duration-300 group-hover:translate-x-0.5">
            Open listing
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}
