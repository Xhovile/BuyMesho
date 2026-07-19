import type { Listing, RatingSummary } from "../../types";

export type SellerProfile = {
  uid?: string;
  business_name?: string;
  business_logo?: string;
  university?: string;
  bio?: string;
  is_verified?: boolean;
  join_date?: string;
  profile_views?: number;
  ratingSummary?: RatingSummary | null;
};

export type ListingActionResponse = {
  success: boolean;
  listing?: Listing;
  available_quantity?: number;
};

export type SectionKey = "details" | "explore" | "reviews";

export const specValue = (value: unknown) =>
  Array.isArray(value)
    ? value.length
      ? value.join(", ")
      : "—"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : value === null || value === undefined || value === ""
        ? "—"
        : String(value);

export const readHiddenListingIds = () => {
  try {
    const raw = localStorage.getItem("hiddenListingIds");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => Number.isInteger(x)) : [];
  } catch {
    return [] as number[];
  }
};

export const readHiddenSellerUids = () => {
  try {
    const raw = localStorage.getItem("hiddenSellerUids");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [] as string[];
  }
};

export const hideListingId = (listingIdToHide: number) => {
  try {
    const current = readHiddenListingIds();
    if (!current.includes(listingIdToHide)) {
      localStorage.setItem("hiddenListingIds", JSON.stringify([...current, listingIdToHide]));
    }
  } catch {
    localStorage.setItem("hiddenListingIds", JSON.stringify([listingIdToHide]));
  }
};

export const hideSellerUid = (sellerUid: string) => {
  try {
    const current = readHiddenSellerUids();
    if (!current.includes(sellerUid)) {
      localStorage.setItem("hiddenSellerUids", JSON.stringify([...current, sellerUid]));
    }
  } catch {
    localStorage.setItem("hiddenSellerUids", JSON.stringify([sellerUid]));
  }
};
