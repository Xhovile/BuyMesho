import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
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
};

export type HomeFeaturedSection = {
  key: string;
  apiCategory: string;
};

const HOMEPAGE_CACHE_TTL_MS = 60_000;

const homepageCache = new Map<
  string,
  { data: HomePreviewListing[]; timestamp: number }
>();

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

async function fetchListings(path: string, signal?: AbortSignal) {
  const cached = homepageCache.get(path);
  if (cached && Date.now() - cached.timestamp < HOMEPAGE_CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(path, { signal });
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];

  homepageCache.set(path, {
    data: items,
    timestamp: Date.now(),
  });

  return items;
}

export function useHomePageData(featuredSections: HomeFeaturedSection[]) {
  const { user, loading: authLoading } = useAuthUser();

  const [campus, setCampus] = useState("");
  const [recommendedListings, setRecommendedListings] = useState<
    HomePreviewListing[]
  >([]);
  const [newestListings, setNewestListings] = useState<HomePreviewListing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<HomePreviewListing[]>(
    []
  );
  const [sectionListings, setSectionListings] = useState<
    Record<string, HomePreviewListing[]>
  >({});
  const [loading, setLoading] = useState(true);
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
      setLoading(true);

      try {
        const [newest, featured] = await Promise.all([
          fetchListings(
            "/api/listings?sortBy=newest&pageSize=6",
            controller.signal
          ),
          fetchListings(
            "/api/listings?sortBy=popular&pageSize=6",
            controller.signal
          ),
        ]);

        const sections: any = {};

        await Promise.all(
          featuredSections.map(async (s) => {
            const items = await fetchListings(
              `/api/listings?category=${encodeURIComponent(
                s.apiCategory
              )}&pageSize=4`,
              controller.signal
            );
            sections[s.key] = rank(items, campus, "section");
          })
        );

        const uniqueListingsById = new Map<string, HomePreviewListing>();
        featured.forEach((item) => {
          uniqueListingsById.set(String(item.id), item);
        });
        newest.forEach((item) => {
          const key = String(item.id);
          if (!uniqueListingsById.has(key)) {
            uniqueListingsById.set(key, item);
          }
        });
        Object.values(sections).forEach((items) => {
          (items as HomePreviewListing[]).forEach((item) => {
            const key = String(item.id);
            if (!uniqueListingsById.has(key)) {
              uniqueListingsById.set(key, item);
            }
          });
        });

        setRecommendedListings(
          rank(Array.from(uniqueListingsById.values()), campus, "recommended")
        );
        setNewestListings(rank(newest, campus, "newest"));
        setFeaturedListings(rank(featured, campus, "popular"));
        setSectionListings(sections);
      } catch (e: any) {
        setError(e.message || "Failed");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [campus]);

  return {
    recommendedListings,
    newestListings,
    featuredListings,
    sectionListings,
    loading,
    error,
  };
}
