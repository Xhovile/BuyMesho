import { useEffect, useState } from "react";
import type { Listing, RatingSummary } from "../types";
import { apiFetch } from "../lib/api";
import { fetchListingById } from "../lib/listings";
import type { SellerProfile } from "../components/listingDetails/listingDetailsUtils";

export type UseListingDetailsDataResult = {
  listing: Listing | null;
  setListing: React.Dispatch<React.SetStateAction<Listing | null>>;
  seller: SellerProfile | null;
  ratingSummary: RatingSummary | null;
  ratingLoading: boolean;
  relatedListings: Listing[];
  loading: boolean;
  refreshRatingSummary: (sellerUid: string) => Promise<void>;
};

type ListingDetailsCacheEntry = {
  listing: Listing | null;
  seller: SellerProfile | null;
  ratingSummary: RatingSummary | null;
  relatedListings: Listing[];
  scrollY: number;
};

const listingDetailsCache = new Map<string, ListingDetailsCacheEntry>();

export function clearListingDetailsCache(listingId?: string | number) {
  if (listingId === undefined || listingId === null || listingId === "") {
    listingDetailsCache.clear();
    return;
  }
  listingDetailsCache.delete(String(listingId));
}

async function fetchSellerProfile(sellerUid: string) {
  try {
    return (await apiFetch(`/api/sellers/${sellerUid}`)) as SellerProfile;
  } catch {
    try {
      return (await apiFetch(`/api/users/${sellerUid}`)) as SellerProfile;
    } catch {
      return null;
    }
  }
}

async function fetchSellerRatingSummary(sellerUid: string) {
  try {
    return (await apiFetch(`/api/sellers/${sellerUid}/rating-summary`)) as RatingSummary;
  } catch {
    try {
      return (await apiFetch(`/api/users/${sellerUid}/rating-summary`)) as RatingSummary;
    } catch {
      return null;
    }
  }
}

export function useListingDetailsData(listingId: string, viewerUid?: string | null): UseListingDetailsDataResult {
  const cached = listingDetailsCache.get(String(listingId));
  const [listing, setListing] = useState<Listing | null>(cached?.listing ?? null);
  const [seller, setSeller] = useState<SellerProfile | null>(cached?.seller ?? null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(cached?.ratingSummary ?? null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [relatedListings, setRelatedListings] = useState<Listing[]>(cached?.relatedListings ?? []);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;

    const cachedEntry = listingDetailsCache.get(String(listingId));

    const loadListing = async () => {
      if (!listingId) {
        setListing(null);
        setSeller(null);
        setRatingSummary(null);
        setRelatedListings([]);
        setLoading(false);
        return;
      }

      if (cachedEntry) {
        setListing(cachedEntry.listing);
        setSeller(cachedEntry.seller);
        setRatingSummary(cachedEntry.ratingSummary);
        setRelatedListings(cachedEntry.relatedListings);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await fetchListingById(listingId);
        if (cancelled) return;
        setListing(found);

        if (!found) {
          setSeller(null);
          setRatingSummary(null);
          setRelatedListings([]);
          return;
        }

        try {
          await fetch(`/api/listings/${found.id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to track listing view", error);
        }

        const [sellerResult, ratingResult, relatedResult] = await Promise.allSettled([
          fetchSellerProfile(found.seller_uid),
          fetchSellerRatingSummary(found.seller_uid),
          apiFetch(`/api/listings/${found.id}/related?limit=20`),
        ]);

        if (cancelled) return;

        const sellerProfile = sellerResult.status === "fulfilled" ? sellerResult.value : null;
        const sellerRating = ratingResult.status === "fulfilled" ? ratingResult.value : null;
        const related = relatedResult.status === "fulfilled" && Array.isArray(relatedResult.value)
          ? relatedResult.value
          : [];

        setSeller(
          sellerProfile
            ? {
                ...sellerProfile,
                ratingSummary: sellerRating,
              }
            : null,
        );
        setRatingSummary(sellerRating);
        setRelatedListings(related);
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load listing details page", error);
        setListing(null);
        setSeller(null);
        setRatingSummary(null);
        setRelatedListings([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadListing();

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  useEffect(() => {
    if (!listingId || !listing || loading) return;

    const key = String(listingId);
    const previous = listingDetailsCache.get(key);

    listingDetailsCache.set(key, {
      listing,
      seller,
      ratingSummary,
      relatedListings,
      scrollY: previous?.scrollY ?? 0,
    });
  }, [listingId, listing, seller, ratingSummary, relatedListings, loading]);

  useEffect(() => {
    if (!listingId) return;

    const key = String(listingId);
    const saveScroll = () => {
      const current = listingDetailsCache.get(key);
      if (current) {
        listingDetailsCache.set(key, { ...current, scrollY: window.scrollY });
      }
    };

    window.addEventListener("scroll", saveScroll, { passive: true });
    return () => {
      saveScroll();
      window.removeEventListener("scroll", saveScroll);
    };
  }, [listingId]);

  useEffect(() => {
    if (!listingId || !cached || cached.scrollY <= 0) return;

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: cached.scrollY, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [listingId, cached]);

  useEffect(() => {
    let cancelled = false;

    const sellerUid = listing?.seller_uid;
    if (!sellerUid) return;

    const syncRatingSummary = async () => {
      setRatingLoading(true);
      try {
        const summary = await fetchSellerRatingSummary(sellerUid);
        if (!cancelled) {
          setRatingSummary(summary);
          setSeller((prev) => (prev ? { ...prev, ratingSummary: summary } : prev));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load rating summary", error);
          setRatingSummary(null);
        }
      } finally {
        if (!cancelled) {
          setRatingLoading(false);
        }
      }
    };

    void syncRatingSummary();
    return () => {
      cancelled = true;
    };
  }, [listing?.seller_uid, viewerUid]);

  const refreshRatingSummary = async (sellerUid: string) => {
    setRatingLoading(true);
    try {
      const summary = await fetchSellerRatingSummary(sellerUid);
      setRatingSummary(summary);
      setSeller((prev) => (prev && prev.uid === sellerUid ? { ...prev, ratingSummary: summary } : prev));
    } catch (error) {
      console.error("Failed to load rating summary", error);
      setRatingSummary(null);
    } finally {
      setRatingLoading(false);
    }
  };

  return {
    listing,
    setListing,
    seller,
    ratingSummary,
    ratingLoading,
    relatedListings,
    loading,
    refreshRatingSummary,
  };
}
