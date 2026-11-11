import { useEffect, useState } from "react";
import { AlertTriangle, Edit3, MessageSquareReply, ShieldAlert, Star, ThumbsDown, ThumbsUp, Trash2, UserRound, X } from "lucide-react";
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
  const canReact = Boolean(viewerUid && viewerUid !== review.seller_uid);

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
    if (!canReact || reacting) return;

    const previous = { likeCount, dislikeCount, viewerReaction };
    const removing = viewerReaction === reaction;
    let nextReaction: ListingReviewReaction | null = reaction;

    if (removing) {
      nextReaction = null;
    }

    let nextLikeCount = likeCount;
    let nextDislikeCount = dislikeCount;

    if (viewerReaction === "like") nextLikeCount = Math.max(0, nextLikeCount - 1);
    if (viewerReaction === "dislike") nextDislikeCount = Math.max(0, nextDislikeCount - 1);
    if (nextReaction === "like") nextLikeCount += 1;
    if (nextReaction === "dislike") nextDislikeCount += 1;

    setLikeCount(nextLikeCount);
    setDislikeCount(nextDislikeCount);
    setViewerReaction(nextReaction);
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
      if (!updated) throw new Error("Review reaction update failed.");

      setLikeCount(updated.like_count ?? 0);
      setDislikeCount(updated.dislike_count ?? 0);
      setViewerReaction(updated.viewer_reaction ?? null);
    } catch (error) {
      setLikeCount(previous.likeCount);
      setDislikeCount(previous.dislikeCount);
      setViewerReaction(previous.viewerReaction);
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
      <article className="border-b-2 border-bm-border py-7 first:pt-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-bm-border bg-bm-surface-muted">
                {review.reviewer_avatar_url ? (
                  <img
                    src={review.reviewer_avatar_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={40}
                    height={40}
                  />
                ) : (
                  <UserRound className="h-5 w-5 text-bm-text-subtle" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-sm font-extrabold text-bm-text">{review.reviewer_name}</h4>
                  {badge ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-bm-border-subtle bg-bm-surface-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bm-text-muted">
                      {badge}
                    </span>
                  ) : null}
                  {isOwnReview ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-bm-brand/30 bg-bm-brand px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bm-on-brand">
                      Your review
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-bm-text-subtle">
                    {formatDate(review.created_at)}
                  </p>
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`${review.rating} out of 5 stars`}
                    title={`${review.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= review.rating ? "fill-amber-400 text-amber-500" : "text-bm-text-subtle"}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwnReview && onEdit ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onEdit}
                  className="inline-flex items-center gap-2 rounded-full border border-bm-border bg-bm-surface px-3 py-1.5 text-sm font-bold text-bm-text-muted transition hover:bg-bm-surface-muted"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={openDeleteDialog}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bm-danger/35 bg-bm-surface text-bm-danger transition hover:bg-bm-danger-bg"
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

        {review.title ? <p className="mt-4 text-base font-bold tracking-tight text-bm-text">{review.title}</p> : null}

        <div className="mt-3">
          <ReviewTextClamp text={review.body} />
        </div>

        {review.media?.length ? <ReviewMediaGallery media={review.media} /> : null}

        <div className="mt-5 flex items-center gap-1 border-t border-bm-border-subtle pt-3">
          <button
            type="button"
            onClick={() => void handleReaction("like")}
            disabled={!canReact || reacting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold transition ${viewerReaction === "like" ? "text-bm-text" : "text-bm-text-subtle hover:text-bm-text"} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-pressed={viewerReaction === "like"}
            aria-label={`Like review (${likeCount})`}
            title={canReact ? "Like review" : "Listing sellers cannot react to reviews"}
          >
            <ThumbsUp className={`h-4 w-4 ${viewerReaction === "like" ? "fill-current" : ""}`} />
            <span>{likeCount}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleReaction("dislike")}
            disabled={!canReact || reacting}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold transition ${viewerReaction === "dislike" ? "text-bm-text" : "text-bm-text-subtle hover:text-bm-text"} disabled:cursor-not-allowed disabled:opacity-50`}
            aria-pressed={viewerReaction === "dislike"}
            aria-label={`Dislike review (${dislikeCount})`}
            title={canReact ? "Dislike review" : "Listing sellers cannot react to reviews"}
          >
            <ThumbsDown className={`h-4 w-4 ${viewerReaction === "dislike" ? "fill-current" : ""}`} />
            <span>{dislikeCount}</span>
          </button>
        </div>

        {review.seller_reply ? (
          <div className="mt-4 rounded-2xl border border-bm-border-subtle bg-bm-surface-muted p-4">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle">
              <MessageSquareReply className="h-4 w-4" />
              Seller reply
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-bm-text-muted">{review.seller_reply}</p>
            {review.seller_reply_at ? <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-bm-text-subtle">{formatDate(review.seller_reply_at)}</p> : null}
          </div>
        ) : null}

        {showReplyComposer ? <ReviewReplyComposer listingId={listingId} review={review} canReply={showReplyComposer} onSaved={onReviewChanged} /> : null}

        {!review.body ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-bm-border px-3 py-1.5 text-xs font-semibold text-bm-text-subtle">
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
          <section className="w-full max-w-md rounded-[1.75rem] bg-bm-surface p-5 shadow-2xl sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-bm-danger-bg text-bm-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle">Remove review</p>
                    <h2 id="review-delete-title" className="mt-1 text-xl font-bold tracking-tight text-bm-text">
                      Remove your review?
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bm-border text-bm-text-muted transition hover:bg-bm-surface-muted disabled:opacity-50"
                    aria-label="Close remove review dialog"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-sm leading-6 text-bm-text-muted">
                  This will remove the review and any media attached to it. This action cannot be undone.
                </p>

                {deleteError ? <p className="mt-3 text-sm font-semibold text-bm-danger">{deleteError}</p> : null}

                <div className="mt-5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(false)}
                    disabled={deleting}
                    className="flex-1 rounded-full border border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold text-bm-text-muted transition hover:bg-bm-surface-muted disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="flex-1 rounded-full bg-bm-danger px-4 py-2.5 text-sm font-bold text-bm-on-brand transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
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
