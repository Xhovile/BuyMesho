export * from "./shared";
export * from "./clothes";
export * from "./shoes";
export * from "./bags";
export * from "./accessories";

import { CLOTHES_LISTING_ITEM_CONFIGS } from "./clothes";
import { SHOES_LISTING_ITEM_CONFIGS } from "./shoes";
import { BAGS_LISTING_ITEM_CONFIGS } from "./bags";
import { ACCESSORIES_LISTING_ITEM_CONFIGS } from "./accessories";

export const FASHION_LISTING_ITEM_CONFIGS = [
  ...CLOTHES_LISTING_ITEM_CONFIGS,
  ...SHOES_LISTING_ITEM_CONFIGS,
  ...BAGS_LISTING_ITEM_CONFIGS,
  ...ACCESSORIES_LISTING_ITEM_CONFIGS,
];
