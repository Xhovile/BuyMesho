export * from "./shared";
export * from "./prepared";
export * from "./snacks";
export * from "./bakery";
export * from "./drinks";
export * from "./pantry";
export * from "./fresh";

import type { ListingItemConfig } from "../core";
import { PREPARED_FOOD_LISTING_ITEM_CONFIGS } from "./prepared";
import { SNACKS_LISTING_ITEM_CONFIGS } from "./snacks";
import { BAKERY_LISTING_ITEM_CONFIGS } from "./bakery";
import { DRINKS_LISTING_ITEM_CONFIGS } from "./drinks";
export {
  FOOD_CATEGORY,
  FOOD_STORAGE_OPTIONS,
  FOOD_AVAILABILITY_OPTIONS,
  FOOD_FRESHNESS_OPTIONS,
  FOOD_ALLERGEN_OPTIONS,
  FOOD_DIETARY_TAG_OPTIONS,
  FOOD_SPICE_LEVEL_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  createFoodConfig,
  textField as foodTextField,
  textareaField as foodTextareaField,
  numberField as foodNumberField,
  booleanField as foodBooleanField,
  selectField as foodSelectField,
  multiselectField as foodMultiselectField,
} from "./shared";

export * from "./prepared";
export * from "./snacks";
export * from "./bakery";
export * from "./drinks";

import { PANTRY_LISTING_ITEM_CONFIGS } from "./pantry";
import { FRESH_LISTING_ITEM_CONFIGS } from "./fresh";

export const FOOD_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...PREPARED_FOOD_LISTING_ITEM_CONFIGS,
  ...SNACKS_LISTING_ITEM_CONFIGS,
  ...BAKERY_LISTING_ITEM_CONFIGS,
  ...DRINKS_LISTING_ITEM_CONFIGS,
  ...PANTRY_LISTING_ITEM_CONFIGS,
  ...FRESH_LISTING_ITEM_CONFIGS,
];
