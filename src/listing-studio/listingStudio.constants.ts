import type { ListingMode } from "../types";

export const LISTING_MODE_OPTIONS: ListingMode[] = ["normal", "deal", "wholesale"];

export const CONDITION_OPTIONS_BY_CATEGORY: Record<string, { label: string; options: string[] }> = {
  "Food & Snacks": { label: "Freshness", options: ["fresh", "packed", "prepared", "frozen"] },
  "Fashion & Clothing": { label: "Condition", options: ["new", "like new", "used", "thrifted"] },
  "Academic Services": { label: "Service Status", options: ["available", "ongoing", "completed", "remote"] },
  "Electronics & Gadgets": { label: "Condition", options: ["new", "used", "refurbished"] },
  "Beauty & Personal Care": { label: "Condition", options: ["new", "opened", "used", "refill"] },
};

export function getConditionConfig(category: string) {
  return CONDITION_OPTIONS_BY_CATEGORY[category] || {
    label: "Condition",
    options: ["new", "used", "refurbished"],
  };
}
