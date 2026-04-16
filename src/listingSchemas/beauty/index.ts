export * from "./shared.js";
export * from "./skincare.js";
export * from "./haircare.js";
export * from "./makeup.js";
export * from "./fragrance.js";
export * from "./services.js";

import type { ListingItemConfig } from "../core.js";
import { SKINCARE_LISTING_ITEM_CONFIGS } from "./skincare.js";
import { HAIRCARE_LISTING_ITEM_CONFIGS } from "./haircare.js";
import { MAKEUP_LISTING_ITEM_CONFIGS } from "./makeup.js";
import { FRAGRANCE_LISTING_ITEM_CONFIGS } from "./fragrance.js";
import { BEAUTY_SERVICES_LISTING_ITEM_CONFIGS } from "./services.js";

export const BEAUTY_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...SKINCARE_LISTING_ITEM_CONFIGS,
  ...HAIRCARE_LISTING_ITEM_CONFIGS,
  ...MAKEUP_LISTING_ITEM_CONFIGS,
  ...FRAGRANCE_LISTING_ITEM_CONFIGS,
  ...BEAUTY_SERVICES_LISTING_ITEM_CONFIGS,
];
