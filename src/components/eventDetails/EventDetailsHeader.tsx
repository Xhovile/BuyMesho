import FloatingCartButton from "../FloatingCartButton";
import { ChevronLeft, Ticket } from "lucide-react";

import { EVENTS_PATH, navigateBackOrPath } from "../../lib/appNavigation";

export default function EventDetailsHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <>
      <FloatingCartButton isLoggedIn={isLoggedIn} />
      <header className="buymesho-brand-header fixed inset-x-0 top-0 z-50 border-b border-bm-border bg-bm-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigateBackOrPath(EVENTS_PATH)} className="buymesho-header-brand flex min-w-0 items-center gap-3 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bm-brand text-bm-on-brand shadow-lg shadow-bm-brand/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-tight">
                <span className="text-bm-brand">Buy</span>
                <span className="text-bm-text-muted">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-bm-text-subtle">Event details</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateBackOrPath(EVENTS_PATH)}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold text-bm-text shadow-sm hover:bg-bm-surface-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </header>
    </>
  );
}
