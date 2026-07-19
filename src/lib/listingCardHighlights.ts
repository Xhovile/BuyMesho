import { getAcademicCardSpecs } from "./listingCardDisplay/academic";
import { getBeautyCardSpecs } from "./listingCardDisplay/beauty";
import { getElectronicsCardSpecs } from "./listingCardDisplay/electronics";
import { getFashionCardSpecs } from "./listingCardDisplay/fashion";
import { getFoodCardSpecs } from "./listingCardDisplay/food";
import {
  toFiniteNumber,
  toTrimmedString,
  type ListingCardData,
  type ListingCardSpec,
} from "./listingCardDisplayShared";

export type { ListingCardData, ListingCardSpec } from "./listingCardDisplayShared";

function getListingCardDisplayFields(listing: ListingCardData): ListingCardSpec[] {
  switch (listing.category) {
    case "Food & Snacks":
      return getFoodCardSpecs(listing) ?? [];
    case "Fashion & Clothing":
      return getFashionCardSpecs(listing) ?? [];
    case "Academic Services":
      return getAcademicCardSpecs(listing) ?? [];
    case "Electronics & Gadgets":
      return getElectronicsCardSpecs(listing) ?? [];
    case "Beauty & Personal Care":
      return getBeautyCardSpecs(listing) ?? [];
    default:
      return [];
  }
}

export function getListingCardHighlights(listing: ListingCardData, limit = 3): string[] {
  return getListingCardSpecs(listing, limit).map((spec) => spec.value);
}

export function getListingCardSpecs(listing: ListingCardData, limit = 3): ListingCardSpec[] {
  return getListingCardDisplayFields(listing).slice(0, Math.min(limit, 3));
}

export function getListingConditionLabel(condition?: string | null): string | null {
  const normalized = toTrimmedString(condition);
  if (!normalized) return null;

  const vagueConditions = new Set(["very good", "good", "fair", "excellent", "like new"]);
  if (vagueConditions.has(normalized.toLowerCase())) return null;

  return normalized[0].toUpperCase() + normalized.slice(1);
}

export function getListingAvailabilityLabel(
  quantity?: number | string | null,
  soldQuantity?: number | string | null,
): string | null {
  const safeQuantity = toFiniteNumber(quantity);
  if (safeQuantity === null) return null;
  const safeSoldQuantity = Math.max(0, toFiniteNumber(soldQuantity) ?? 0);
  const availableQuantity = Math.max(0, safeQuantity - safeSoldQuantity);
  if (availableQuantity <= 0) return "Sold out";
  if (availableQuantity <= 3) return `${availableQuantity.toLocaleString()} left`;
  return null;
}
