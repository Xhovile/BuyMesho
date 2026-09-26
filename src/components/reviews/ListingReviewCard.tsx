import { useEffect, useState } from "react";
import { AlertTriangle, Edit3, MessageSquareReply, ShieldAlert, Star, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import type { ListingReview, ListingReviewReaction } from "../../types";
import { formatDate } from "../listingDetails/ListingDetailsShared";
import ReviewActionsMenu from "./ReviewActionsMenu";
import ReviewReplyComposer from "./ReviewReplyComposer";
import ReviewTextClamp from "./ReviewTextClamp";
import ReviewMediaGallery from "./ReviewMediaGallery";
import { apiFetch } from "../../lib/api";

type ListingReviewCardProps = {
  review: ListingReview;
  listingId: number;
  canReply?: boolean;
  isOwnReview?: boolean;
  viewerUid?: string | null;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  onReviewChanged?: (review: ListingReview) => void | Promise<void>;
};

export default function ListingReviewCard({
  review,
  listingId,
  canReply = false,
  isOwnReview = false,
  viewerUid = null,
  onEdit,
  onDelete,
  onReviewChanged,
}: ListingReviewCardProps) {
  const badge = review.reviewer_badge ?? (review.is_verified_purchase ? "Verified buyer" : null);
  const showReplyComposer = Boolean(canReply && !isOwnReview);

  const [likeCount, setLikeCount] = useState(review.like_count ?? 0);
  const [dislikeCount, setDislikeCount] = useState(review.dislike_count ?? 0);
  const [viewerReaction, setViewerReaction] = useState<ListingReviewReaction | null>(
    review.viewer_reaction ?? null,
  );
  const [reacting, setReacting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLikeCount(review.like_count ?? 0);
    setDislikeCount(review.dislike_count ?? 0);
    setViewerReaction(review.viewer_reaction ?? null);
  }, [review.id, review.like_count, review.dislike_count, review.viewer_reaction]);

  const handleReaction = async (reaction: ListingReviewReaction) => {
    if (!viewerUid || reacting) return;

    const removing = viewerReaction === reaction;
    setReacting(true);

    try {
      const result = (await apiFetch(
        `/api/listings/${listingId}/reviews/${review.id}/reaction`,
        removing
          ? { method: "DELETE" }
          : {
              method: "PUT",
              body: JSON.stringify({ reaction }),
            },
      )) as { review?: ListingReview | null } | null;

      const updated = result?.review;
      if (!updated) return;

      setLikeCount(updated.like_count ?? 0);
      setDislikeCount(updated.dislike_count ?? 0);
      setViewerReaction(updated.viewer_reaction ?? null);
      await onReviewChanged?.(updated);
    } catch (error) {
      console.warn("Failed to update review reaction:", error);
    } finally {
      setReacting(false);
    }
  };

  const openDeleteDialog = () => {
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await onDelete();
      setDeleteOpen(false);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to remove your review. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <article className="border-b-2 border-zinc-200 py-7 first:pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-extrabold text-zinc-950">{review.reviewer_name}</h4>
              {badge ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                  {badge}
                </span>
              ) : null}
              {isOwnReview ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-zinc-950 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
                  Your review
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{formatDate(review.created_at)}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-extrabold text-zinc-900">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              {review.rating.toFixed(1)}
            </div>

            {isOwnReview && onEdit ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={openDeleteDialog}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                    aria-label="Remove your review"
                    title="Remove review"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : (
              <ReviewActionsMenu canReport={false} />
            )}
          </div>
        </div>

        {review.title ? <p className="mt-4 text-base font-bold tracking-tight text-zinc-950">{review.title}</p> : null}

        <div className="mt-3">
          <ReviewTextClamp text={review.body} />
        </div>

        {review.media?.length ? <ReviewMediaGallery media={review.media} /> : null}

        <div className="mt-5 flex items-center gap-1 border-t border-zinc-100 pt-3">
          <button
            type="button"
            onClick={() => void handleReaction("like")}
            disabled={!viewerUid || reacting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold transition ${viewerReaction === "like" ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-900"} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-pressed={viewerReaction === "like"}
            aria-label={`Like review (${likeCount})`}
          >
            <ThumbsUp className={`h-4 w-4 ${viewerReaction === "like" ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleReaction("dislike")}
            disabled={!viewerUid || reacting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold transition ${viewerReaction === "dislike" ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-900"} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-pressed={viewerReaction === "dislike"}
            aria-label={`Dislike review (${dislikeCount})`}
          >
            <ThumbsDown className={`h-4 w-4 ${viewerReaction === "dislike" ? "fill-current" : ""}`} />
            <span>{dislikeCount}</span>
          </button>
        </div>

        {review.seller_reply ? (
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-500">
              <MessageSquareReply className="h-4 w-4" />
              Seller reply
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{review.seller_reply}</p>
            {review.seller_reply_at ? <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{formatDate(review.seller_reply_at)}</p> : null}
          </div>
        ) : null}

        {showReplyComposer ? <ReviewReplyComposer listingId={listingId} review={review} canReply={showReplyComposer} onSaved={onReviewChanged} /> : null}

        {!review.body ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-blue-200 px-3 py-1.5 text-xs font-semibold text-zinc-500">
            <ShieldAlert className="h-4 w-4" />
            Rating only
          </div>
        ) : null}
      </article>

      {deleteOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-delete-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !deleting) setDeleteOpen(false);
          }}
        >
          <section className="w-full max-w-md rounded-[1.75rem] bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Remove review</p>
                    <h2 id="review-delete-title" className="mt-1 text-xl font-bold tracking-tight text-zinc-950">
                      Remove your review?
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
                    aria-label="Close remove review dialog"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  This will remove the review and any media attached to it. This action cannot be undone.
                </p>

                {deleteError ? <p className="mt-3 text-sm font-semibold text-red-600">{deleteError}</p> : null}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                    className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? "Removing..." : "Remove review"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
