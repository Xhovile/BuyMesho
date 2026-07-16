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

export function useListingDetailsData(listingId: string, viewerUid?: string | null): UseListingDetailsDataResult {
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadListing = async () => {
      if (!listingId) {
        setListing(null);
        setSeller(null);
        setRatingSummary(null);
        setRelatedListings([]);
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
          apiFetch(`/api/users/${found.seller_uid}`),
          apiFetch(`/api/users/${found.seller_uid}/rating-summary`),
          apiFetch(`/api/listings/${found.id}/related?limit=20`),
        ]);

        if (cancelled) return;
        setSeller(sellerResult.status === "fulfilled" ? sellerResult.value : null);
        setRatingSummary(ratingResult.status === "fulfilled" ? ratingResult.value : null);
        setRelatedListings(
          relatedResult.status === "fulfilled" && Array.isArray(relatedResult.value)
            ? relatedResult.value
            : [],
        );
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
    let cancelled = false;

    const sellerUid = listing?.seller_uid;
    if (!sellerUid) return;

    const syncRatingSummary = async () => {
      setRatingLoading(true);
      try {
        const summary = await apiFetch(`/api/users/${sellerUid}/rating-summary`);
        if (!cancelled) {
          setRatingSummary(summary);
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
      const summary = await apiFetch(`/api/users/${sellerUid}/rating-summary`);
      setRatingSummary(summary);
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
