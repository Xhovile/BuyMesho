import { ArrowRight } from "lucide-react";
import { navigateToListingDetails } from "../../lib/appNavigation";
import { getOptimizedImageUrl } from "../../lib/imageUrl";
import ListingImage from "../ListingImage";
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
  const description = truncateWords(descriptionSource, 8);
  const imageSrc = getOptimizedImageUrl(item.photos?.[0], 480);

  return (
    <button
      type="button"
      onClick={() => navigateToListingDetails(item.id)}
      className="group flex h-full w-full flex-col bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100">
        <ListingImage
          src={imageSrc}
          alt={item.name}
          category={item.category}
        />
      </div>

      <div className="px-1 py-3">
        <p className="line-clamp-1 text-sm font-extrabold text-zinc-900">
          {item.name}
        </p>

        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-500">
          {item.description || description}
        </p>

        <p className="mt-3 text-base font-bold text-red-900">
          MWK {Number(item.price).toLocaleString()}
        </p>

        <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-900">
          Open listing <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}
