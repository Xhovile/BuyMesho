import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  FOOD_ALLERGEN_OPTIONS,
  FOOD_AVAILABILITY_OPTIONS,
  FOOD_DIETARY_TAG_OPTIONS,
  FOOD_FRESHNESS_OPTIONS,
  FOOD_STORAGE_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  booleanField,
  createFoodConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createDrinkConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  freshnessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "Use No Brand if homemade",
    }),
    textField({
      key: "flavor",
      label: "Flavor",
      advanced: true,
      placeholder: "e.g. orange, berry, cola",
    }),
    numberField({
      key: "volume_ml",
      label: "Volume (ml)",
      required: true,
      placeholder: "e.g. 500",
    }),
    selectField({
      key: "packaging_type",
      label: "Packaging Type",
      required: true,
      options: FOOD_PACKAGING_OPTIONS,
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    multiselectField({
      key: "dietary_tags",
      label: "Dietary Tags",
      advanced: true,
      options: FOOD_DIETARY_TAG_OPTIONS,
    }),
    multiselectField({
      key: "allergens",
      label: "Allergens",
      advanced: true,
      options: FOOD_ALLERGEN_OPTIONS,
    }),
    selectField({
      key: "availability",
      label: "Availability",
      required: true,
      options: FOOD_AVAILABILITY_OPTIONS,
    }),
  ];

  const freshnessFields: ListingSpecField[] = [
    textField({
      key: "expiry_or_best_before",
      label: "Expiry / Best Before",
      required: true,
      placeholder: "e.g. 12 Oct 2026",
    }),
    selectField({
      key: "storage_requirement",
      label: "Storage Requirement",
      required: true,
      options: FOOD_STORAGE_OPTIONS,
    }),
    selectField({
      key: "freshness_status",
      label: "Freshness Status",
      required: true,
      options: FOOD_FRESHNESS_OPTIONS,
    }),
    booleanField({
      key: "seal_intact",
      label: "Seal Intact",
      required: true,
    }),
    booleanField({
      key: "opened_before",
      label: "Opened Before",
      required: true,
    }),
    ...(params.freshnessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra drink details",
    }),
  ];

  return createFoodConfig({
    subcategory: "Drinks",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...freshnessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Drink Identity", keys: identityFields.map((f) => f.key) },
      { title: "Type & Nutrition", keys: styleFields.map((f) => f.key) },
      { title: "Freshness & Safety", keys: freshnessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "volume_ml",
      "packaging_type",
      "availability",
      "expiry_or_best_before",
      "storage_requirement",
      "freshness_status",
      "seal_intact",
      "opened_before",
      ...(params.requiredKeys || []),
    ],
  });
}

export const BOTTLED_WATER_CONFIG = createDrinkConfig({
  itemType: "Bottled Water",
  styleFields: [
    selectField({
      key: "water_type",
      label: "Water Type",
      required: true,
      options: ["Still", "Sparkling", "Flavoured Water", "Other"],
    }),
    selectField({
      key: "source_type",
      label: "Source Type",
      advanced: true,
      options: ["Mineral", "Purified", "Spring", "Other", "Not Sure"],
    }),
  ],
  requiredKeys: ["water_type"],
});

export const SOFT_DRINKS_CONFIG = createDrinkConfig({
  itemType: "Soft Drinks",
  styleFields: [
    selectField({
      key: "soft_drink_type",
      label: "Soft Drink Type",
      required: true,
      options: ["Cola", "Orange", "Lemon-Lime", "Tonic", "Ginger", "Other"],
    }),
    booleanField({
      key: "carbonated",
      label: "Carbonated",
      advanced: true,
    }),
    selectField({
      key: "sugar_level",
      label: "Sugar Level",
      advanced: true,
      options: ["Regular", "Low Sugar", "Zero Sugar", "Not Sure"],
    }),
  ],
  requiredKeys: ["soft_drink_type"],
});

export const JUICE_CONFIG = createDrinkConfig({
  itemType: "Juice",
  styleFields: [
    selectField({
      key: "juice_type",
      label: "Juice Type",
      required: true,
      options: ["Fruit Juice", "Nectar", "Smoothie", "Mixed Juice", "Other"],
    }),
    selectField({
      key: "juice_content",
      label: "Juice Content",
      advanced: true,
      options: ["100% Juice", "Partial Juice", "Not Sure"],
    }),
  ],
  requiredKeys: ["juice_type"],
});

export const ENERGY_DRINKS_CONFIG = createDrinkConfig({
  itemType: "Energy Drinks",
  styleFields: [
    selectField({
      key: "caffeine_level",
      label: "Caffeine Level",
      required: true,
      options: ["Low", "Medium", "High", "Not Sure"],
    }),
    selectField({
      key: "sugar_level",
      label: "Sugar Level",
      advanced: true,
      options: ["Regular", "Low Sugar", "Zero Sugar", "Not Sure"],
    }),
    booleanField({
      key: "carbonated",
      label: "Carbonated",
      advanced: true,
    }),
  ],
  requiredKeys: ["caffeine_level"],
});

export const TEA_COFFEE_COCOA_CONFIG = createDrinkConfig({
  itemType: "Tea / Coffee / Cocoa",
  styleFields: [
    selectField({
      key: "drink_type",
      label: "Drink Type",
      required: true,
      options: ["Tea", "Coffee", "Cocoa", "Iced Tea", "Other"],
    }),
    selectField({
      key: "serving_style",
      label: "Serving Style",
      required: true,
      options: ["Ready Bottled", "Prepared Hot", "Prepared Cold", "Powder / Sachet"],
    }),
    booleanField({
      key: "sweetened",
      label: "Sweetened",
      advanced: true,
    }),
  ],
  requiredKeys: ["drink_type", "serving_style"],
});

export const DRINKS_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  BOTTLED_WATER_CONFIG,
  SOFT_DRINKS_CONFIG,
  JUICE_CONFIG,
  ENERGY_DRINKS_CONFIG,
  TEA_COFFEE_COCOA_CONFIG,
];
