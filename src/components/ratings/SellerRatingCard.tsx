import { Star } from "lucide-react";
import type { RatingSummary } from "../../types";
import { normalizeRatingSummary } from "./ratingSummaryUtils";

type SellerRatingCardProps = {
  ratingSummary: RatingSummary | null;
  ratingLoading?: boolean;
  ratingSubmitting?: boolean;
  isAuthenticated?: boolean;
  canRate?: boolean;
  showYourRating?: boolean;
  loginPrompt?: string;
  selfRatingMessage?: string;
  onRate?: (stars: number) => Promise<void> | void;
  onRemoveRating?: () => Promise<void> | void;
};

function ratingTierLabel(averageRating: number) {
  if (averageRating >= 4.5) return "Excellent";
  if (averageRating >= 4) return "Very good";
  if (averageRating >= 3) return "Good";
  if (averageRating >= 2) return "Fair";
  return "Needs improvement";
}

export default function SellerRatingCard({
  ratingSummary,
  ratingLoading = false,
  ratingSubmitting = false,
  isAuthenticated = false,
  canRate = false,
  showYourRating = true,
  loginPrompt = "Log in to leave a seller rating.",
  selfRatingMessage = "You cannot rate your own seller account.",
  onRate,
  onRemoveRating,
}: SellerRatingCardProps) {
  const normalized = normalizeRatingSummary(ratingSummary);

  return (
    <div className="rounded-[2rem] border border-bm-border bg-bm-surface p-6 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle">Rating</p>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <div className="text-4xl font-black tracking-tight text-bm-text">
          {ratingSummary || normalized.hasRatings ? normalized.averageRating.toFixed(1) : "—"}
        </div>
        <div className="flex items-center gap-2 text-sm text-bm-text-subtle min-w-[160px]">
          <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
          {ratingSummary || normalized.hasRatings
            ? `${normalized.ratingCount} rating${normalized.ratingCount === 1 ? "" : "s"}`
            : "No ratings yet"}
        </div>
        {normalized.hasRatings ? (
          <span className="px-2.5 py-1 rounded-full bg-bm-surface-muted text-bm-text-muted text-xs font-bold uppercase tracking-[0.1em]">
            {ratingTierLabel(normalized.averageRating)}
          </span>
        ) : null}
      </div>

      {ratingLoading ? (
        <p className="mt-4 text-sm text-bm-text-subtle">Loading rating...</p>
      ) : (
        <div className="mt-5 space-y-2">
          {normalized.distribution.map((row) => (
            <div key={row.stars} className="grid grid-cols-[52px_minmax(0,1fr)_46px] items-center gap-2">
              <span className="text-xs font-bold text-bm-text-muted">{row.stars} ★</span>
              <div className="h-2 rounded-full bg-bm-surface-raised overflow-hidden">
                <div className="h-full bg-amber-400" style={{ width: `${row.percentage}%` }} />
              </div>
              <span className="text-xs text-bm-text-subtle text-right">{row.count}</span>
            </div>
          ))}
          {!normalized.hasRatings ? <p className="pt-1 text-sm text-bm-text-subtle">No ratings yet.</p> : null}
        </div>
      )}

      {showYourRating ? (
        <div className="mt-5 border-t border-bm-border pt-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle">Your rating</p>
          {!isAuthenticated ? (
            <p className="mt-2 text-sm text-bm-text-subtle">{loginPrompt}</p>
          ) : !canRate ? (
            <p className="mt-2 text-sm text-bm-text-subtle">{selfRatingMessage}</p>
          ) : (
            <>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (normalized.myRating ?? 0) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => void onRate?.(star)}
                      disabled={ratingSubmitting}
                      className={`p-1 rounded-md ${active ? "text-amber-500" : "text-bm-text-subtle"} ${
                        ratingSubmitting ? "opacity-60" : "hover:text-amber-500"
                      }`}
                      aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                    >
                      <Star className={`w-5 h-5 ${active ? "fill-amber-400" : ""}`} />
                    </button>
                  );
                })}
              </div>
              {normalized.myRating ? (
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-bm-text-muted">Your rating: {normalized.myRating}/5</p>
                  <button
                    type="button"
                    onClick={() => void onRemoveRating?.()}
                    disabled={ratingSubmitting}
                    className="text-xs font-bold text-bm-text-muted hover:text-bm-text underline underline-offset-2 disabled:opacity-50"
                  >
                    Remove rating
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-bm-text-subtle">Select a star to rate this seller.</p>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
