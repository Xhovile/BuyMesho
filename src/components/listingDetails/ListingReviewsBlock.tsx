import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Listing, ListingReview, ListingReviewSummary, RatingSummary } from "../../types";
import { apiFetch } from "../../lib/api";
import { navigateToListingReviews, navigateToLoginWithReturnPath } from "../../lib/appNavigation";
import { useAuthUser } from "../../hooks/useAuthUser";
import { SectionHeading } from "./ListingDetailsShared";
import ListingReviewSummaryView from "../reviews/ListingReviewSummary";
import ListingReviewComposer from "../reviews/ListingReviewComposer";
import ListingReviewFeed from "../reviews/ListingReviewFeed";
import FeedbackModal from "../FeedbackModal";

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
  const [previewReviews, setPreviewReviews] = useState<ListingReview[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewHasMore, setPreviewHasMore] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewEditorOpen, setReviewEditorOpen] = useState(false);
  const [reviewBeingEdited, setReviewBeingEdited] = useState<ListingReview | null>(null);
  const [reviewAccessFeedback, setReviewAccessFeedback] = useState<{
    title: string;
    message: string;
    actions?: Array<{ label: string; onClick: () => void; variant?: "primary" | "secondary" }>;
  } | null>(null);

  const canReplyAsSeller = !!firebaseUser?.uid && firebaseUser.uid === listing.seller_uid;

  const loadReviews = useCallback(async () => {
    if (!listing?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = (await apiFetch(`/api/listings/${listing.id}/reviews?limit=3&offset=0`)) as {
        summary: ListingReviewSummary;
        items: ListingReview[];
        viewerReview: ListingReview | null;
        canReview: boolean;
        pagination: {
          total: number;
          hasMore: boolean;
        };
      };

      setSummary(result.summary ?? null);
      setViewerReview(result.viewerReview ?? null);
      setPreviewReviews(result.items ?? []);
      setPreviewTotal(result.pagination?.total ?? 0);
      setPreviewHasMore(Boolean(result.pagination?.hasMore));
      setCanReview(Boolean(result.canReview));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load reviews.");
      setSummary(null);
      setViewerReview(null);
      setPreviewReviews([]);
      setPreviewTotal(0);
      setPreviewHasMore(false);
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
    setReviewBeingEdited(null);
    setReviewEditorOpen(false);
    await loadReviews();
  };

  const handleReviewChanged = async (review: ListingReview) => {
    setViewerReview(review.reviewer_uid === firebaseUser?.uid ? review : viewerReview);
    await loadReviews();
  };

  const handleEditOwnReview = (review: ListingReview) => {
    setReviewBeingEdited(review);
    setReviewEditorOpen(true);
  };

  const handleDeleteOwnReview = async (review: ListingReview) => {
    await apiFetch(`/api/listings/${listing.id}/reviews/${review.id}`, {
      method: "DELETE",
      headers: {
        "Idempotency-Key": `review-delete-${review.id}-${Date.now()}`,
      },
      timeoutMs: 120_000,
    });

    setViewerReview(null);
    setReviewBeingEdited(null);
    setReviewEditorOpen(false);
    await loadReviews();
  };

  const handleOpenCreateReview = () => {
    if (!firebaseUser) {
      const returnPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      setReviewAccessFeedback({
        title: "Log in to review",
        message: "You need to log in before you can submit a review.",
        actions: [
          { label: "Cancel", variant: "secondary", onClick: () => setReviewAccessFeedback(null) },
          {
            label: "Log in",
            onClick: () => {
              setReviewAccessFeedback(null);
              navigateToLoginWithReturnPath(returnPath);
            },
          },
        ],
      });
      return;
    }

    if (!canReview) {
      setReviewAccessFeedback({
        title: "Purchase required",
        message: "You can only review this listing after purchasing it.",
      });
      return;
    }

    setReviewBeingEdited(null);
    setReviewEditorOpen(true);
  };

  return (
    <div className="space-y-5 border-t border-blue-100 pt-6">
      <SectionHeading eyebrow="Reviews" title="Ratings & reviews" />

      {loading ? (
        <div className="flex items-center gap-3 rounded-[2rem] border border-blue-200 bg-white px-5 py-4 text-sm text-zinc-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading reviews...
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">{error}</div>
      ) : (
        <div className="space-y-5">
          <ListingReviewSummaryView summary={summary} />

          {!viewerReview && !(firebaseUser && firebaseUser.uid === listing.seller_uid) ? (
            <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-blue-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Your review</p>
                <p className="mt-2 text-sm text-zinc-500">Share a rating and a short review for this listing.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateReview}
                className="shrink-0 rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                Leave a review
              </button>
            </div>
          ) : null}

          <FeedbackModal
            open={Boolean(reviewAccessFeedback)}
            type="info"
            title={reviewAccessFeedback?.title ?? ""}
            message={reviewAccessFeedback?.message ?? ""}
            actions={reviewAccessFeedback?.actions}
            onClose={() => setReviewAccessFeedback(null)}
          />

          <ListingReviewComposer
            listingId={listing.id}
            isAuthenticated={!!firebaseUser}
            canReview={reviewBeingEdited ? true : canReview}
            existingReview={reviewBeingEdited}
            open={reviewEditorOpen}
            onSaved={handleSaved}
            onClose={() => {
              setReviewEditorOpen(false);
              setReviewBeingEdited(null);
            }}
          />

          <ListingReviewFeed
            listingId={listing.id}
            initialSummary={summary}
            initialItems={previewReviews}
            initialViewerReview={viewerReview}
            initialTotal={previewTotal}
            initialHasMore={previewHasMore}
            canReply={canReplyAsSeller}
            viewerUid={firebaseUser?.uid}
            ownReviewId={viewerReview?.id ?? null}
            onEditOwnReview={handleEditOwnReview}
            onDeleteOwnReview={handleDeleteOwnReview}
            onReviewChanged={handleReviewChanged}
            onViewAll={() => navigateToListingReviews(listing.id)}
          />
        </div>
      )}
    </div>
  );
}
