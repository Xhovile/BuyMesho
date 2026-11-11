import { ChevronLeft, Loader2 } from "lucide-react";
import { EXPLORE_PATH, navigateBackOrPath } from "../../lib/appNavigation";

export default function ListingStatusPanel({
  loading,
  hasListing,
  onRetry,
}: {
  loading: boolean;
  hasListing: boolean;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-bm-border bg-bm-surface p-10 text-bm-text-subtle shadow-sm">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading listing details...
      </div>
    );
  }

  if (!hasListing) {
    return (
      <div className="rounded-[2rem] border border-bm-border bg-bm-surface p-10 text-center shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-bm-text">Listing not found</h1>
        <p className="mt-3 text-sm text-bm-text-subtle">This listing could not be loaded or may no longer be available.</p>
        <button
          type="button"
          onClick={onRetry || (() => navigateBackOrPath(EXPLORE_PATH))}
          className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface px-5 py-3 text-sm font-extrabold text-bm-text hover:bg-bm-surface-subtle"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    );
  }

  return null;
}
