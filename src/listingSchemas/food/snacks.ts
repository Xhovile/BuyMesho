import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  FOOD_ALLERGEN_OPTIONS,
  FOOD_AVAILABILITY_OPTIONS,
  FOOD_DIETARY_TAG_OPTIONS,
  FOOD_FRESHNESS_OPTIONS,
  FOOD_PACKAGING_OPTIONS,
  FOOD_STORAGE_OPTIONS,
  FOOD_SPICE_LEVEL_OPTIONS,
  booleanField,
  createFoodConfig,
  multiselectField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createSnackConfig(params: {
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
      placeholder: "e.g. BBQ, vanilla, chocolate",
    }),
    textField({
      key: "quantity_or_weight",
      label: "Quantity / Weight",
      required: true,
      placeholder: "e.g. 50g, pack of 12",
    }),
    selectField({
      key: "packaging_type",
      label: "Packaging Type",
      required: true,
      options: FOOD_PACKAGING_OPTIONS,
    }),
    textField({
      key: "ingredients_summary",
      label: "Ingredients Summary",
      advanced: true,
      placeholder: "Main ingredients",
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
      placeholder: "Extra snack details",
    }),
  ];

  return createFoodConfig({
    subcategory: "Snacks",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...freshnessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Snack Identity", keys: identityFields.map((f) => f.key) },
      { title: "Style & Diet", keys: styleFields.map((f) => f.key) },
      { title: "Freshness & Packaging", keys: freshnessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "quantity_or_weight",
      "packaging_type",
      "availability",
      "expiry_or_best_before",
      "freshness_status",
      "storage_requirement",
      "sealed_packaging",
      "packaging_condition",
      ...(params.requiredKeys || []),
    ],
  });
}

export const CRISPS_BISCUITS_CONFIG = createSnackConfig({
  itemType: "Crisps & Biscuits",
  styleFields: [
    selectField({
      key: "snack_type",
      label: "Snack Type",
      required: true,
      options: ["Potato Crisps", "Corn Snacks", "Biscuits", "Crackers", "Wafers", "Other"],
    }),
  ],
  requiredKeys: ["snack_type"],
});

export const SWEETS_CHOCOLATE_CONFIG = createSnackConfig({
  itemType: "Sweets & Chocolate",
  styleFields: [
    selectField({
      key: "sweet_type",
      label: "Sweet Type",
      required: true,
      options: ["Chocolate", "Candy", "Toffee", "Gum", "Lollipop", "Other"],
    }),
  ],
  requiredKeys: ["sweet_type"],
});

export const NUTS_TRAIL_MIX_CONFIG = createSnackConfig({
  itemType: "Nuts & Trail Mix",
  styleFields: [
    selectField({
      key: "nut_mix_type",
      label: "Nuts / Mix Type",
      required: true,
      options: ["Peanuts", "Groundnuts", "Mixed Nuts", "Trail Mix", "Seeds Mix", "Other"],
    }),
    selectField({
      key: "roasted_or_raw",
      label: "Roasted or Raw",
      advanced: true,
      options: ["Roasted", "Raw", "Mixed", "Not Sure"],
    }),
  ],
  requiredKeys: ["nut_mix_type"],
});

export const POPCORN_LIGHT_SNACKS_CONFIG = createSnackConfig({
  itemType: "Popcorn & Light Snacks",
  styleFields: [
    selectField({
      key: "snack_type",
      label: "Light Snack Type",
      required: true,
      options: ["Popcorn", "Puffed Snacks", "Rice Cakes", "Granola Bites", "Other"],
    }),
    selectField({
      key: "spice_level",
      label: "Spice Level",
      advanced: true,
      options: FOOD_SPICE_LEVEL_OPTIONS,
    }),
  ],
  requiredKeys: ["snack_type"],
});

export const PROTEIN_HEALTHY_SNACKS_CONFIG = createSnackConfig({
  itemType: "Protein / Healthy Snacks",
  styleFields: [
    selectField({
      key: "product_type",
      label: "Healthy Snack Type",
      required: true,
      options: ["Protein Bar", "Granola Bar", "Fruit Snack", "Energy Bite", "Low Sugar Snack", "Other"],
    }),
    selectField({
      key: "protein_source",
      label: "Protein Source",
      advanced: true,
      options: ["Dairy", "Nuts", "Soy", "Mixed", "Other", "Not Sure"],
    }),
  ],
  requiredKeys: ["product_type"],
});

export const SNACKS_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  CRISPS_BISCUITS_CONFIG,
  SWEETS_CHOCOLATE_CONFIG,
  NUTS_TRAIL_MIX_CONFIG,
  POPCORN_LIGHT_SNACKS_CONFIG,
  PROTEIN_HEALTHY_SNACKS_CONFIG,
];
