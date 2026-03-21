export * from "./shared";
export * from "./tutoring";
export * from "./materials";
export * from "./documents";
export * from "./design";

import type { ListingItemConfig } from "../core";
import { TUTORING_LISTING_ITEM_CONFIGS } from "./tutoring";
import { MATERIALS_LISTING_ITEM_CONFIGS } from "./materials";
import { DOCUMENTS_LISTING_ITEM_CONFIGS } from "./documents";
import { DESIGN_LISTING_ITEM_CONFIGS } from "./design";

export const ACADEMIC_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...TUTORING_LISTING_ITEM_CONFIGS,
  ...MATERIALS_LISTING_ITEM_CONFIGS,
  ...DOCUMENTS_LISTING_ITEM_CONFIGS,
  ...DESIGN_LISTING_ITEM_CONFIGS,
];
