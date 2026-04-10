import { useEffect, useState } from "react";
import type { Listing } from "../types";

export type HomePreviewListing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
};

export type HomeFeaturedSection = {
  key: string;
  apiCategory: string;
};

const HOMEPAGE_CACHE_TTL_MS = 60_000;

type CachedHomePreviewEntry = {
  data: HomePreviewListing[];
  timestamp: number;
};

const homepageCache = new Map<string, CachedHomePreviewEntry>();

async function fetchListings(
  path: string,
  signal?: AbortSignal
): Promise<HomePreviewListing[]> {
  const cached = homepageCache.get(path);
  if (cached && Date.now() - cached.timestamp < HOMEPAGE_CACHE_TTL_MS) {
    return cached.data;
  }

  const res = await fetch(path, { signal });

  if (!res.ok) {
    throw new Error(`Homepage data request failed (${res.status})`);
  }

  const data = await res.json();
  const items = Array.isArray(data.items) ? (data.items as HomePreviewListing[]) : [];
  homepageCache.set(path, {
    data: items,
    timestamp: Date.now(),
  });
  return items;
}

export function useHomePageData(featuredSections: HomeFeaturedSection[]) {
  const [newestListings, setNewestListings] = useState<HomePreviewListing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<HomePreviewListing[]>([]);
  const [sectionListings, setSectionListings] = useState<Record<string, HomePreviewListing[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [newest, featured] = await Promise.all([
          fetchListings("/api/listings?sortBy=newest&pageSize=6", controller.signal),
          fetchListings("/api/listings?sortBy=popular&pageSize=6", controller.signal),
        ]);

        const highlights: Record<string, HomePreviewListing[]> = {};
        await Promise.all(
          featuredSections.map(async (section) => {
            const items = await fetchListings(
              `/api/listings?category=${encodeURIComponent(section.apiCategory)}&pageSize=4`,
              controller.signal
            );
            highlights[section.key] = items;
          })
        );

        if (cancelled) return;

        setNewestListings(newest);
        setFeaturedListings(featured);
        setSectionListings(highlights);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load homepage data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [featuredSections]);

  return {
    newestListings,
    featuredListings,
    sectionListings,
    loading,
    error,
  };
}
