import { Star } from "lucide-react";
import type { ListingReviewSummary } from "../../types";

const STAR_ROWS = [5, 4, 3, 2, 1];

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const dateText = date.toLocaleDateString();
  const timeText = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${dateText} • ${timeText}`;
}

export default function ListingReviewSummary({ summary }: { summary: ListingReviewSummary | null }) {
  const distribution = STAR_ROWS.map((stars) => {
    const matched = summary?.distribution.find((row) => row.stars === stars);
    return {
      stars,
      count: matched?.count ?? 0,
      percentage: matched?.percentage ?? 0,
    };
  });

  const derivedRatingCount = distribution.reduce((total, row) => total + row.count, 0);
  const ratingCount = derivedRatingCount > 0 ? derivedRatingCount : (summary?.ratingCount ?? 0);
  const derivedAverage =
    ratingCount > 0 ? distribution.reduce((total, row) => total + row.stars * row.count, 0) / ratingCount : 0;
  const averageRating = ratingCount > 0 ? derivedAverage.toFixed(1) : (summary?.averageRating ?? 0).toFixed(1);
  const latestReviewLabel = formatDateTime(summary?.latestReviewAt);

  return (
    <section className="rounded-3xl border border-bm-border bg-gradient-to-br from-bm-surface-muted via-bm-surface to-bm-surface p-5 shadow-sm ring-1 ring-bm-border-subtle sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-bm-text-subtle">Review summary</p>
          <div className="mt-3 flex items-end gap-4">
            <div className="text-5xl font-black tracking-tight text-bm-text">{averageRating}</div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-1 text-sm font-bold text-bm-text">
                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                <span>{ratingCount > 0 ? `${ratingCount} review${ratingCount === 1 ? "" : "s"}` : "No reviews yet"}</span>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-bm-text-subtle">
                Latest review <span className="text-bm-text-muted normal-case tracking-normal">{latestReviewLabel}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {distribution.map((row) => (
          <div key={row.stars} className="grid grid-cols-[44px_minmax(0,1fr)_42px] items-center gap-3">
            <span className="text-xs font-extrabold text-bm-text-subtle">{row.stars}★</span>
            <div className="h-2 overflow-hidden rounded-full bg-bm-surface-muted">
              <div className="h-full rounded-full bg-bm-brand" style={{ width: `${row.percentage}%` }} />
            </div>
            <span className="text-right text-xs font-semibold text-bm-text-subtle">{row.count}</span>
          </div>
        ))}
      </div>

      {!ratingCount ? (
        <div className="mt-5 rounded-2xl border border-bm-border-subtle bg-bm-surface-muted px-4 py-3 text-sm text-bm-text-subtle">
          No written reviews yet. Be the first to rate this listing.
        </div>
      ) : null}
    </section>
  );
}
