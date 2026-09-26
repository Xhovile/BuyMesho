import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { ListingReview, ListingReviewFeedResponse, ListingReviewSummary } from "../../types";
import { apiFetch } from "../../lib/api";
import ListingReviewCard from "./ListingReviewCard";
import ListingReviewSummaryView from "./ListingReviewSummary";
import VirtualizedReviewList from "./VirtualizedReviewList";

type ReviewFeedMode = "preview" | "full";

type ReviewListingMeta = {
  id: number;
  seller_uid: string;
  is_hidden: boolean;
  deleted_at: string | null;
};

type ListingReviewFeedProps = {
  listingId: number;
  mode?: ReviewFeedMode;
  compact?: boolean;
  initialSummary?: ListingReviewSummary | null;
  initialItems?: ListingReview[];
  initialViewerReview?: ListingReview | null;
  initialTotal?: number;
  initialHasMore?: boolean;
  canReply?: boolean;
  viewerUid?: string;
  ownReviewId?: number | null;
  onReviewChanged?: (review: ListingReview) => void | Promise<void>;
  onEditOwnReview?: (review: ListingReview) => void;
  onDeleteOwnReview?: (review: ListingReview) => void | Promise<void>;
  onViewAll?: () => void;
  onSummaryChange?: (summary: ListingReviewSummary) => void;
  onListingMetaLoaded?: (listing: ReviewListingMeta) => void;
  onReviewEligibilityChange?: (canReview: boolean) => void;
  onViewerReviewChange?: (review: ListingReview | null) => void;
};

const PREVIEW_LIMIT = 3;
const FULL_PAGE_SIZE = 20;
const VIRTUALIZATION_THRESHOLD = 50;

type ReviewFeedPayload = ListingReviewFeedResponse & {
  reviews?: ListingReview[];
  listing?: ReviewListingMeta;
};

export default function ListingReviewFeed({
  listingId,
  mode = "preview",
  compact = false,
  initialSummary = null,
  initialItems,
  initialViewerReview = null,
  initialTotal = 0,
  initialHasMore = false,
  canReply = false,
  viewerUid,
  ownReviewId = null,
  onReviewChanged,
  onEditOwnReview,
  onDeleteOwnReview,
  onViewAll,
  onSummaryChange,
  onListingMetaLoaded,
  onReviewEligibilityChange,
  onViewerReviewChange,
}: ListingReviewFeedProps) {
  const isFullPage = mode === "full";
  const hasInitialData = !isFullPage && initialItems !== undefined;
  const [items, setItems] = useState<ListingReview[]>(initialItems ?? []);
  const [summary, setSummary] = useState<ListingReviewSummary | null>(initialSummary);
  const [viewerReview, setViewerReview] = useState<ListingReview | null>(initialViewerReview);
  const [offset, setOffset] = useState(initialItems?.length ?? 0);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(!hasInitialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);
  const requestControllerRef = useRef<AbortController | null>(null);

  const canShowMore = useMemo(
    () => !isFullPage && hasMore && items.length < total && Boolean(onViewAll),
    [hasMore, isFullPage, items.length, onViewAll, total]
  );
  const resolvedOwnReviewId = ownReviewId ?? viewerReview?.id ?? null;
  const ownReview = useMemo(
    () => items.find((review) => review.id === resolvedOwnReviewId) ?? viewerReview,
    [items, resolvedOwnReviewId, viewerReview]
  );
  const visibleItems = useMemo(
    () => items.filter((review) => review.id !== resolvedOwnReviewId),
    [items, resolvedOwnReviewId]
  );

  const loadReviews = useCallback(
    async (nextOffset = 0, replace = true) => {
      if (!listingId) return;
      if (!replace && loadingMoreRef.current) return;

      if (replace) {
        requestControllerRef.current?.abort();
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }

      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      requestControllerRef.current = controller;

      if (replace) {
        setLoading(true);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }
      setError(null);

      try {
        const limit = replace ? (isFullPage ? FULL_PAGE_SIZE : PREVIEW_LIMIT) : FULL_PAGE_SIZE;
        const result = (await apiFetch(
          `/api/listings/${listingId}/reviews?limit=${limit}&offset=${nextOffset}`,
          { signal: controller.signal }
        )) as ReviewFeedPayload;

        if (requestId !== requestIdRef.current) return;

        const nextSummary = result.summary ?? null;
        setSummary(nextSummary);
        if (nextSummary) onSummaryChange?.(nextSummary);
        if (result.listing) onListingMetaLoaded?.(result.listing);
        onReviewEligibilityChange?.(Boolean(result.canReview));

        const pageItems = (result.items ?? result.reviews ?? []) as ListingReview[];
        setViewerReview(result.viewerReview ?? null);
        onViewerReviewChange?.(result.viewerReview ?? null);
        setTotal(result.pagination?.total ?? 0);
        setHasMore(Boolean(result.pagination?.hasMore));
        setOffset((result.pagination?.offset ?? 0) + pageItems.length);
        setItems((previous) => (replace ? pageItems : [...previous, ...pageItems]));
      } catch (fetchError) {
        if (requestId !== requestIdRef.current) return;
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load review feed.");
      } finally {
        if (requestId !== requestIdRef.current) return;

        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
        }

        if (replace) {
          setLoading(false);
        } else {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [isFullPage, listingId, onListingMetaLoaded, onSummaryChange]
  );

  useEffect(() => {
    loadingMoreRef.current = false;
    if (hasInitialData) return;

    void loadReviews(0, true);

    return () => {
      requestIdRef.current += 1;
      requestControllerRef.current?.abort();
      requestControllerRef.current = null;
      loadingMoreRef.current = false;
    };
  }, [hasInitialData, loadReviews]);

  useEffect(() => {
    if (!isFullPage || !hasMore || loading || loadingMore) return;

    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadReviews(offset, false);
        }
      },
      { rootMargin: "1200px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFullPage, loadReviews, loading, loadingMore, offset]);

  const handleReviewChanged = async (review: ListingReview) => {
    await onReviewChanged?.(review);
    if (!hasInitialData) void loadReviews(0, true);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-[2rem] border border-blue-200 bg-white px-5 py-4 text-sm text-zinc-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading reviews...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {isFullPage && summary ? <ListingReviewSummaryView summary={summary} /> : null}

      {ownReview ? (
        <div className="space-y-4">
          <ListingReviewCard
            review={ownReview}
            listingId={listingId}
            viewerUid={viewerUid}
            canReply={false}
            isOwnReview
            onEdit={onEditOwnReview ? () => onEditOwnReview(ownReview) : undefined}
            onDelete={onDeleteOwnReview ? () => onDeleteOwnReview(ownReview) : undefined}
            onReviewChanged={handleReviewChanged}
          />
        </div>
      ) : null}

      {visibleItems.length > 0 ? (
        isFullPage && visibleItems.length > VIRTUALIZATION_THRESHOLD ? (
          <VirtualizedReviewList
            count={visibleItems.length}
            renderItem={(index) => {
              const review = visibleItems[index];
              return review ? (
                <ListingReviewCard
                  review={review}
                  listingId={listingId}
                  viewerUid={viewerUid}
                  canReply={canReply && review.reviewer_uid !== viewerUid}
                  onReviewChanged={handleReviewChanged}
                />
              ) : null;
            }}
          />
        ) : (
          <div className="space-y-4">
            {visibleItems.map((review) => (
              <ListingReviewCard
                key={review.id}
                review={review}
                listingId={listingId}
                viewerUid={viewerUid}
                canReply={canReply && review.reviewer_uid !== viewerUid}
                onReviewChanged={handleReviewChanged}
              />
            ))}
          </div>
        )
      ) : !ownReview ? (
        <div className="rounded-[2rem] border border-dashed border-blue-200 bg-white px-5 py-6 text-sm text-zinc-500 shadow-sm">
          No written reviews yet.
        </div>
      ) : null}

      {isFullPage && hasMore ? (
        <div ref={loadMoreSentinelRef} className="flex min-h-16 items-center justify-center pt-2" aria-live="polite">
          {loadingMore ? (
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more reviews...
            </span>
          ) : null}
        </div>
      ) : null}

      {canShowMore ? (
        <div className="flex items-center justify-center pt-2">
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center justify-center rounded-full border border-blue-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-zinc-50"
          >
            View all reviews
          </button>
        </div>
      ) : null}

      {isFullPage && !hasMore && items.length > 0 ? (
        <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Showing {Math.min(items.length, total)} of {total} reviews
        </p>
      ) : null}

      {compact && summary ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Showing {Math.min(items.length, total)} of {total} reviews
        </p>
      ) : null}
    </section>
  );
}
