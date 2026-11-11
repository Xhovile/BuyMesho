import { ChevronLeft } from "lucide-react";
import BrandMark from "../BrandMark";
import { EXPLORE_PATH, navigateBackOrPath, navigateToPath } from "../../lib/appNavigation";

function getDefaultSubtitle() {
  if (typeof window === "undefined") return "Listing details";
  return window.location.pathname === "/seller" ? "Seller Profile" : "Listing details";
}

type ListingHeaderBarProps = {
  subtitle?: string;
  backPath?: string;
  onBack?: () => void;
};

export default function ListingHeaderBar({ subtitle, backPath, onBack }: ListingHeaderBarProps) {
  const resolvedSubtitle = subtitle ?? getDefaultSubtitle();

  return (
    <header className="sticky top-0 z-40 border-b border-bm-border/80 bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <BrandMark subtitle={resolvedSubtitle} />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="hidden rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted sm:inline-flex"
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => {
              if (onBack) onBack();
              else navigateBackOrPath(backPath ?? EXPLORE_PATH);
            }}
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
