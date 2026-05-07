import { Star } from "lucide-react";
import type { ListingReviewSummary } from "../../types";
import { formatDate } from "../listingDetails/ListingDetailsShared";

const STAR_ROWS = [5, 4, 3, 2, 1];

export default function ListingReviewSummary({ summary }: { summary: ListingReviewSummary | null }) {
  const ratingCount = summary?.ratingCount ?? 0;
  const averageRating = summary ? summary.averageRating.toFixed(1) : "0.0";
  const latestReviewLabel = summary?.latestReviewAt ? formatDate(summary.latestReviewAt) : "—";

  const distribution = STAR_ROWS.map((stars) => {
    const matched = summary?.distribution.find((row) => row.stars === stars);
    return {
      stars,
      count: matched?.count ?? 0,
      percentage: matched?.percentage ?? 0,
    };
  });

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-400">Review summary</p>
          <h3 className="mt-2 font-serif text-2xl font-bold tracking-tight text-zinc-950">What buyers are saying</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Written feedback helps shoppers judge the quality of this listing before they contact the seller.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="text-3xl font-black tracking-tight text-zinc-950">{averageRating}</div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm font-bold text-zinc-700">
              <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
              <span>{ratingCount > 0 ? `${ratingCount} review${ratingCount === 1 ? "" : "s"}` : "No reviews yet"}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Latest review: <span className="text-zinc-600 normal-case tracking-normal">{latestReviewLabel}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {distribution.map((row) => (
          <div key={row.stars} className="grid grid-cols-[44px_minmax(0,1fr)_42px] items-center gap-3">
            <span className="text-xs font-extrabold text-zinc-600">{row.stars}★</span>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div className="h-full rounded-full bg-zinc-900" style={{ width: `${row.percentage}%` }} />
            </div>
            <span className="text-right text-xs font-semibold text-zinc-500">{row.count}</span>
          </div>
        ))}
      </div>

      {!ratingCount ? (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
          No written reviews yet. Be the first to rate this listing.
        </div>
      ) : null}
    </section>
  );
}
