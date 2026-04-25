import { ShieldCheck, Star, Eye } from "lucide-react";
import type { Listing, RatingSummary } from "../../types";
import { SectionHeading, StatTile } from "./ListingDetailsShared";

export default function ListingReviewsBlock({
  listing,
  ratingSummary,
}: {
  listing: Listing;
  ratingSummary: RatingSummary | null;
}) {
  return (
    <div className="space-y-6 border-t border-zinc-200 pt-6">
      <SectionHeading
        eyebrow="Reviews"
        title="Trust and feedback"
        description="This is the final trust layer. It confirms credibility without competing with the listing summary or the WhatsApp CTA."
      />

      <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Average rating"
          value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"}
          icon={<Star className="h-4 w-4" />}
        />
        <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatTile label="Listing views" value={listing.views_count ?? 0} icon={<Eye className="h-4 w-4" />} />
        <StatTile label="WhatsApp clicks" value={listing.whatsapp_clicks ?? 0} icon={<Eye className="h-4 w-4" />} />
      </div>

      <div className="space-y-3 border-t border-zinc-200 pt-6">
        <div className="flex items-start gap-3">
          <div className="text-zinc-500 pt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-zinc-900">Written reviews are not live yet</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-zinc-600">
              The rating summary is already available. Buyer comments and review media can be added later without changing the section order or the page hierarchy.
            </p>
          </div>
        </div>

        {ratingSummary?.ratingCount ? (
          <p className="text-sm text-zinc-500">
            {ratingSummary.ratingCount} rating{ratingSummary.ratingCount === 1 ? "" : "s"} are already recorded for this seller.
          </p>
        ) : (
          <p className="text-sm text-zinc-500">No ratings have been recorded yet.</p>
        )}
      </div>
    </div>
  );
}
