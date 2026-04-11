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
  category?: string;
  university?: string;
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
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-xl font-black tracking-tight text-zinc-900">
            {title}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            {description}
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-red-900/5 text-red-900 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-zinc-400">No listings yet</p>
        ) : (
          listings.slice(0, 10).map((item) => (
            <div key={item.id} className="snap-start shrink-0 w-[220px] sm:w-[260px]">
              <ListingPreviewCard item={item} />
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => navigateToExploreWithCategory(categoryKey)}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
      >
        View more
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CategorySection;
