export * from "./shared.js";
export * from "./clothes.js";
export * from "./shoes.js";
export * from "./bags.js";
export * from "./accessories.js";

import { CLOTHES_LISTING_ITEM_CONFIGS } from "./clothes.js";
import { SHOES_LISTING_ITEM_CONFIGS } from "./shoes.js";
import { BAGS_LISTING_ITEM_CONFIGS } from "./bags.js";
import { ACCESSORIES_LISTING_ITEM_CONFIGS } from "./accessories.js";

export const FASHION_LISTING_ITEM_CONFIGS = [
  ...CLOTHES_LISTING_ITEM_CONFIGS,
  ...SHOES_LISTING_ITEM_CONFIGS,
  ...BAGS_LISTING_ITEM_CONFIGS,
  ...ACCESSORIES_LISTING_ITEM_CONFIGS,
];
