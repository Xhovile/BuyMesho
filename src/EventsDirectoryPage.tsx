import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, MapPin, Ticket } from "lucide-react";

import { apiFetch } from "./lib/api";
import { EVENTS_PATH, EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";

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

function getPosterUrl(item: EventRecord) {
  const specValues = item.spec_values ?? {};
  const posterValue = specValues.poster_image_url || specValues.poster_url || specValues.poster;
  return typeof posterValue === "string" && posterValue.trim().length > 0 ? posterValue.trim() : "";
}

function getPosterAlt(item: EventRecord) {
  const specValues = item.spec_values ?? {};
  const posterAlt = item.poster_alt || specValues.poster_alt;
  if (typeof posterAlt === "string" && posterAlt.trim().length > 0) return posterAlt.trim();
  return `${item.event_type} poster for ${item.event_title}`;
}

function EventCard({ item }: { item: EventRecord }) {
  const price = formatMoney(item.ticket_price);
  const date = formatDate(item.event_date);
  const accent = posterAccent(item.event_type);
  const posterUrl = getPosterUrl(item);
  const posterAlt = getPosterAlt(item);

  return (
    <button
      type="button"
      onClick={() => navigateToPath(`${EVENTS_PATH}?event=${item.id}`)}
      className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white text-left shadow-[0_12px_30px_-24px_rgba(0,0,0,0.28)]"
    >
      <div className={`relative aspect-[4/3] bg-gradient-to-br ${accent}`}>
        {posterUrl ? <img src={posterUrl} alt={posterAlt} className="h-full w-full object-cover" loading="lazy" /> : null}
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-base font-black tracking-[-0.05em] leading-tight text-zinc-950">{item.event_title}</h3>

        <div className="mt-3 grid gap-2 text-xs text-zinc-600">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-red-900" />
            <span className="font-semibold text-zinc-700">{date}</span>
            <span className="text-zinc-300">•</span>
            <span>{item.start_time}</span>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-900" />
            <span className="leading-relaxed text-zinc-700 line-clamp-2">
              {item.venue}
              {item.location ? ` • ${item.location}` : ""}
            </span>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Ticket price</p>
            <p className="text-sm font-black tracking-tight text-zinc-950">{price}</p>
          </div>
        </div>
      </div>
    </button>
  );
}

function CategorySection({ title, items }: { title: string; items: EventRecord[] }) {
  return (
    <section className="pt-8">
      <div className="mb-5 border-t border-zinc-200 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Category</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">{title}</h2>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{items.length} events</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-flow-col md:grid-rows-2 md:auto-cols-[240px] md:gap-4 md:overflow-x-auto md:pb-2">
        {items.map((item) => (
          <EventCard key={item.id} item={item} />
        ))}
      </div>
    </section>
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

  const categories = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const item of events) {
      if (!item.event_type || seen.has(item.event_type)) continue;
      seen.add(item.event_type);
      ordered.push(item.event_type);
    }
    return ordered;
  }, [events]);

  const groupedCategories = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const item of events) {
      const list = map.get(item.event_type) || [];
      list.push(item);
      map.set(item.event_type, list);
    }
    return categories
      .map((category) => ({ title: category, items: map.get(category) || [] }))
      .filter((group) => group.items.length > 0);
  }, [events, categories]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
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
        <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:pt-8">
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

          {loading ? (
            <div className="flex items-center justify-center rounded-[2rem] border border-zinc-200 bg-white px-6 py-20 text-zinc-500 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)]">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-3 text-sm font-medium">Loading events...</span>
            </div>
          ) : groupedCategories.length > 0 ? (
            <>
              {groupedCategories.map((group) => (
                <CategorySection key={group.title} title={group.title} items={group.items} />
              ))}
            </>
          ) : (
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)] sm:p-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-900/15">
                <Ticket className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-zinc-950">No events yet</h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
                Start with the create form. Once an event is posted, it will show up here.
              </p>
              <button
                type="button"
                onClick={() => navigateToPath("/explore/events/create")}
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
