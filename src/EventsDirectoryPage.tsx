import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, MapPin, Search, Ticket } from "lucide-react";

import { API_CACHE_TTL_MS, isCachedApiResponseFresh, readCachedApiJson } from "./lib/apiCache";
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

const EVENTS_API_URL = "/api/events";
const SHARED_API_CACHE_PREFIX = "__buymesho_api_cache_v2:";

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

function matchesSearch(item: EventRecord, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [item.event_title, item.event_type, item.organizer_name, item.venue, item.location, item.description]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function getCacheKey(url: string) {
  return `${SHARED_API_CACHE_PREFIX}${url}`;
}

function writeCachedApiJson(url: string, body: unknown, response: Response) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getCacheKey(url),
      JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        headers: Array.from(response.headers.entries()),
        body: JSON.stringify(body),
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignore cache write failures.
  }
}

function readEventsSnapshot() {
  const cached = readCachedApiJson<{ items?: EventRecord[] }>(EVENTS_API_URL);
  return {
    hasCache: cached !== null,
    items: Array.isArray(cached?.items) ? cached.items : [],
  };
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

function CategoryStrip({ title, items }: { title: string; items: EventRecord[] }) {
  const desktopRowCountClass = items.length === 1 ? "md:grid-rows-1" : "md:grid-rows-2";

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8">
      <div className="mb-5 border-t border-zinc-200 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Category</p>
            <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">{title}</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{items.length} events</p>
        </div>
      </div>

      <div className={`grid grid-flow-col grid-rows-1 auto-cols-[220px] gap-4 overflow-x-auto pb-2 pr-4 ${desktopRowCountClass} md:auto-cols-[260px]`}>
        {items.map((item) => (
          <EventCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function AllListingsPanel({ items }: { items: EventRecord[] }) {
  return (
    <section className="pt-8">
      <div className="mb-5 border-t border-zinc-200 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">All listings</p>
            <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">Every event in one panel</h3>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">{items.length} events</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <EventCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export default function EventsDirectoryPage() {
  const initialSnapshot = readEventsSnapshot();
  const [events, setEvents] = useState<EventRecord[]>(() => initialSnapshot.items);
  const [loading, setLoading] = useState(() => !initialSnapshot.hasCache);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All categories");
  const [viewAll, setViewAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      const cachedSnapshot = readEventsSnapshot();
      if (cachedSnapshot.hasCache) {
        setEvents(cachedSnapshot.items);
      }

      const shouldRefresh = !isCachedApiResponseFresh(EVENTS_API_URL, API_CACHE_TTL_MS);
      if (!shouldRefresh) {
        setLoading(false);
        setError(null);
        return;
      }

      if (!cachedSnapshot.hasCache) {
        setLoading(true);
      } else {
        setLoading(false);
      }

      setError(null);

      try {
        const response = await fetch(EVENTS_API_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as { items?: EventRecord[] };
        if (controller.signal.aborted) return;

        const items = Array.isArray(data.items) ? data.items : [];
        setEvents(items);
        setError(null);
        writeCachedApiJson(EVENTS_API_URL, { items }, response);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (!cachedSnapshot.hasCache) {
          setError(err instanceof Error ? err.message : "Could not load events.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      controller.abort();
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

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const categoryMatches = selectedCategory === "All categories" ? true : item.event_type === selectedCategory;
      return categoryMatches && matchesSearch(item, searchTerm);
    });
  }, [events, searchTerm, selectedCategory]);

  const groupedCategories = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const item of filteredEvents) {
      const list = map.get(item.event_type) || [];
      list.push(item);
      map.set(item.event_type, list);
    }
    return categories
      .map((category) => ({ title: category, items: map.get(category) || [] }))
      .filter((group) => group.items.length > 0);
  }, [filteredEvents, categories]);

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
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:pt-10">
          <div className="rounded-[2.25rem] bg-white px-5 py-8 text-zinc-900 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.28)] sm:px-8 sm:py-10 lg:px-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Events directory</p>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-[-0.06em] leading-[0.92] sm:text-5xl lg:text-6xl">Browse events and happenings.</h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">Don't miss!</p>
              </div>

              <div className="flex flex-wrap gap-3 sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigateToPath("/explore/events/create")}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-black/10 hover:bg-zinc-800"
                >
                  Create Event
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white px-4 py-4 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)] sm:px-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-zinc-900">
                <Search className="h-4 w-4 shrink-0 text-zinc-400" />
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, place, host, or description"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Category</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-900 outline-none focus:border-zinc-900"
                >
                  <option>All categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>

        {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

        {!loading && groupedCategories.length > 0 ? (
          <div className="mx-auto mt-2 flex max-w-7xl items-center justify-between gap-4 px-4">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
              {viewAll ? "All listings" : "Category display"}
            </p>
            <button
              type="button"
              onClick={() => setViewAll((current) => !current)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-extrabold shadow-lg shadow-black/10 transition-colors ${
                viewAll ? "bg-zinc-950 text-white hover:bg-zinc-800" : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              {viewAll ? "Show Categories" : "View All"}
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center justify-center rounded-[2rem] border border-zinc-200 bg-white px-6 py-20 text-zinc-500 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.18)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-3 text-sm font-medium">Loading events...</span>
          </div>
        ) : groupedCategories.length > 0 ? (
          <>
            {viewAll ? (
              <section className="mx-auto max-w-7xl px-4 pb-10">
                <AllListingsPanel items={filteredEvents} />
              </section>
            ) : (
              groupedCategories.map((group) => <CategoryStrip key={group.title} title={group.title} items={group.items} />)
            )}
          </>
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
              onClick={() => navigateToPath("/explore/events/create")}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Create an event
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
