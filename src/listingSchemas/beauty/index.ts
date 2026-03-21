export * from "./shared";
export * from "./skincare";
export * from "./haircare";
export * from "./makeup";
export * from "./fragrance";
export * from "./services";

import type { ListingItemConfig } from "../core";
import { SKINCARE_LISTING_ITEM_CONFIGS } from "./skincare";
import { HAIRCARE_LISTING_ITEM_CONFIGS } from "./haircare";
import { MAKEUP_LISTING_ITEM_CONFIGS } from "./makeup";
import { FRAGRANCE_LISTING_ITEM_CONFIGS } from "./fragrance";
import { BEAUTY_SERVICES_LISTING_ITEM_CONFIGS } from "./services";

export const BEAUTY_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...SKINCARE_LISTING_ITEM_CONFIGS,
  ...HAIRCARE_LISTING_ITEM_CONFIGS,
  ...MAKEUP_LISTING_ITEM_CONFIGS,
  ...FRAGRANCE_LISTING_ITEM_CONFIGS,
  ...BEAUTY_SERVICES_LISTING_ITEM_CONFIGS,
];
