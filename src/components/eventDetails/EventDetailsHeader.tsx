import FloatingCartButton from "../FloatingCartButton";
import { ChevronLeft, Ticket } from "lucide-react";

import { EVENTS_PATH, navigateBackOrPath } from "../../lib/appNavigation";

export default function EventDetailsHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <FloatingCartButton isLoggedIn={isLoggedIn} />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigateBackOrPath(EVENTS_PATH)} className="flex min-w-0 items-center gap-3 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-900 text-white shadow-lg shadow-red-900/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Event details</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateBackOrPath(EVENTS_PATH)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>
    </>
  );
}
