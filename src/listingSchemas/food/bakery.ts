import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  FOOD_ALLERGEN_OPTIONS,
  FOOD_DIETARY_TAG_OPTIONS,
  FOOD_FRESHNESS_OPTIONS,
  FOOD_STORAGE_OPTIONS,
  booleanField,
  createFoodConfig,
  multiselectField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createBakeryConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  freshnessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "brand_or_baker",
      label: "Brand / Baker",
      required: true,
      placeholder: "Use seller name if homemade",
    }),
    textField({
      key: "flavor_or_filling",
      label: "Flavor / Filling",
      advanced: true,
      placeholder: "e.g. vanilla, meat filling, jam",
    }),
    textField({
      key: "quantity_or_size",
      label: "Quantity / Size",
      required: true,
      placeholder: "e.g. 1 loaf, box of 6, 500g",
    }),
    selectField({
      key: "sweet_or_savory",
      label: "Sweet or Savory",
      required: true,
      options: ["Sweet", "Savory", "Mixed"],
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
  ];

  const freshnessFields: ListingSpecField[] = [
    textField({
      key: "baked_on",
      label: "Baked On",
      required: true,
      placeholder: "e.g. Today morning",
    }),
    textField({
      key: "best_before",
      label: "Best Before",
      required: true,
      placeholder: "e.g. Tomorrow evening",
    }),
    selectField({
      key: "freshness_status",
      label: "Freshness Status",
      required: true,
      options: FOOD_FRESHNESS_OPTIONS,
    }),
    selectField({
      key: "storage_requirement",
      label: "Storage Requirement",
      required: true,
      options: FOOD_STORAGE_OPTIONS,
    }),
    booleanField({
      key: "sealed_packaging",
      label: "Sealed Packaging",
      advanced: true,
    }),
    booleanField({
      key: "made_today",
      label: "Made Today",
      advanced: true,
    }),
    ...(params.freshnessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra bakery details",
    }),
  ];

  return createFoodConfig({
    subcategory: "Bakery",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...freshnessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Bakery Identity", keys: identityFields.map((f) => f.key) },
      { title: "Type & Diet", keys: styleFields.map((f) => f.key) },
      { title: "Freshness", keys: freshnessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand_or_baker",
      "quantity_or_size",
      "sweet_or_savory",
      "baked_on",
      "best_before",
      "freshness_status",
      "storage_requirement",
      ...(params.requiredKeys || []),
    ],
  });
}

export const BREAD_CONFIG = createBakeryConfig({
  itemType: "Bread",
  styleFields: [
    selectField({
      key: "bread_type",
      label: "Bread Type",
      required: true,
      options: ["White", "Brown", "Whole Wheat", "Sweet Bread", "Bun / Roll", "Other"],
    }),
    booleanField({
      key: "sliced",
      label: "Sliced",
      advanced: true,
    }),
  ],
  requiredKeys: ["bread_type"],
});

export const CAKES_CUPCAKES_CONFIG = createBakeryConfig({
  itemType: "Cakes & Cupcakes",
  styleFields: [
    selectField({
      key: "bakery_type",
      label: "Cake Type",
      required: true,
      options: ["Cake", "Cupcake", "Celebration Cake", "Slice", "Other"],
    }),
    booleanField({
      key: "frosting_or_icing",
      label: "Frosting / Icing Present",
      advanced: true,
    }),
  ],
  requiredKeys: ["bakery_type"],
});

export const DOUGHNUTS_PASTRIES_CONFIG = createBakeryConfig({
  itemType: "Doughnuts & Pastries",
  styleFields: [
    selectField({
      key: "bakery_type",
      label: "Pastry Type",
      required: true,
      options: ["Doughnut", "Croissant", "Puff Pastry", "Danish", "Turnover", "Other"],
    }),
  ],
  requiredKeys: ["bakery_type"],
});

export const COOKIES_CONFIG = createBakeryConfig({
  itemType: "Cookies",
  styleFields: [
    selectField({
      key: "cookie_type",
      label: "Cookie Type",
      required: true,
      options: ["Chocolate Chip", "Butter Cookie", "Oat Cookie", "Mixed", "Other"],
    }),
  ],
  requiredKeys: ["cookie_type"],
});

export const PIES_SCONES_CONFIG = createBakeryConfig({
  itemType: "Pies & Scones",
  styleFields: [
    selectField({
      key: "bakery_type",
      label: "Pie / Scone Type",
      required: true,
      options: ["Meat Pie", "Fruit Pie", "Scone", "Savory Pie", "Other"],
    }),
    booleanField({
      key: "heated_before_serving",
      label: "Best Served Warm",
      advanced: true,
    }),
  ],
  requiredKeys: ["bakery_type"],
});

export const BAKERY_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  BREAD_CONFIG,
  CAKES_CUPCAKES_CONFIG,
  DOUGHNUTS_PASTRIES_CONFIG,
  COOKIES_CONFIG,
  PIES_SCONES_CONFIG,
];
