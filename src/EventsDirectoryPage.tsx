import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, MapPin, Ticket } from "lucide-react";

import { apiFetch } from "./lib/api";
import { EVENTS_CREATE_PATH, EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";

type EventRecord = {
  id: number;
  creator_uid: string | null;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_mode: string;
  ticket_price: number | null;
  ticket_link: string | null;
  description: string;
  contact_whatsapp: string | null;
  poster_alt: string | null;
  spec_values: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
};

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

function EventCard({ item }: { item: EventRecord }) {
  const price = formatMoney(item.ticket_price);
  const date = formatDate(item.event_date);
  const accent = posterAccent(item.event_type);
  const snippet = item.description.length > 110 ? `${item.description.slice(0, 110).trim()}…` : item.description;

  return (
    <article className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.22)] transition-transform duration-200 hover:-translate-y-0.5">
      <div className={`relative min-h-[12rem] bg-gradient-to-br ${accent} px-5 py-5 text-white`}>
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/85">
            {item.event_type}
          </span>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/85">
            {item.ticket_mode}
          </span>
        </div>

        <div className="mt-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-red-100/80">Organizer</p>
            <h3 className="mt-2 max-w-[16rem] text-3xl font-black tracking-[-0.06em] leading-[0.92]">
              {item.event_title}
            </h3>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Ticket className="h-5 w-5" />
          </div>
        </div>

        <p className="mt-4 max-w-[24rem] text-sm leading-relaxed text-white/80">
          {snippet}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 text-sm text-zinc-600">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-red-900" />
            <span className="font-medium text-zinc-700">{date}</span>
            <span className="text-zinc-300">•</span>
            <span>{item.start_time}</span>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-900" />
            <span className="leading-relaxed text-zinc-700">
              {item.venue}{item.location ? ` • ${item.location}` : ""}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Ticket price</p>
              <p className="mt-1 text-base font-black tracking-tight text-zinc-950">{price}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Posted by</p>
              <p className="mt-1 text-sm font-bold text-zinc-700">{item.organizer_name}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-extrabold text-white opacity-70"
          >
            Details soon
            <ArrowRight className="h-4 w-4" />
          </button>
          {item.ticket_link ? (
            <a
              href={item.ticket_link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Ticket link
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function EventsDirectoryPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        setLoading(true);
        const response = (await apiFetch("/api/events")) as { items?: EventRecord[] };
        if (!active) return;
        setEvents(Array.isArray(response?.items) ? response.items : []);
        setError(null);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message || "Could not load events.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
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
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:pt-10">
          <div className="rounded-[2.25rem] bg-zinc-950 px-5 py-8 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.5)] sm:px-8 sm:py-10 lg:px-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Events directory</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-[-0.06em] leading-[0.92] sm:text-5xl lg:text-6xl">
                  Browse events and happenings.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                  Don&apos;t miss!
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
                className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-lg shadow-black/10 hover:bg-zinc-100"
              >
                Create Event
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-4">
          <div className="flex items-end justify-between gap-4 pb-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Latest events</p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950 sm:text-4xl">Saved event listings</h2>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center rounded-[2rem] border border-zinc-200 bg-white px-6 py-20 text-zinc-500 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-3 text-sm font-medium">Loading events...</span>
            </div>
          ) : events.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {events.map((item) => (
                <EventCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)] sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-900/15">
                <Ticket className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-zinc-950">No events yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
                Start with the create form. Once an event is posted, it will show up here as a saved card.
              </p>
              <button
                type="button"
                onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
              >
                Create an event
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
