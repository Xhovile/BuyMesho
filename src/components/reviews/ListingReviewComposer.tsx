import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { ListingReview } from "../../types";
import { apiFetch } from "../../lib/api";

type ListingReviewComposerProps = {
  listingId: number;
  isAuthenticated: boolean;
  canReview: boolean;
  existingReview?: ListingReview | null;
  onSaved?: (review: ListingReview | null) => void | Promise<void>;
};

const MAX_BODY_LENGTH = 500;

export default function ListingReviewComposer({
  listingId,
  isAuthenticated,
  canReview,
  existingReview,
  onSaved,
}: ListingReviewComposerProps) {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 0);
  const [body, setBody] = useState(existingReview?.body ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setBody(existingReview?.body ?? "");
    setError(null);
  }, [existingReview?.id, existingReview?.rating, existingReview?.body]);

  const bodyCount = body.length;
  const submitLabel = useMemo(() => {
    if (existingReview) return "Update review";
    return "Post review";
  }, [existingReview]);

  const helperText = useMemo(() => {
    if (!isAuthenticated) return "Log in to leave a rating and review.";
    if (!canReview) return "You cannot review your own listing.";
    if (rating === 0) return "Choose a star rating first. The text review is optional.";
    return "Add a few details if you want to help other buyers.";
  }, [canReview, isAuthenticated, rating]);

  const handleSubmit = async () => {
    if (!isAuthenticated || !canReview) return;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      setError("Pick a star rating before submitting.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const review = (await apiFetch(`/api/listings/${listingId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          body: body.trim() || null,
        }),
      })) as { review?: ListingReview | null } | null;

      if (review?.review !== undefined) {
        setRating(review.review?.rating ?? rating);
        setBody(review.review?.body ?? body);
        await onSaved?.(review.review ?? null);
      } else {
        await onSaved?.(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Leave a rating</p>
      <h3 className="mt-2 font-serif text-2xl font-bold tracking-tight text-zinc-950">Share your experience</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">A rating is required. A written review is optional, but it makes the feedback much more useful.</p>

      <div className="mt-5 flex flex-wrap items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const active = rating >= star;
          return (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              disabled={!isAuthenticated || !canReview || submitting}
              className={`rounded-md p-1 transition-colors ${
                active ? "text-amber-500" : "text-zinc-300"
              } ${!isAuthenticated || !canReview || submitting ? "opacity-60" : "hover:text-amber-500"}`}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            >
              <Star className={`h-7 w-7 ${active ? "fill-amber-400" : ""}`} />
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-zinc-500">{helperText}</p>

      {rating > 0 ? (
        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-2 block text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">
              Add a review (optional)
            </label>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY_LENGTH))}
              maxLength={MAX_BODY_LENGTH}
              rows={5}
              disabled={!isAuthenticated || !canReview || submitting}
              placeholder="Tell buyers what was good, what was not, or what they should know before contacting the seller."
              className="min-h-[140px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-500"
            />
          </div>

          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
            <span>{bodyCount} / {MAX_BODY_LENGTH}</span>
            <span>Keep it honest and useful.</span>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!isAuthenticated || !canReview || rating === 0 || submitting}
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
        {existingReview ? (
          <span className="text-sm text-zinc-500">Your latest review will replace the previous one.</span>
        ) : null}
      </div>
    </section>
  );
}
