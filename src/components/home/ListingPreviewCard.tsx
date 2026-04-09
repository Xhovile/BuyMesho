import { ArrowRight } from "lucide-react";
import { navigateToPath } from "../../lib/appNavigation";
import { EXPLORE_PATH } from "../../lib/appNavigation";

type ListingPreviewCardProps = {
  id: number | string;
  name: string;
  price: number | string;
  categoryKey: string;
};

export default function ListingPreviewCard({
  id,
  name,
  price,
  categoryKey,
}: ListingPreviewCardProps) {
  return (
    <button
      type="button"
      onClick={() => navigateToPath(`${EXPLORE_PATH}?category=${categoryKey}`)}
      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 text-left hover:bg-zinc-100 transition-colors"
    >
      <p className="text-sm font-bold text-zinc-800 truncate">{name}</p>
      <p className="text-xs text-zinc-500 mt-1">MWK {price}</p>
      <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-900">
        View item <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </button>
  );
}
