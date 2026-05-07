import { ChevronLeft } from "lucide-react";
import { EXPLORE_PATH, HOME_PATH, SETTINGS_PATH, navigateBackOrPath, navigateToPath } from "../../lib/appNavigation";

export default function ListingHeaderBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-900 text-xl font-extrabold text-white shadow-lg shadow-red-900/20">B</div>
          <div className="text-left">
            <p className="text-lg font-extrabold tracking-tight">
              <span className="text-red-900">Buy</span>
              <span className="text-zinc-700">Mesho</span>
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Listing details</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateToPath(SETTINGS_PATH)}
            className="hidden rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:inline-flex"
          >
            Settings
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
