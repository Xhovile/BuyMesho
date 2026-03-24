import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  FOOD_DIETARY_TAG_OPTIONS,
  FOOD_STORAGE_OPTIONS,
  booleanField,
  createFoodConfig,
  multiselectField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createFreshConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  freshnessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "source_origin",
      label: "Source / Origin",
      advanced: true,
      placeholder: "e.g. local farm, market, imported",
    }),
    textField({
      key: "quantity_or_weight",
      label: "Quantity / Weight",
      required: true,
      placeholder: "e.g. 1kg, tray of 30, bunch of 5",
    }),
    selectField({
      key: "produce_grade",
      label: "Grade",
      required: true,
      options: ["Premium", "Standard", "Mixed", "Budget / Quick Sale"],
    }),
    multiselectField({
      key: "dietary_tags",
      label: "Dietary Tags",
      advanced: true,
      options: FOOD_DIETARY_TAG_OPTIONS,
    }),
  ];

  const styleFields: ListingSpecField[] = [...(params.styleFields || [])];

  const freshnessFields: ListingSpecField[] = [
    textField({
      key: "harvested_or_received_on",
      label: "Harvested / Received On",
      required: true,
      placeholder: "e.g. Today morning",
    }),
    textField({
      key: "best_used_by",
      label: "Best Used By",
      required: true,
      placeholder: "e.g. Within 2 days",
    }),
    selectField({
      key: "freshness_status",
      label: "Freshness Status",
      required: true,
      options: ["Very Fresh", "Fresh", "Use Soon", "Quick Sale"],
    }),
    selectField({
      key: "storage_requirement",
      label: "Storage Requirement",
      required: true,
      options: FOOD_STORAGE_OPTIONS,
    }),
    booleanField({
      key: "refrigeration_needed",
      label: "Refrigeration Needed",
      required: true,
    }),
    booleanField({
      key: "cleaned_or_sorted",
      label: "Cleaned / Sorted",
      advanced: true,
    }),
    ...(params.freshnessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra freshness details",
    }),
  ];

  return createFoodConfig({
    subcategory: "Fresh Produce & Protein",
    itemType: params.itemType,
    fields: [...identityFields, ...styleFields, ...freshnessFields, ...noteFields],
    fieldGroups: [
      { title: "Product Identity", keys: identityFields.map((f) => f.key) },
      { title: "Type & Quality", keys: styleFields.map((f) => f.key) },
      { title: "Freshness & Storage", keys: freshnessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "quantity_or_weight",
      "produce_grade",
      "harvested_or_received_on",
      "best_used_by",
      "freshness_status",
      "storage_requirement",
      "refrigeration_needed",
      ...(params.requiredKeys || []),
    ],
  });
}

export const FRUITS_CONFIG = createFreshConfig({
  itemType: "Fruits",
  styleFields: [
    selectField({
      key: "fruit_type",
      label: "Fruit Type",
      required: true,
      options: ["Apples", "Bananas", "Mangoes", "Oranges", "Avocadoes", "Mixed Fruit", "Other"],
    }),
    selectField({
      key: "ripeness",
      label: "Ripeness",
      required: true,
      options: ["Unripe", "Ready to Eat", "Mixed Ripeness", "Very Ripe"],
    }),
  ],
  requiredKeys: ["fruit_type", "ripeness"],
});

export const VEGETABLES_CONFIG = createFreshConfig({
  itemType: "Vegetables",
  styleFields: [
    selectField({
      key: "vegetable_type",
      label: "Vegetable Type",
      required: true,
      options: [
        "Leafy Greens",
        "Tomatoes",
        "Onions",
        "Cabbage",
        "Carrots",
        "Mixed Vegetables",
        "Other",
      ],
    }),
    selectField({
      key: "cut_or_whole",
      label: "Cut or Whole",
      advanced: true,
      options: ["Whole", "Cut", "Mixed"],
    }),
  ],
  requiredKeys: ["vegetable_type"],
});

export const EGGS_CONFIG = createFreshConfig({
  itemType: "Eggs",
  styleFields: [
    selectField({
      key: "egg_type",
      label: "Egg Type",
      required: true,
      options: ["Chicken Eggs", "Duck Eggs", "Other"],
    }),
    textField({
      key: "tray_or_count",
      label: "Tray / Count",
      required: true,
      placeholder: "e.g. tray of 30, pack of 6",
    }),
    booleanField({
      key: "cracked_eggs_present",
      label: "Any Cracked Eggs",
      required: true,
    }),
  ],
  requiredKeys: ["egg_type", "tray_or_count", "cracked_eggs_present"],
});

export const DAIRY_CONFIG = createFreshConfig({
  itemType: "Dairy",
  styleFields: [
    selectField({
      key: "dairy_type",
      label: "Dairy Type",
      required: true,
      options: ["Milk", "Yoghurt", "Cheese", "Butter", "Cream", "Other"],
    }),
    booleanField({
      key: "pasteurized",
      label: "Pasteurized",
      advanced: true,
    }),
  ],
  requiredKeys: ["dairy_type"],
});

export const MEAT_FISH_CONFIG = createFreshConfig({
  itemType: "Meat & Fish",
  styleFields: [
    selectField({
      key: "protein_type",
      label: "Protein Type",
      required: true,
      options: ["Beef", "Chicken", "Goat", "Pork", "Fish", "Mixed", "Other"],
    }),
    selectField({
      key: "fresh_or_frozen",
      label: "Fresh or Frozen",
      required: true,
      options: ["Fresh", "Frozen", "Chilled"],
    }),
    textField({
      key: "cut_type",
      label: "Cut Type",
      advanced: true,
      placeholder: "e.g. fillet, drumsticks, steak pieces",
    }),
    booleanField({
      key: "cleaned_and_portioned",
      label: "Cleaned / Portioned",
      advanced: true,
    }),
  ],
  requiredKeys: ["protein_type", "fresh_or_frozen"],
});

export const FRESH_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  FRUITS_CONFIG,
  VEGETABLES_CONFIG,
  EGGS_CONFIG,
  DAIRY_CONFIG,
  MEAT_FISH_CONFIG,
];
