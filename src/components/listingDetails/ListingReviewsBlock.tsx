import { ShieldCheck, Star } from "lucide-react";
import type { Listing, RatingSummary } from "../../types";
import { SectionHeading, StatTile } from "./ListingDetailsShared";
import ListingTrustBlock, { type SellerProfile } from "./ListingTrustBlock";

export default function ListingReviewsBlock({
  sellerUid,
  viewerUid,
  ratingSummary,
  listing,
  seller,
}: {
  sellerUid?: string;
  viewerUid?: string;
  ratingSummary: RatingSummary | null;
  listing: Listing;
  seller: SellerProfile | null;
}) {
  return (
    <div className="space-y-6 border-t border-zinc-200 pt-6">
      <SectionHeading
        eyebrow="Reviews"
        title="Trust and feedback"
        description="This section stays light until written buyer reviews are available. It should not repeat listing metrics already shown elsewhere on the page."
      />

      <ListingTrustBlock listing={listing} seller={seller} />

      <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Average rating"
          value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"}
          icon={<Star className="h-4 w-4" />}
        />
        <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <SellerRatingCard
        ratingSummary={ratingSummary}
        ratingLoading={ratingLoading}
        ratingSubmitting={ratingSubmitting}
        isAuthenticated={!!viewerUid}
        canRate={!!viewerUid && !!sellerUid && viewerUid !== sellerUid}
        onRate={onRateSeller}
        onRemoveRating={onRemoveRating}
      />
    </div>
  );
}
