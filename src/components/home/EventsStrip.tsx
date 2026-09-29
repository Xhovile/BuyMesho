import { ArrowRight } from "lucide-react";

import { EVENTS_PATH, navigateToPath } from "../../lib/appNavigation";
import type { HomeEventPreview } from "../../home/home.types";
import { EventCard } from "../events/EventCard";

function EventCardSkeleton() {
  return (
    <div className="w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200/90 shadow-sm sm:w-[260px]">
      <div className="aspect-[4/3] animate-pulse rounded-2xl bg-zinc-100" />
      <div className="pt-3">
        <div className="mx-0 h-4 w-3/4 animate-pulse rounded-full bg-zinc-100" />
        <div className="mt-3 grid gap-2">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-zinc-100" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-zinc-100" />
        </div>
        <div className="mt-3 h-10 w-full animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}

export default function EventsStrip({
  events,
  loading,
  viewMorePath = EVENTS_PATH,
}: {
  events: HomeEventPreview[];
  loading: boolean;
  viewMorePath?: string;
}) {
  const skeletonCount = typeof window !== "undefined" && window.innerWidth >= 640 ? 4 : 2;

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-y border-zinc-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="relative overflow-hidden rounded-[1.75rem] border border-red-950/10 bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,0.14),transparent_35%),linear-gradient(135deg,rgba(24,24,27,1)_0%,rgba(39,39,42,1)_50%,rgba(255,255,255,1)_120%)] px-5 py-6 text-white sm:px-6 sm:py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-200/80">Live on BuyMesho</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">What is happening now.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                See campus launches, workshops, parties, sports, and student moments before they fill up.
              </p>
            </div>

            <a
              href={viewMorePath}
              onClick={(event) => {
                event.preventDefault();
                navigateToPath(viewMorePath);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-950/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-900 shadow-sm shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-red-900/25 hover:bg-zinc-50 hover:shadow-md sm:px-4 sm:py-2.5 sm:text-sm sm:font-bold sm:normal-case sm:tracking-normal"
            >
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">Open Events</span>
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-6 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {loading ? (
            Array.from({ length: skeletonCount }).map((_, index) => <EventCardSkeleton key={index} />)
          ) : events.length === 0 ? (
            <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">No events yet</div>
          ) : (
            events.map((item) => (
              <div key={item.id} className="w-[220px] shrink-0 snap-start sm:w-[260px]">
                <EventCard item={item} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
