import type { RatingSummary } from "../../types";
import SellerRatingCard from "../ratings/SellerRatingCard";
import { SectionHeading } from "./ListingDetailsShared";

export default function ListingReviewsBlock({
  sellerUid,
  viewerUid,
  ratingSummary,
  ratingLoading,
  ratingSubmitting,
  onRateSeller,
  onRemoveRating,
}: {
  sellerUid?: string;
  viewerUid?: string;
  ratingSummary: RatingSummary | null;
  ratingLoading: boolean;
  ratingSubmitting: boolean;
  onRateSeller: (stars: number) => Promise<void> | void;
  onRemoveRating: () => Promise<void> | void;
}) {
  return (
    <div className="space-y-6 border-t border-zinc-200 pt-6">
      <SectionHeading
        eyebrow="Reviews"
        title="Trust and feedback"
        description="This section stays light until written buyer reviews are available. It should not repeat listing metrics already shown elsewhere on the page."
      />

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
