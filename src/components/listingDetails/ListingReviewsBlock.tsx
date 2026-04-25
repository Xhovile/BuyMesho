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
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Reviews"
        title="Trust and feedback"
        description="This is the final trust layer. It confirms credibility without competing with the listing summary or the WhatsApp CTA."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Average rating"
          value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"}
          icon={<Star className="h-4 w-4" />}
        />
        <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
        <StatTile label="Listing views" value={listing.views_count ?? 0} icon={<Eye className="h-4 w-4" />} />
        <StatTile label="WhatsApp clicks" value={listing.whatsapp_clicks ?? 0} icon={<Eye className="h-4 w-4" />} />
      </div>

      <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black tracking-tight text-zinc-900">Review feed coming soon</h3>
            <p className="max-w-3xl text-sm leading-7 text-zinc-600">
              The rating summary is already live. A full buyer review list can be layered in later without changing the page hierarchy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
