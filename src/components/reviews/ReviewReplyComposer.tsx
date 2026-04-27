import { useEffect, useState } from "react";
import { MessageSquareReply } from "lucide-react";
import type { ListingReview } from "../../types";
import { apiFetch } from "../../lib/api";

type ReviewReplyComposerProps = {
  listingId: number;
  review: ListingReview;
  canReply: boolean;
  onSaved?: (review: ListingReview) => void | Promise<void>;
};

const MAX_REPLY_LENGTH = 500;

export default function ReviewReplyComposer({ listingId, review, canReply, onSaved }: ReviewReplyComposerProps) {
  const [reply, setReply] = useState(review.seller_reply ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReply(review.seller_reply ?? "");
    setError(null);
  }, [review.id, review.seller_reply]);

  const handleSave = async () => {
    if (!canReply) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = (await apiFetch(`/api/listings/${listingId}/reviews/${review.id}/reply`, {
        method: "PATCH",
        body: JSON.stringify({ reply: reply.trim() || null }),
      })) as { review?: ListingReview | null } | null;

      if (!result?.review) {
        throw new Error("Failed to save reply.");
      }

      setReply(result.review.seller_reply ?? "");
      await onSaved?.(result.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save reply.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-500">
        <MessageSquareReply className="h-4 w-4" />
        Reply as seller
      </div>

      <textarea
        value={reply}
        onChange={(event) => setReply(event.target.value.slice(0, MAX_REPLY_LENGTH))}
        rows={4}
        disabled={!canReply || submitting}
        placeholder="Write a short reply to this review..."
        className="mt-3 min-h-[110px] w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm leading-6 text-zinc-900 outline-none transition focus:border-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500"
      />

      <div className="mt-2 flex items-center justify-between gap-3 text-xs font-semibold text-zinc-500">
        <span>{reply.length} / {MAX_REPLY_LENGTH}</span>
        <span>{reply.trim() ? "Visible to buyers." : "Leave blank to clear the reply."}</span>
      </div>

      {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canReply || submitting}
          className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save reply"}
        </button>
        <span className="text-xs font-medium text-zinc-500">This response appears under the review.</span>
      </div>
    </div>
  );
}
