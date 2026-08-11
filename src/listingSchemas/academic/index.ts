export * from "./shared.js";
export * from "./tutoring.js";
export * from "./materials.js";
export * from "./documents.js";
export * from "./design.js";

import type { ListingItemConfig } from "../core.js";
import { TUTORING_LISTING_ITEM_CONFIGS } from "./tutoring.js";
import { MATERIALS_LISTING_ITEM_CONFIGS } from "./materials.js";
import { DOCUMENTS_LISTING_ITEM_CONFIGS } from "./documents.js";
import { DESIGN_LISTING_ITEM_CONFIGS } from "./design.js";

export const ACADEMIC_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...TUTORING_LISTING_ITEM_CONFIGS,
  ...MATERIALS_LISTING_ITEM_CONFIGS,
  ...DOCUMENTS_LISTING_ITEM_CONFIGS,
  ...DESIGN_LISTING_ITEM_CONFIGS,
];
