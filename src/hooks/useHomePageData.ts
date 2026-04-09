import { useEffect, useState } from "react";
import type { Listing } from "../types";

export type HomePreviewListing = Pick<Listing, "id" | "name" | "price">;

export type HomeFeaturedSection = {
  key: string;
  apiCategory: string;
};

async function fetchListings(path: string): Promise<HomePreviewListing[]> {
  const res = await fetch(path);

  if (!res.ok) {
    throw new Error(`Homepage data request failed (${res.status})`);
  }

  const data = await res.json();
  return Array.isArray(data.items) ? (data.items as HomePreviewListing[]) : [];
}

export function useHomePageData(featuredSections: HomeFeaturedSection[]) {
  const [newestListings, setNewestListings] = useState<HomePreviewListing[]>([]);
  const [featuredListings, setFeaturedListings] = useState<HomePreviewListing[]>([]);
  const [sectionListings, setSectionListings] = useState<Record<string, HomePreviewListing[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [newest, featured] = await Promise.all([
          fetchListings("/api/listings?sortBy=newest&pageSize=6"),
          fetchListings("/api/listings?sortBy=popular&pageSize=6"),
        ]);

        const highlights: Record<string, HomePreviewListing[]> = {};
        await Promise.all(
          featuredSections.map(async (section) => {
            const items = await fetchListings(
              `/api/listings?category=${encodeURIComponent(section.apiCategory)}&pageSize=4`
            );
            highlights[section.key] = items;
          })
        );

        if (cancelled) return;

        setNewestListings(newest);
        setFeaturedListings(featured);
        setSectionListings(highlights);
      } catch (err) {
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
