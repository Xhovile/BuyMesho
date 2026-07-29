import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import desktopHeroImage from "../photos/DesktopHero.webp";
import mobileHeroImage from "../photos/MobileHero.webp";

import FormDropdown from "./components/FormDropdown";
import FloatingCartButton from "./components/FloatingCartButton";
import Header from "./components/Header";
import AppFooter from "./components/AppFooter";
import { EventCard, type EventRecord } from "./components/events/EventCard";
import { API_CACHE_TTL_MS, isCachedApiResponseFresh, readCachedApiJson } from "./lib/apiCache";
import {
  EVENTS_CREATE_PATH,
  EVENTS_MANAGE_PATH,
  getMarketChipFromLocation,
  navigateToCreateListing,
  navigateToMarketChip,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useAuthUser } from "./hooks/useAuthUser";
import { apiFetch } from "./lib/api";

const EVENTS_API_URL = "/api/events";
const EVENT_CREATOR_ACCESS_URL = "/api/event-creators/me";
const SHARED_API_CACHE_PREFIX = "__buymesho_api_cache_v2:";

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

function EventCardSkeleton() {
  return (
    <div className="w-[220px] shrink-0 snap-start overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm sm:w-[260px]">
      <div className="aspect-[4/3] animate-pulse bg-zinc-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-zinc-100" />
        <div className="grid gap-2 pt-1">
          <div className="h-3 w-2/3 animate-pulse rounded-full bg-zinc-100" />
          <div className="h-3 w-1/2 animate-pulse rounded-full bg-zinc-100" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    </div>
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

function EventsLoadingStrip() {
  const skeletonCount = typeof window !== "undefined" && window.innerWidth >= 640 ? 4 : 2;

  return (
    <div className="pb-12">
      <section className="pt-8">
        <div className="mb-5 border-t border-zinc-200 pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Category</p>
              <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-zinc-950">Loading events</h3>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Preparing cards</p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <EventCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </div>
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
  const [canCreateEvents, setCanCreateEvents] = useState(false);
  const [creatorAccessLoading, setCreatorAccessLoading] = useState(true);
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);

  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const { profile: userProfile } = useAccountProfile();
  const activeChip = getMarketChipFromLocation(window.location);
  const showManageEventsButton = !!firebaseUser && (creatorAccessLoading || canCreateEvents);

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
        const data = await apiFetch(EVENTS_API_URL, { signal: controller.signal });
        if (controller.signal.aborted) return;

        const items = Array.isArray((data as { items?: EventRecord[] } | null)?.items)
          ? ((data as { items?: EventRecord[] }).items as EventRecord[])
          : [];
        setEvents(items);
        setError(null);
        writeCachedApiJson(EVENTS_API_URL, { items }, new Response(JSON.stringify({ items }), { status: 200 }));
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

  useEffect(() => {
    if (authLoading) return;

    let active = true;
    async function loadCreatorAccess() {
      if (!firebaseUser) {
        if (!active) return;
        setCanCreateEvents(false);
        setCreatorAccessLoading(false);
        return;
      }

      try {
        setCreatorAccessLoading(true);
        const data = (await apiFetch(EVENT_CREATOR_ACCESS_URL)) as { canCreateEvents?: boolean };
        if (!active) return;
        setCanCreateEvents(data?.canCreateEvents === true);
      } catch {
        if (!active) return;
        setCanCreateEvents(false);
      } finally {
        if (active) setCreatorAccessLoading(false);
      }
    }

    void loadCreatorAccess();
    return () => {
      active = false;
    };
  }, [authLoading, firebaseUser]);

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
      <FloatingCartButton isLoggedIn={!!firebaseUser} />
      <Header
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        onAddListing={navigateToCreateListing}
        onProfileClick={() => navigateToPath("/profile")}
        userProfile={userProfile}
        firebaseUser={firebaseUser}
        activeChip={activeChip}
        onChipChange={navigateToMarketChip}
      />

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-6 pt-0 sm:pt-0">
          <div className="relative -mx-4 overflow-hidden border-y border-white/10 bg-zinc-950/20 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.45)]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {!heroImageLoaded ? (
                <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
                  <div className="absolute inset-0 opacity-45">
                    <div className="absolute left-5 top-5 h-16 w-24 animate-pulse rounded-[1.5rem] bg-white/10" />
                    <div className="absolute right-6 top-6 h-24 w-24 animate-pulse rounded-[1.5rem] bg-white/10" />
                    <div className="absolute left-5 top-28 h-3 w-44 animate-pulse rounded-full bg-white/10" />
                    <div className="absolute left-5 top-36 h-3 w-60 animate-pulse rounded-full bg-white/10" />
                  </div>
                </div>
              ) : null}

              <div className={`absolute inset-0 transition-opacity duration-500 ${heroImageLoaded ? "opacity-100" : "opacity-0"}`}>
                <picture>
                  <source media="(min-width: 640px)" srcSet={desktopHeroImage} />
                  <img
                    src={mobileHeroImage}
                    alt=""
                    className="h-full w-full object-cover object-center"
                    onLoad={() => setHeroImageLoaded(true)}
                    onError={() => setHeroImageLoaded(false)}
                  />
                </picture>
              </div>

              <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/68 to-black/42" />
              <div className="absolute -right-16 top-10 h-52 w-52 rounded-full bg-white/10 blur-3xl sm:h-64 sm:w-64" />
            </div>

            <div className="relative z-10 space-y-6 px-5 py-8 sm:px-8 sm:py-10 lg:px-10">
              <div className="rounded-[2.25rem] border border-white/10 bg-white/6 px-5 py-8 text-white shadow-[0_30px_80px_-40px_rgba(0,0,0,0.4)] backdrop-blur-md sm:px-8 sm:py-10 lg:px-10">
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-white/70">Events directory</p>
                <div className="mt-3 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="max-w-2xl">
                    <h1 className="text-4xl font-black tracking-[-0.06em] leading-[0.92] text-white sm:text-5xl lg:text-6xl">Browse events and happenings.</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">Don't miss!</p>
                  </div>

                  <div className="flex flex-wrap gap-3 sm:justify-end">
                    {showManageEventsButton ? (
                      <button
                        type="button"
                        onClick={() => navigateToPath(EVENTS_MANAGE_PATH)}
                        disabled={creatorAccessLoading}
                        className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-white/20 bg-white px-5 py-3 text-sm font-extrabold text-zinc-950 shadow-lg shadow-black/15 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {creatorAccessLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        {creatorAccessLoading ? "Checking access…" : "Manage Events"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-black/20 hover:bg-zinc-800"
                    >
                      Create Event
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="bg-white/6 px-0 py-0 text-white backdrop-blur-md">
                  <FormDropdown
                    label="Filter by category"
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    placeholder="All categories"
                    options={["All categories", ...categories]}
                    searchable={false}
                    tone="dark"
                  />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <EventsLoadingStrip />
          ) : error ? (
            <div className="mt-6 rounded-[2rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 shadow-sm">{error}</div>
          ) : viewAll ? (
            <AllListingsPanel items={filteredEvents} />
          ) : (
            <div className="pb-12">
              {groupedCategories.map((group) => (
                <CategoryStrip key={group.title} title={group.title} items={group.items} />
              ))}
            </div>
          )}
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
