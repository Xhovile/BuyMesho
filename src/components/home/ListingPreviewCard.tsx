import { ArrowRight, MapPin } from "lucide-react";
import { navigateToListingDetails } from "../../lib/appNavigation";

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

export default function ListingPreviewCard({ item }: ListingPreviewCardProps) {
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

      <div className="p-4 sm:p-5">
        <p className="text-base sm:text-[1.05rem] font-extrabold text-zinc-900 line-clamp-1">
          {item.name}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-base font-bold text-red-900">
            MWK {Number(item.price).toLocaleString()}
          </p>

          {item.university ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <MapPin className="w-3 h-3" />
              {item.university}
            </span>
          ) : null}
        </div>

        <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-900">
          Open listing <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
