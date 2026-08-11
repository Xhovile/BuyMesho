import type { RatingSummary } from "../../types";

export type NormalizedRatingSummary = {
  averageRating: number;
  ratingCount: number;
  myRating: number | null;
  distribution: Array<{
    stars: number;
    count: number;
    percentage: number;
  }>;
  hasRatings: boolean;
};

export function normalizeRatingSummary(
  ratingSummary: RatingSummary | null | undefined,
): NormalizedRatingSummary {
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const matched = ratingSummary?.distribution?.find((row) => row.stars === stars);
    const count = Number(matched?.count ?? 0);
    const percentage = Number(matched?.percentage ?? 0);
    return {
      stars,
      count: Number.isFinite(count) ? count : 0,
      percentage: Number.isFinite(percentage) ? percentage : 0,
    };
  });

  const derivedRatingCount = distribution.reduce((total, row) => total + row.count, 0);
  const ratingCount = derivedRatingCount > 0 ? derivedRatingCount : Number(ratingSummary?.ratingCount ?? 0);
  const derivedAverage =
    ratingCount > 0
      ? distribution.reduce((total, row) => total + row.stars * row.count, 0) / ratingCount
      : 0;
  const rawAverage = Number(ratingSummary?.averageRating ?? 0);
  const averageRating = ratingCount > 0 ? derivedAverage : Number.isFinite(rawAverage) ? rawAverage : 0;
  const myRatingRaw = ratingSummary?.myRating;
  const myRating = myRatingRaw === null || myRatingRaw === undefined ? null : Number(myRatingRaw);

  return {
    averageRating,
    ratingCount,
    myRating: Number.isFinite(myRating ?? NaN) ? (myRating as number) : null,
    distribution,
    hasRatings: ratingCount > 0,
  };
}
