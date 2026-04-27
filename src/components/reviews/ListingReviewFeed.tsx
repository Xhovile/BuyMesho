import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ListingReview, ListingReviewFeedResponse, ListingReviewSummary } from "../../types";
import { apiFetch } from "../../lib/api";
import ListingReviewCard from "./ListingReviewCard";

type ListingReviewFeedProps = {
  listingId: number;
  compact?: boolean;
  initialSummary?: ListingReviewSummary | null;
  refreshKey?: number;
  canReply?: boolean;
  onReviewChanged?: (review: ListingReview) => void | Promise<void>;
};

const INITIAL_LIMIT = 3;
const PAGE_SIZE = 5;

export default function ListingReviewFeed({
  listingId,
  compact = false,
  initialSummary = null,
  refreshKey = 0,
  canReply = false,
  onReviewChanged,
}: ListingReviewFeedProps) {
  const [items, setItems] = useState<ListingReview[]>([]);
  const [summary, setSummary] = useState<ListingReviewSummary | null>(initialSummary);
  const [offset, setOffset] = useState(INITIAL_LIMIT);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canShowMore = useMemo(() => hasMore && items.length < total, [hasMore, items.length, total]);

  const loadReviews = useCallback(
    async (nextOffset = 0, replace = true) => {
      if (!listingId) return;

      replace ? setLoading(true) : setLoadingMore(true);
      setError(null);

      try {
        const result = (await apiFetch(
          `/api/listings/${listingId}/reviews?limit=${replace ? INITIAL_LIMIT : PAGE_SIZE}&offset=${nextOffset}`
        )) as ListingReviewFeedResponse;

        setSummary(result.summary ?? null);
        setTotal(result.pagination?.total ?? 0);
        setHasMore(Boolean(result.pagination?.hasMore));
        setOffset((result.pagination?.offset ?? 0) + (result.pagination?.limit ?? 0));
        setItems((previous) => (replace ? result.items ?? [] : [...previous, ...(result.items ?? [])]));
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load review feed.");
      } finally {
        replace ? setLoading(false) : setLoadingMore(false);
      }
    },
    [listingId]
  );

  useEffect(() => {
    void loadReviews(0, true);
  }, [loadReviews, refreshKey]);

  const handleLoadMore = () => {
    void loadReviews(offset, false);
  };

  const handleReviewChanged = async (review: ListingReview) => {
    await onReviewChanged?.(review);
    void loadReviews(0, true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-[2rem] border border-zinc-200 bg-white px-5 py-4 text-sm text-zinc-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading reviews...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {error ? <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{error}</div> : null}

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((review) => (
            <ListingReviewCard
              key={review.id}
              review={review}
              listingId={listingId}
              canReply={canReply}
              onReviewChanged={handleReviewChanged}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-zinc-200 bg-white px-5 py-6 text-sm text-zinc-500 shadow-sm">
          No written reviews yet.
        </div>
      )}

      {canShowMore ? (
        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </span>
            ) : (
              "View more reviews"
            )}
          </button>
        </div>
      ) : null}

      {compact && summary ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Showing {Math.min(items.length, total)} of {total} reviews
        </p>
      ) : null}
    </section>
  );
}
