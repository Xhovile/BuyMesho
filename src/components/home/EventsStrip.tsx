import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";

import { EVENTS_PATH, navigateToPath } from "../../lib/appNavigation";
import type { HomeEventPreview } from "../../home/home.types";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) return "Free";
  return `MK ${value.toLocaleString()}`;
}

function formatDate(value: string) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function posterAccent(eventType: string) {
  switch (eventType) {
    case "Concert":
      return "from-red-900 via-zinc-950 to-black";
    case "Sports":
      return "from-emerald-800 via-zinc-950 to-black";
    case "Conference":
      return "from-indigo-900 via-zinc-950 to-black";
    case "Workshop":
      return "from-amber-700 via-zinc-950 to-black";
    case "Party":
      return "from-fuchsia-800 via-zinc-950 to-black";
    case "Church Event":
      return "from-sky-800 via-zinc-950 to-black";
    case "Campus Event":
      return "from-rose-800 via-zinc-950 to-black";
    default:
      return "from-zinc-800 via-zinc-950 to-black";
  }
}

function getPosterUrl(item: HomeEventPreview) {
  const specValues = item.spec_values ?? {};
  const posterValue = specValues.poster_image_url || specValues.poster_url || specValues.poster;
  return typeof posterValue === "string" && posterValue.trim().length > 0 ? posterValue.trim() : "";
}

function getPosterAlt(item: HomeEventPreview) {
  const specValues = item.spec_values ?? {};
  const posterAlt = item.poster_alt || specValues.poster_alt;
  if (typeof posterAlt === "string" && posterAlt.trim().length > 0) return posterAlt.trim();
  return `${item.event_type} poster for ${item.event_title}`;
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
  return (
    <section className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-red-950/10 bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,0.14),transparent_35%),linear-gradient(135deg,rgba(24,24,27,1)_0%,rgba(39,39,42,1)_50%,rgba(255,255,255,1)_120%)] px-5 py-6 text-white sm:px-6 sm:py-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-200/80">
              Live on BuyMesho
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white sm:text-3xl">
              What is happening now.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
              See campus launches, workshops, parties, sports, and student moments before they fill up.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigateToPath(viewMorePath)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-950 shadow-lg shadow-black/10 hover:bg-zinc-100 sm:px-4 sm:py-2.5 sm:text-sm sm:font-extrabold sm:normal-case sm:tracking-normal"
          >
            <span className="sm:hidden">All</span>
            <span className="hidden sm:inline">Open Events</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {loading ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            No events yet
          </div>
        ) : (
          events.map((item) => {
            const price = formatMoney(item.ticket_price);
            const date = formatDate(item.event_date);
            const accent = posterAccent(item.event_type);
            const posterUrl = getPosterUrl(item);
            const posterAlt = getPosterAlt(item);
            const snippet =
              item.description.length > 88 ? `${item.description.slice(0, 88).trim()}…` : item.description;

            return (
              <article
                key={item.id}
                className="group w-[220px] shrink-0 snap-start overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md sm:w-[260px]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
                  <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
                  {posterUrl ? (
                    <img
                      src={posterUrl}
                      alt={posterAlt}
                      className="relative h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 py-4">
                    <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                      {item.event_type}
                    </span>
                    <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white backdrop-blur-sm">
                      {item.ticket_mode}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 py-4 text-white">
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/75">
                        Featured event
                      </p>
                      <h3 className="mt-2 max-w-[12rem] truncate text-xl font-black tracking-[-0.05em] leading-none">
                        {item.event_title}
                      </h3>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/12 backdrop-blur-sm">
                      <Ticket className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm leading-relaxed text-zinc-600 line-clamp-2">{snippet}</p>

                  <div className="mt-4 grid gap-2 text-sm text-zinc-600">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-red-900" />
                      <span className="font-medium text-zinc-700">{date}</span>
                      <span className="text-zinc-300">•</span>
                      <span>{item.start_time}</span>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900" />
                      <span className="leading-relaxed text-zinc-700 line-clamp-2">
                        {item.venue}
                        {item.location ? ` • ${item.location}` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                        Ticket price
                      </p>
                      <p className="mt-1 text-sm font-black tracking-tight text-zinc-950">{price}</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                        Posted by
                      </p>
                      <p className="mt-1 truncate text-sm font-bold text-zinc-700">{item.organizer_name}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
