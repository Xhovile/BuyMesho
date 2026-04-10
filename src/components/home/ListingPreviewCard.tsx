import { ArrowRight, MapPin } from "lucide-react";
import { navigateToExploreWithCategory } from "../../lib/appNavigation";

type HomePreviewListing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
};

type ListingPreviewCardProps = {
  item: HomePreviewListing;
  categoryKey: string;
};

export default function ListingPreviewCard({
  item,
  categoryKey,
}: ListingPreviewCardProps) {
  return (
    <button
      type="button"
      onClick={() => navigateToExploreWithCategory(categoryKey)}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
        <img
          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />

        <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-700 shadow-sm">
          {item.university || "Campus listing"}
        </div>
      </div>

      <div className="p-3">
        <p className="text-sm font-extrabold text-zinc-900 line-clamp-1">
          {item.name}
        </p>

        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-red-900">
            MWK {Number(item.price).toLocaleString()}
          </p>

          {item.university ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <MapPin className="w-3 h-3" />
              {item.university}
            </span>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
          {item.description || "Tap to open the category page."}
        </p>

        <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-900">
          View item <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
