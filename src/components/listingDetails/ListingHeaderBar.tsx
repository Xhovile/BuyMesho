import { ChevronLeft } from "lucide-react";
import BrandMark from "../BrandMark";
import { EXPLORE_PATH, navigateBackOrPath, navigateToPath } from "../../lib/appNavigation";

type ListingHeaderBarProps = {
  subtitle?: string;
};

export default function ListingHeaderBar({ subtitle = "Listing details" }: ListingHeaderBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <BrandMark subtitle={subtitle} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="hidden rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:inline-flex"
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="rounded-2xl border border-zinc-900 bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            <span className="inline-flex items-center gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
