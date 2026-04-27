import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Listing, ListingReview, ListingReviewSummary, RatingSummary } from "../../types";
import { apiFetch } from "../../lib/api";
import { useAuthUser } from "../../hooks/useAuthUser";
import { SectionHeading } from "./ListingDetailsShared";
import ListingReviewSummaryView from "../reviews/ListingReviewSummary";
import ListingReviewComposer from "../reviews/ListingReviewComposer";
import ListingReviewFeed from "../reviews/ListingReviewFeed";

export default function ListingReviewsBlock({
  sellerUid,
  viewerUid,
  ratingSummary,
  listing,
  seller,
}: {
  sellerUid?: string;
  viewerUid?: string;
  ratingSummary?: RatingSummary | null;
  listing: Listing;
  seller?: unknown;
}) {
  const { user: firebaseUser } = useAuthUser();
  const [summary, setSummary] = useState<ListingReviewSummary | null>(null);
  const [viewerReview, setViewerReview] = useState<ListingReview | null>(null);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadReviews = useCallback(async () => {
    if (!listing?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = (await apiFetch(`/api/listings/${listing.id}/reviews?limit=3&offset=0`)) as {
        summary: ListingReviewSummary;
        viewerReview: ListingReview | null;
        canReview: boolean;
      };

      setSummary(result.summary ?? null);
      setViewerReview(result.viewerReview ?? null);
      setCanReview(Boolean(result.canReview));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load reviews.");
      setSummary(null);
      setViewerReview(null);
      setCanReview(false);
    } finally {
      setLoading(false);
    }
  }, [listing?.id]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleSaved = async (savedReview: ListingReview | null) => {
    setViewerReview(savedReview);
    setRefreshKey((current) => current + 1);
    await loadReviews();
  };

  return (
    <div className="space-y-6 border-t border-zinc-200 pt-6">
      <SectionHeading
        eyebrow="Reviews"
        title="Trust and feedback"
        description="Buyers can rate the listing, add an optional written review, and later see the most useful feedback first."
      />

      {loading ? (
        <div className="flex items-center gap-3 rounded-[2rem] border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reviews...
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{error}</div>
      ) : (
        <div className="space-y-6">
          <ListingReviewSummaryView summary={summary} />
          <ListingReviewComposer
            listingId={listing.id}
            isAuthenticated={!!firebaseUser}
            canReview={canReview}
            existingReview={viewerReview}
            onSaved={handleSaved}
          />
          <ListingReviewFeed listingId={listing.id} initialSummary={summary} refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}
