import { ArrowRight } from "lucide-react";
import { navigateToListingDetails } from "../../lib/appNavigation";

type HomePreviewListing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
};

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
      </div>

      <div className="p-4">
        <p className="text-sm font-extrabold text-zinc-900 line-clamp-1">
          {item.name}
        </p>

        <p className="mt-2 text-sm text-zinc-500 leading-relaxed line-clamp-2">
          {item.description || "Tap to open the full listing details."}
        </p>

        <p className="mt-3 text-base font-bold text-red-900">
          MWK {Number(item.price).toLocaleString()}
        </p>

        <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-900">
          Open listing <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
