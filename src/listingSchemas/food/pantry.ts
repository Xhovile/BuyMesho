import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  FOOD_FRESHNESS_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  FOOD_SPICE_LEVEL_OPTIONS,
  FOOD_STORAGE_OPTIONS,
  booleanField,
  createFoodConfig,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createPantryConfig(params: {
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
      placeholder: "Use No Brand for loose stock",
    }),
    textField({
      key: "quantity_or_weight",
      label: "Quantity / Weight",
      required: true,
      placeholder: "e.g. 1kg, 2L, 500g",
    }),
    selectField({
      key: "packaging_type",
      label: "Packaging Type",
      required: true,
      options: FOOD_PACKAGING_OPTIONS,
    }),
    textField({
      key: "ingredients_or_contents",
      label: "Ingredients / Contents",
      advanced: true,
      placeholder: "Main ingredients or contents",
    }),
    textField({
      key: "source_origin",
      label: "Source / Origin",
      advanced: true,
      placeholder: "e.g. Malawi, imported, local market",
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    booleanField({
      key: "bulk_available",
      label: "Bulk Available",
      advanced: true,
    }),
  ];

  const freshnessFields: ListingSpecField[] = [
    textField({
      key: "expiry_or_pack_date",
      label: "Expiry / Pack Date",
      required: true,
      placeholder: "e.g. Best before Oct 2026 or packed today",
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
      key: "sealed_packaging",
      label: "Sealed Packaging",
      required: true,
    }),
    selectField({
      key: "packaging_condition",
      label: "Packaging Condition",
      required: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
    ...(params.freshnessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra pantry details",
    }),
  ];

  return createFoodConfig({
    subcategory: "Groceries & Pantry",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...freshnessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Product Identity", keys: identityFields.map((f) => f.key) },
      { title: "Product Type", keys: styleFields.map((f) => f.key) },
      { title: "Freshness & Packaging", keys: freshnessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "quantity_or_weight",
      "packaging_type",
      "expiry_or_pack_date",
      "storage_requirement",
      "freshness_status",
      "sealed_packaging",
      "packaging_condition",
      ...(params.requiredKeys || []),
    ],
  });
}

export const RICE_FLOUR_CONFIG = createPantryConfig({
  itemType: "Rice & Flour",
  styleFields: [
    selectField({
      key: "staple_type",
      label: "Staple Type",
      required: true,
      options: ["Rice", "Maize Flour", "Wheat Flour", "Self-Raising Flour", "Other"],
    }),
    textField({
      key: "grind_or_grade",
      label: "Grind / Grade",
      advanced: true,
      placeholder: "e.g. fine, medium, premium rice",
    }),
  ],
  requiredKeys: ["staple_type"],
});

export const SUGAR_SALT_CONFIG = createPantryConfig({
  itemType: "Sugar & Salt",
  styleFields: [
    selectField({
      key: "pantry_type",
      label: "Product Type",
      required: true,
      options: ["White Sugar", "Brown Sugar", "Table Salt", "Coarse Salt", "Other"],
    }),
  ],
  requiredKeys: ["pantry_type"],
});

export const COOKING_OIL_CONFIG = createPantryConfig({
  itemType: "Cooking Oil",
  styleFields: [
    selectField({
      key: "oil_type",
      label: "Oil Type",
      required: true,
      options: ["Sunflower", "Vegetable Oil", "Palm Oil", "Olive Oil", "Canola", "Other"],
    }),
    selectField({
      key: "volume_unit",
      label: "Common Pack Size",
      advanced: true,
      options: ["500ml", "1L", "2L", "5L", "Other"],
    }),
  ],
  requiredKeys: ["oil_type"],
});

export const SPICES_SEASONINGS_CONFIG = createPantryConfig({
  itemType: "Spices & Seasonings",
  styleFields: [
    selectField({
      key: "spice_type",
      label: "Spice / Seasoning Type",
      required: true,
      options: [
        "Single Spice",
        "Masala Mix",
        "Seasoning Cubes",
        "Herbs",
        "Chilli Powder",
        "Other",
      ],
    }),
    selectField({
      key: "heat_level",
      label: "Heat Level",
      advanced: true,
      options: FOOD_SPICE_LEVEL_OPTIONS,
    }),
  ],
  requiredKeys: ["spice_type"],
});

export const CANNED_PACKAGED_FOODS_CONFIG = createPantryConfig({
  itemType: "Canned & Packaged Foods",
  styleFields: [
    selectField({
      key: "pantry_type",
      label: "Food Type",
      required: true,
      options: ["Beans", "Tomatoes", "Fish", "Corn", "Soup", "Instant Noodles", "Other"],
    }),
  ],
  freshnessFields: [
    selectField({
      key: "can_or_pack_condition",
      label: "Can / Pack Condition",
      required: true,
      options: ["Excellent", "Good", "Dented but Sealed", "Damaged"],
    }),
  ],
  requiredKeys: ["pantry_type", "can_or_pack_condition"],
});

export const PANTRY_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  RICE_FLOUR_CONFIG,
  SUGAR_SALT_CONFIG,
  COOKING_OIL_CONFIG,
  SPICES_SEASONINGS_CONFIG,
  CANNED_PACKAGED_FOODS_CONFIG,
];
