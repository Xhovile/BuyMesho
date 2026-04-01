export * from "./shared.js";
export * from "./prepared.js";
export * from "./snacks.js";
export * from "./bakery.js";
export * from "./drinks.js";
export * from "./pantry.js";
export * from "./fresh.js";

import type { ListingItemConfig } from "../core.js";
import { PREPARED_FOOD_LISTING_ITEM_CONFIGS } from "./prepared.js";
import { SNACKS_LISTING_ITEM_CONFIGS } from "./snacks.js";
import { BAKERY_LISTING_ITEM_CONFIGS } from "./bakery.js";
import { DRINKS_LISTING_ITEM_CONFIGS } from "./drinks.js";
import { PANTRY_LISTING_ITEM_CONFIGS } from "./pantry.js";
import { FRESH_LISTING_ITEM_CONFIGS } from "./fresh.js";

export const FOOD_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...PREPARED_FOOD_LISTING_ITEM_CONFIGS,
  ...SNACKS_LISTING_ITEM_CONFIGS,
  ...BAKERY_LISTING_ITEM_CONFIGS,
  ...DRINKS_LISTING_ITEM_CONFIGS,
  ...PANTRY_LISTING_ITEM_CONFIGS,
  ...FRESH_LISTING_ITEM_CONFIGS,
];
