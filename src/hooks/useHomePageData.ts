import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { API_CACHE_TTL_MS, isCachedApiResponseFresh, readCachedApiJson } from "../lib/apiCache";
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
const CATEGORY_SECTION_FETCH_DELAY_MS = 250;
const SHARED_API_CACHE_PREFIX = "__buymesho_api_cache_v2:";

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

  if (!hasAnyListings) {
    return {
      hasCache: false,
      ...buildRankedSnapshot(campus, featuredSections, [], [], sectionMap),
    };
  }

  return {
    hasCache: true,
    ...buildRankedSnapshot(campus, featuredSections, newest, featured, sectionMap),
  };
}

function fetchListings(path: string, signal?: AbortSignal) {
  return fetch(path, { signal }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data.items) ? (data.items as HomePreviewListing[]) : [];
  });
}

function hasFreshHomeCache(featuredSections: HomeFeaturedSection[]) {
  const urls = [
    NEWEST_LISTINGS_URL,
    FEATURED_LISTINGS_URL,
    ...featuredSections.map((section) => buildSectionUrl(section)),
  ];

  return urls.every((url) => isCachedApiResponseFresh(url, API_CACHE_TTL_MS));
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

function createAbortError() {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Aborted", "AbortError");
  }
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
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

  const [campus, setCampus] = useState("");
  const initialSnapshot = readHomeSnapshot(featuredSections, "");
  const [recommendedListings, setRecommendedListings] = useState<HomePreviewListing[]>(
    () => initialSnapshot.recommendedListings,
  );
  const [newestListings, setNewestListings] = useState<HomePreviewListing[]>(
    () => initialSnapshot.newestListings,
  );
  const [featuredListings, setFeaturedListings] = useState<HomePreviewListing[]>(
    () => initialSnapshot.featuredListings,
  );
  const [sectionListings, setSectionListings] = useState<Record<string, HomePreviewListing[]>>(
    () => initialSnapshot.sectionListings,
  );
  const [eventsListings, setEventsListings] = useState<HomeEventPreview[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [loading, setLoading] = useState(() => !initialSnapshot.hasCache);
  const [error, setError] = useState<string | null>(null);

  // Get campus
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCampus("");
      return;
    }

    apiFetch("/api/profile")
      .then((p) => setCampus(p?.university || ""))
      .catch(() => setCampus(""));
  }, [user, authLoading]);

  // Load + rank
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      const cachedSnapshot = readHomeSnapshot(featuredSections, campus);
      if (cachedSnapshot.hasCache) {
        setRecommendedListings(cachedSnapshot.recommendedListings);
        setNewestListings(cachedSnapshot.newestListings);
        setFeaturedListings(cachedSnapshot.featuredListings);
        setSectionListings(cachedSnapshot.sectionListings);
      }

      const shouldRefresh = !hasFreshHomeCache(featuredSections);
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
        const [newest, featured] = await Promise.all([
          fetchListings(NEWEST_LISTINGS_URL, controller.signal),
          fetchListings(FEATURED_LISTINGS_URL, controller.signal),
        ]);

        const sections: Record<string, HomePreviewListing[]> = {};
        await Promise.all(
          featuredSections.map(async (section) => {
            const items = await fetchListings(buildSectionUrl(section), controller.signal);
            sections[section.key] = items;
          })
        );

        const snapshot = buildRankedSnapshot(campus, featuredSections, newest, featured, sections);
        setRecommendedListings(snapshot.recommendedListings);
        setNewestListings(snapshot.newestListings);
        setFeaturedListings(snapshot.featuredListings);
        setSectionListings(snapshot.sectionListings);
      } catch (e: unknown) {
        if (controller.signal.aborted || isAbortLikeError(e)) {
          return;
        }
        if (!cachedSnapshot.hasCache) {
          setError("Unable to load homepage listings. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [campus, featuredSections]);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        setEventsLoading(true);
        const response = await apiFetch("/api/events");
        if (controller.signal.aborted) return;
        const items = Array.isArray(response?.items) ? (response.items as HomeEventPreview[]) : [];
        setEventsListings(items.slice(0, 6));
      } catch (e: unknown) {
        if (!controller.signal.aborted && !isAbortLikeError(e)) {
          setEventsListings([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    };

    void loadEvents();
    return () => controller.abort();
  }, []);

  const dealListings = useMemo(
    () =>
      recommendedListings.filter((item) => {
        if (item.listing_mode === "deal") return true;
        return Boolean(item.original_price && Number(item.original_price) > Number(item.price));
      }),
    [recommendedListings]
  );

  return {
    recommendedListings,
    dealListings,
    eventsListings,
    eventsLoading,
    newestListings,
    featuredListings,
    sectionListings,
    loading,
    error,
  };
}
