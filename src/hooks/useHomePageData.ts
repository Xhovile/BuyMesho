import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { readCachedApiJson } from "../lib/apiCache";
import { useAuthUser } from "./useAuthUser";

export type HomePreviewListing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
  views_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
  listing_mode?: "normal" | "deal" | "wholesale";
  original_price?: number | null;
  discount_percent?: number | null;
  deal_label?: string | null;
  is_wholesale?: boolean;
  pack_size?: number | null;
};

export type HomeEventPreview = {
  id: number;
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
  poster_alt: string | null;
  spec_values: Record<string, unknown>;
};

export type HomeFeaturedSection = {
  key: string;
  apiCategory: string;
};

const NEWEST_LISTINGS_URL = "/api/listings?sortBy=newest&pageSize=6";
const FEATURED_LISTINGS_URL = "/api/listings?sortBy=popular&pageSize=6";
const CATEGORY_SECTION_LIMIT = 4;
const SHARED_API_CACHE_PREFIX = "__buymesho_api_cache_v2:";
const FORCE_NETWORK_HEADER = "x-buymesho-force-network";

function normalize(v?: string | null) {
  return v?.toLowerCase().trim() || "";
}

function isCampusMatch(item?: string, user?: string) {
  return normalize(item) && normalize(item) === normalize(user);
}

function freshnessScore(item: HomePreviewListing) {
  const ts = Date.parse(item.updated_at || item.created_at || "");
  if (!ts) return 0;
  const hours = (Date.now() - ts) / (1000 * 60 * 60);
  return Math.max(0, 96 - hours);
}

function popularityScore(item: HomePreviewListing) {
  return Number(item.views_count || 0);
}

function rank(list: HomePreviewListing[], campus: string, mode: string) {
  return [...list]
    .map((item, index) => ({ item, index }))
    .sort((aEntry, bEntry) => {
      const a = aEntry.item;
      const b = bEntry.item;
      const campusA = isCampusMatch(a.university, campus) ? 1 : 0;
      const campusB = isCampusMatch(b.university, campus) ? 1 : 0;

      if (campusA !== campusB) return campusB - campusA;

      if (mode === "popular" || mode === "recommended") {
        const p = popularityScore(b) - popularityScore(a);
        if (p) return p;
      }

      const f = freshnessScore(b) - freshnessScore(a);
      if (f) return f;

      const idA = Number(a.id);
      const idB = Number(b.id);
      if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
        return idB - idA;
      }

      return aEntry.index - bEntry.index;
    })
    .map(({ item }) => item);
}

function buildSectionUrl(section: HomeFeaturedSection) {
  return `/api/listings?category=${encodeURIComponent(section.apiCategory)}&pageSize=${CATEGORY_SECTION_LIMIT}`;
}

function readListingsFromCache(path: string) {
  const cached = readCachedApiJson<{ items?: HomePreviewListing[] }>(path);
  return Array.isArray(cached?.items) ? cached.items : [];
}

function buildRankedSnapshot(
  campus: string,
  featuredSections: HomeFeaturedSection[],
  newest: HomePreviewListing[],
  featured: HomePreviewListing[],
  sectionMap: Record<string, HomePreviewListing[]>,
) {
  const rankedNewest = rank(newest, campus, "newest");
  const rankedFeatured = rank(featured, campus, "popular");
  const rankedSections: Record<string, HomePreviewListing[]> = {};

  for (const section of featuredSections) {
    rankedSections[section.key] = rank(sectionMap[section.key] || [], campus, "section");
  }

  const uniqueListingsById = new Map<string, HomePreviewListing>();
  rankedFeatured.forEach((item) => uniqueListingsById.set(String(item.id), item));
  rankedNewest.forEach((item) => {
    const key = String(item.id);
    if (!uniqueListingsById.has(key)) uniqueListingsById.set(key, item);
  });
  Object.values(rankedSections).forEach((items) => {
    items.forEach((item) => {
      const key = String(item.id);
      if (!uniqueListingsById.has(key)) uniqueListingsById.set(key, item);
    });
  });

  return {
    recommendedListings: rank(Array.from(uniqueListingsById.values()), campus, "recommended"),
    newestListings: rankedNewest,
    featuredListings: rankedFeatured,
    sectionListings: rankedSections,
  };
}

function readHomeSnapshot(featuredSections: HomeFeaturedSection[], campus: string) {
  const newest = readListingsFromCache(NEWEST_LISTINGS_URL);
  const featured = readListingsFromCache(FEATURED_LISTINGS_URL);
  const sectionMap: Record<string, HomePreviewListing[]> = {};

  for (const section of featuredSections) {
    sectionMap[section.key] = readListingsFromCache(buildSectionUrl(section));
  }

  const hasAnyListings =
    newest.length > 0 ||
    featured.length > 0 ||
    Object.values(sectionMap).some((items) => items.length > 0);

  return {
    hasAnyListings,
    primaryHasCache: newest.length > 0 || featured.length > 0,
    ...buildRankedSnapshot(campus, featuredSections, newest, featured, sectionMap),
  };
}

async function fetchListings(path: string, signal?: AbortSignal, forceNetwork = false) {
  const data = await apiFetch(path, {
    signal,
    headers: forceNetwork ? { [FORCE_NETWORK_HEADER]: "1" } : undefined,
  });
  return Array.isArray(data?.items) ? (data.items as HomePreviewListing[]) : [];
}

function createInitialSectionLoading(
  featuredSections: HomeFeaturedSection[],
  sectionListings: Record<string, HomePreviewListing[]>,
) {
  const state: Record<string, boolean> = {};
  for (const section of featuredSections) {
    state[section.key] = !(sectionListings[section.key]?.length);
  }
  return state;
}

function isAbortLikeError(error: unknown) {
  if (!error) return false;
  if (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    error.name === "AbortError"
  ) {
    return true;
  }
  const e = error as { name?: string; message?: string };
  const name = String(e.name || "").toLowerCase();
  const message = String(e.message || "").toLowerCase();
  return (
    name === "aborterror" ||
    name === "cancelederror" ||
    message.includes("abort") ||
    message.includes("canceled") ||
    message.includes("cancelled")
  );
}

export function useHomePageData(featuredSections: HomeFeaturedSection[]) {
  const { user, loading: authLoading } = useAuthUser();
  const initialSnapshot = readHomeSnapshot(featuredSections, "");

  const [campus, setCampus] = useState("");
  const [newestListings, setNewestListings] = useState<HomePreviewListing[]>(
    () => initialSnapshot.newestListings,
  );
  const [featuredListings, setFeaturedListings] = useState<HomePreviewListing[]>(
    () => initialSnapshot.featuredListings,
  );
  const [sectionListings, setSectionListings] = useState<Record<string, HomePreviewListing[]>>(
    () => initialSnapshot.sectionListings,
  );
  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>(() =>
    createInitialSectionLoading(featuredSections, initialSnapshot.sectionListings),
  );
  const [eventsListings, setEventsListings] = useState<HomeEventPreview[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [loading, setLoading] = useState(() => !initialSnapshot.primaryHasCache);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const sectionRequestsRef = useRef(new Map<string, AbortController>());
  const eventsRequestRef = useRef<AbortController | null>(null);
  const primarySuccessfulRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const controller of sectionRequestsRef.current.values()) controller.abort();
      sectionRequestsRef.current.clear();
      eventsRequestRef.current?.abort();
      eventsRequestRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCampus("");
      return;
    }

    apiFetch("/api/profile")
      .then((p) => {
        if (mountedRef.current) setCampus(p?.university || "");
      })
      .catch(() => {
        if (mountedRef.current) setCampus("");
      });
  }, [user, authLoading]);

  useEffect(() => {
    const newestController = new AbortController();
    const featuredController = new AbortController();
    let finished = 0;
    let successful = false;

    setError(null);

    const settlePrimary = (kind: "newest" | "featured", items: HomePreviewListing[]) => {
      if (!mountedRef.current) return;

      if (kind === "newest") {
        setNewestListings(items);
      } else {
        setFeaturedListings(items);
      }

      finished += 1;
      if (items.length > 0) {
        successful = true;
        primarySuccessfulRef.current = true;
        setLoading(false);
        setError(null);
      } else if (finished === 2 && !successful && !initialSnapshot.primaryHasCache) {
        setLoading(false);
        setError("Unable to load homepage listings. Please try again.");
      }
    };

    void fetchListings(NEWEST_LISTINGS_URL, newestController.signal, true)
      .then((items) => settlePrimary("newest", items))
      .catch((e) => {
        if (!mountedRef.current || isAbortLikeError(e)) return;
        finished += 1;
        if (finished === 2 && !successful && !initialSnapshot.primaryHasCache) {
          setLoading(false);
          setError("Unable to load homepage listings. Please try again.");
        }
      });

    void fetchListings(FEATURED_LISTINGS_URL, featuredController.signal, true)
      .then((items) => settlePrimary("featured", items))
      .catch((e) => {
        if (!mountedRef.current || isAbortLikeError(e)) return;
        finished += 1;
        if (finished === 2 && !successful && !initialSnapshot.primaryHasCache) {
          setLoading(false);
          setError("Unable to load homepage listings. Please try again.");
        }
      });

    return () => {
      newestController.abort();
      featuredController.abort();
    };
  }, []);

  const loadSection = useCallback(
    async (sectionKey: string) => {
      const section = featuredSections.find((candidate) => candidate.key === sectionKey);
      if (!section || sectionRequestsRef.current.has(sectionKey)) return;

      const controller = new AbortController();
      sectionRequestsRef.current.set(sectionKey, controller);

      const url = buildSectionUrl(section);
      const cachedItems = readListingsFromCache(url);
      if (cachedItems.length > 0) {
        setSectionListings((current) => ({ ...current, [sectionKey]: cachedItems }));
        setSectionLoading((current) => ({ ...current, [sectionKey]: false }));
      } else {
        setSectionLoading((current) => ({ ...current, [sectionKey]: true }));
      }

      try {
        const items = await fetchListings(url, controller.signal, true);
        if (!mountedRef.current) return;
        setSectionListings((current) => ({ ...current, [sectionKey]: items }));
        setSectionLoading((current) => ({ ...current, [sectionKey]: false }));
      } catch (e) {
        if (!mountedRef.current || isAbortLikeError(e)) return;
        setSectionLoading((current) => ({ ...current, [sectionKey]: false }));
      } finally {
        sectionRequestsRef.current.delete(sectionKey);
      }
    },
    [featuredSections],
  );

  const loadEvents = useCallback(async () => {
    if (eventsLoaded || eventsRequestRef.current) return;

    const controller = new AbortController();
    eventsRequestRef.current = controller;
    setEventsLoading(true);

    try {
      const response = await apiFetch("/api/events", {
        signal: controller.signal,
        headers: { [FORCE_NETWORK_HEADER]: "1" },
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      const items = Array.isArray(response?.items)
        ? (response.items as HomeEventPreview[])
        : [];
      setEventsListings(items.slice(0, 6));
      setEventsLoaded(true);
    } catch (e) {
      if (!mountedRef.current || isAbortLikeError(e)) return;
      setEventsListings([]);
      setEventsLoaded(true);
    } finally {
      if (mountedRef.current) setEventsLoading(false);
      if (eventsRequestRef.current === controller) eventsRequestRef.current = null;
    }
  }, [eventsLoaded]);

  const recommendedListings = useMemo(
    () =>
      buildRankedSnapshot(
        campus,
        featuredSections,
        newestListings,
        featuredListings,
        sectionListings,
      ).recommendedListings,
    [campus, featuredSections, newestListings, featuredListings, sectionListings],
  );

  const dealListings = useMemo(
    () =>
      recommendedListings.filter((item) => {
        if (item.listing_mode === "deal") return true;
        return Boolean(item.original_price && Number(item.original_price) > Number(item.price));
      }),
    [recommendedListings],
  );

  return {
    recommendedListings,
    dealListings,
    eventsListings,
    eventsLoading,
    newestListings,
    featuredListings,
    sectionListings,
    sectionLoading,
    loading: loading && !primarySuccessfulRef.current,
    error,
    loadSection,
    loadEvents,
  };
}

export function invalidateHomepageCache() {
  if (typeof window === "undefined") return;

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(SHARED_API_CACHE_PREFIX)) continue;
      if (key.includes("/api/listings")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore cache invalidation failures.
  }
}
