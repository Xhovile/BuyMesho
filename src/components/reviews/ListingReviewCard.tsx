import { Edit3, MessageSquareReply, ShieldAlert, Star } from "lucide-react";
import type { ListingReview } from "../../types";
import { formatDate } from "../listingDetails/ListingDetailsShared";
import ReviewActionsMenu from "./ReviewActionsMenu";
import ReviewReplyComposer from "./ReviewReplyComposer";
import ReviewTextClamp from "./ReviewTextClamp";

type ListingReviewCardProps = {
  review: ListingReview;
  listingId: number;
  canReply?: boolean;
  isOwnReview?: boolean;
  onEdit?: () => void;
  onReviewChanged?: (review: ListingReview) => void | Promise<void>;
};

export default function ListingReviewCard({
  review,
  listingId,
  canReply = false,
  isOwnReview = false,
  onEdit,
  onReviewChanged,
}: ListingReviewCardProps) {
  const badge = review.reviewer_badge ?? (review.is_verified_purchase ? "Verified buyer" : null);

  return (
    <article className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-sm font-extrabold text-zinc-950">{review.reviewer_name}</h4>
            {badge ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-500">
                {badge}
              </span>
            ) : null}
            {isOwnReview ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-950 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
                Your review
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{formatDate(review.created_at)}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-extrabold text-zinc-900">
            <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
            {review.rating.toFixed(1)}
          </div>
          {isOwnReview && onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </button>
          ) : (
            <ReviewActionsMenu canReport={false} />
          )}
        </div>
      </div>

      {review.title ? <p className="mt-4 text-base font-bold tracking-tight text-zinc-950">{review.title}</p> : null}

      <div className="mt-3">
        <ReviewTextClamp text={review.body} />
      </div>

      {review.seller_reply ? (
        <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-500">
            <MessageSquareReply className="h-4 w-4" />
            Seller reply
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700">{review.seller_reply}</p>
          {review.seller_reply_at ? <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{formatDate(review.seller_reply_at)}</p> : null}
        </div>
      ) : null}

      {canReply && !isOwnReview ? <ReviewReplyComposer listingId={listingId} review={review} canReply={canReply} onSaved={onReviewChanged} /> : null}

      {!review.body ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500">
          <ShieldAlert className="h-4 w-4" />
          Rating only
        </div>
      ) : null}
    </article>
  );
}
