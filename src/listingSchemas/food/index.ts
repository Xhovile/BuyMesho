import type { ListingItemConfig } from "../core";
import { PREPARED_FOOD_LISTING_ITEM_CONFIGS } from "./prepared";
import { SNACKS_LISTING_ITEM_CONFIGS } from "./snacks";
import { BAKERY_LISTING_ITEM_CONFIGS } from "./bakery";
import { DRINKS_LISTING_ITEM_CONFIGS } from "./drinks";

export * from "./prepared";
export * from "./snacks";
export * from "./bakery";
export * from "./drinks";

export const FOOD_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...PREPARED_FOOD_LISTING_ITEM_CONFIGS,
  ...SNACKS_LISTING_ITEM_CONFIGS,
  ...BAKERY_LISTING_ITEM_CONFIGS,
  ...DRINKS_LISTING_ITEM_CONFIGS,
];
