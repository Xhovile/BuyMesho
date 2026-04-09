import { ArrowRight } from "lucide-react";
import type { ElementType } from "react";
import { navigateToPath, EXPLORE_PATH } from "../../lib/appNavigation";
import ListingPreviewCard from "./ListingPreviewCard";

type Listing = {
  id: number | string;
  name: string;
  price: number | string;
};

type CategorySectionProps = {
  title: string;
  description: string;
  categoryKey: string;
  icon: ElementType;
  listings: Listing[];
  loading?: boolean;
};

export default function CategorySection({
  title,
  description,
  categoryKey,
  icon: Icon,
  listings,
  loading = false,
}: CategorySectionProps) {
  return (
    <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Featured section
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
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

      <div className="mt-5 grid grid-cols-2 gap-3">
        {loading ? (
          <p className="text-sm text-zinc-400">Loading...</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-zinc-400">No listings yet</p>
        ) : (
          listings.map((item) => (
            <ListingPreviewCard
              key={item.id}
              name={item.name}
              price={item.price}
              categoryKey={categoryKey}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => navigateToPath(`${EXPLORE_PATH}?category=${categoryKey}`)}
        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
      >
        View more
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
