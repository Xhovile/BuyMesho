import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  FOOD_ALLERGEN_OPTIONS,
  FOOD_AVAILABILITY_OPTIONS,
  FOOD_DIETARY_TAG_OPTIONS,
  FOOD_FRESHNESS_OPTIONS,
  FOOD_SPICE_LEVEL_OPTIONS,
  FOOD_STORAGE_OPTIONS,
  booleanField,
  createFoodConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createPreparedFoodConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  safetyFields?: ListingSpecField[];
  readinessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    selectField({
      key: "portion_size",
      label: "Portion Size",
      required: true,
      options: ["Small", "Medium", "Large", "Combo", "Family Size", "Not Sure"],
    }),
    numberField({
      key: "servings_count",
      label: "Servings",
      advanced: true,
      placeholder: "e.g. 1, 2, 5",
    }),
    textField({
      key: "ingredients_summary",
      label: "Ingredients Summary",
      required: true,
      placeholder: "Main ingredients in this food",
    }),
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
      key: "spice_level",
      label: "Spice Level",
      advanced: true,
      options: FOOD_SPICE_LEVEL_OPTIONS,
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    selectField({
      key: "availability",
      label: "Availability",
      required: true,
      options: FOOD_AVAILABILITY_OPTIONS,
    }),
    selectField({
      key: "delivery_option",
      label: "Pickup / Delivery",
      required: true,
      options: ["Pickup Only", "Delivery Only", "Pickup or Delivery"],
    }),
  ];

  const safetyFields: ListingSpecField[] = [
    textField({
      key: "prepared_on",
      label: "Prepared On",
      required: true,
      placeholder: "e.g. Today 2pm",
    }),
    textField({
      key: "best_consumed_by",
      label: "Best Consumed By",
      required: true,
      placeholder: "e.g. Today 6pm",
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
    selectField({
      key: "serving_temperature",
      label: "Serving Temperature",
      required: true,
      options: ["Hot", "Warm", "Room Temperature", "Chilled", "Frozen"],
    }),
    ...(params.safetyFields || []),
  ];

  const readinessFields: ListingSpecField[] = [
    booleanField({
      key: "sealed_packaging",
      label: "Sealed Packaging",
      advanced: true,
    }),
    booleanField({
      key: "made_to_order",
      label: "Made to Order",
      advanced: true,
    }),
    ...(params.readinessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra details buyers should know",
    }),
    textareaField({
      key: "known_limitations",
      label: "Known Limitations",
      advanced: true,
      placeholder: "E.g. limited stock, no delivery after 6pm",
    }),
  ];

  return createFoodConfig({
    subcategory: "Cooked Meals",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...safetyFields,
      ...readinessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Meal Identity", keys: identityFields.map((f) => f.key) },
      { title: "Order Setup", keys: styleFields.map((f) => f.key) },
      { title: "Freshness & Safety", keys: safetyFields.map((f) => f.key) },
      { title: "Readiness", keys: readinessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "portion_size",
      "ingredients_summary",
      "availability",
      "delivery_option",
      "prepared_on",
      "best_consumed_by",
      "freshness_status",
      "storage_requirement",
      "serving_temperature",
      ...(params.requiredKeys || []),
    ],
  });
}

export const FULL_MEALS_CONFIG = createPreparedFoodConfig({
  itemType: "Full Meals",
  styleFields: [
    selectField({
      key: "main_base",
      label: "Main Base",
      required: true,
      options: ["Rice", "Nsima", "Pasta", "Potatoes", "Mixed", "Other"],
    }),
    selectField({
      key: "protein_type",
      label: "Protein Type",
      required: true,
      options: ["Beef", "Chicken", "Fish", "Beans", "Eggs", "Vegetarian", "Mixed", "Other"],
    }),
    booleanField({
      key: "includes_side",
      label: "Includes Side Dish",
      advanced: true,
    }),
  ],
  requiredKeys: ["main_base", "protein_type"],
});

export const LUNCH_PACKS_CONFIG = createPreparedFoodConfig({
  itemType: "Lunch Packs",
  styleFields: [
    selectField({
      key: "lunch_pack_type",
      label: "Lunch Pack Type",
      required: true,
      options: ["Student Lunch", "Office Lunch", "Combo Pack", "Meal Prep Pack", "Other"],
    }),
    booleanField({
      key: "utensils_included",
      label: "Utensils Included",
      advanced: true,
    }),
    booleanField({
      key: "drink_included",
      label: "Drink Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["lunch_pack_type"],
});

export const FAST_FOOD_CONFIG = createPreparedFoodConfig({
  itemType: "Fast Food",
  styleFields: [
    selectField({
      key: "fast_food_type",
      label: "Fast Food Type",
      required: true,
      options: ["Burger", "Chips", "Pizza Slice", "Hot Dog", "Fried Chicken", "Wrap", "Samosa Combo", "Other"],
    }),
    selectField({
      key: "cooking_method",
      label: "Cooking Method",
      advanced: true,
      options: ["Fried", "Baked", "Grilled", "Mixed", "Other"],
    }),
  ],
  requiredKeys: ["fast_food_type"],
});

export const BREAKFAST_MEALS_CONFIG = createPreparedFoodConfig({
  itemType: "Breakfast Meals",
  styleFields: [
    selectField({
      key: "breakfast_type",
      label: "Breakfast Type",
      required: true,
      options: ["Tea & Bread", "Porridge", "Egg Breakfast", "Sandwich", "Pancakes", "Mixed Plate", "Other"],
    }),
    booleanField({
      key: "beverage_included",
      label: "Beverage Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["breakfast_type"],
});

export const TRADITIONAL_MEALS_CONFIG = createPreparedFoodConfig({
  itemType: "Traditional Meals",
  styleFields: [
    selectField({
      key: "traditional_style",
      label: "Traditional Style",
      required: true,
      options: ["Nsima & Relish", "Rice & Stew", "Cassava Meal", "Beans Meal", "Porridge", "Other"],
    }),
    textField({
      key: "relish_type",
      label: "Relish / Side Type",
      advanced: true,
      placeholder: "e.g. beef stew, greens, fish",
    }),
  ],
  requiredKeys: ["traditional_style"],
});

export const PREPARED_FOOD_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  FULL_MEALS_CONFIG,
  LUNCH_PACKS_CONFIG,
  FAST_FOOD_CONFIG,
  BREAKFAST_MEALS_CONFIG,
  TRADITIONAL_MEALS_CONFIG,
];
