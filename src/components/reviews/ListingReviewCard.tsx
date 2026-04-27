import { MessageSquareReply, ShieldAlert, Star } from "lucide-react";
import type { ListingReview } from "../../types";
import { formatDate } from "../listingDetails/ListingDetailsShared";
import ReviewTextClamp from "./ReviewTextClamp";

export default function ListingReviewCard({ review }: { review: ListingReview }) {
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
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">{formatDate(review.created_at)}</p>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-extrabold text-zinc-900">
          <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
          {review.rating.toFixed(1)}
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

      {!review.body ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500">
          <ShieldAlert className="h-4 w-4" />
          Rating only
        </div>
      ) : null}
    </article>
  );
}
