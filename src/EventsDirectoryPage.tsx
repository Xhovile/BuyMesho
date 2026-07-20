import { CalendarDays, ChevronRight, MapPinned, Ticket, Zap } from "lucide-react";

import { navigateToPath, HOME_PATH, EXPLORE_PATH } from "./lib/appNavigation";
import { getEventItemTypes } from "./eventSchemas";

const eventTypeCopy: Record<string, { blurb: string; badge: string }> = {
  Concert: { blurb: "Live performances, artists, and music nights.", badge: "Tickets" },
  Sports: { blurb: "Matches, tournaments, and competition days.", badge: "Game day" },
  Conference: { blurb: "Talks, panels, and serious event programming.", badge: "Agenda" },
  Workshop: { blurb: "Skill-building sessions with practical outcomes.", badge: "Learn" },
  Party: { blurb: "Social gatherings, celebrations, and nightlife.", badge: "Vibe" },
  "Church Event": { blurb: "Worship, revival, prayer, and fellowship events.", badge: "Faith" },
  "Campus Event": { blurb: "Student-led programs, club activities, and campus moments.", badge: "Campus" },
  Other: { blurb: "Anything that does not fit the main buckets yet.", badge: "Custom" },
};

export default function EventsDirectoryPage() {
  const eventTypes = getEventItemTypes();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-900 text-white shadow-lg shadow-red-900/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Events</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Back to Market
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:pt-10">
          <div className="overflow-hidden rounded-[2.25rem] bg-zinc-950 px-5 py-8 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)] sm:px-8 sm:py-10 lg:px-10">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-200/80">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Event Tickets & Happenings</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Separate from Market All</span>
            </div>

            <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Events directory</p>
                <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-[-0.06em] leading-[0.92] sm:text-5xl lg:text-6xl">
                  Find the right event type fast.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                  BuyMesho Events is built as a separate directory so event listings can stay structured by type, not buried inside the main market feed.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { value: "8", label: "event types" },
                  { value: "1", label: "schema family" },
                  { value: "0", label: "market clutter" },
                  { value: "Fast", label: "browse flow" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm">
                    <p className="text-2xl font-black tracking-tight text-white">{stat.value}</p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-2 sm:py-4">
          <div className="flex items-end justify-between gap-4 pb-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Browse event types</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950 sm:text-4xl">Choose a category</h2>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-500 shadow-sm sm:flex">
              <CalendarDays className="h-4 w-4 text-red-900" />
              Structured by schema
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {eventTypes.map((itemType) => {
              const copy = eventTypeCopy[itemType] ?? { blurb: "Custom event type and details.", badge: "Event" };
              return (
                <article key={itemType} className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.18)]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{copy.badge}</p>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-zinc-950">{itemType}</h3>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-900/15">
                      <Zap className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">{copy.blurb}</p>

                  <div className="mt-5 rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Schema-driven</p>
                    <p className="mt-2 text-sm font-medium text-zinc-700">
                      Separate fields for title, date, venue, organizer, ticket mode, and the type-specific details.
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 pt-10">
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                title: "Homepage panel",
                text: "Feature event tickets and happenings on the home page without mixing them into All.",
              },
              {
                title: "Event directory",
                text: "Use this page as the separate browsing hub for all event schemas and future listings.",
              },
              {
                title: "Event card rules",
                text: "Once listings exist, cards should show the event title, date, venue, ticket mode, and price.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.18)]">
                <p className="text-sm font-black tracking-tight text-zinc-950">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
