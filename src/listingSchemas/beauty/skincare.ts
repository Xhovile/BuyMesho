import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  BEAUTY_CONDITION_OPTIONS,
  BEAUTY_PACKAGING_CONDITION_OPTIONS,
  BEAUTY_STORAGE_OPTIONS,
  BEAUTY_TARGET_CONCERN_OPTIONS,
  SKIN_TYPE_OPTIONS,
  booleanField,
  createBeautyConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createSkincareConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  safetyFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "e.g. CeraVe, Nivea, Garnier, No Brand",
    }),
    numberField({
      key: "size_value",
      label: "Size",
      required: true,
      placeholder: "e.g. 50",
    }),
    selectField({
      key: "size_unit",
      label: "Size Unit",
      required: true,
      options: ["ml", "g", "pcs", "oz"],
    }),
    selectField({
      key: "skin_type",
      label: "Skin Type",
      required: true,
      options: SKIN_TYPE_OPTIONS,
    }),
    multiselectField({
      key: "target_concerns",
      label: "Target Concerns",
      advanced: true,
      options: BEAUTY_TARGET_CONCERN_OPTIONS,
    }),
    textField({
      key: "ingredients_summary",
      label: "Ingredients Summary",
      advanced: true,
      placeholder: "Main active ingredients",
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    booleanField({
      key: "fragrance_free",
      label: "Fragrance Free",
      advanced: true,
    }),
    booleanField({
      key: "suitable_sensitive_skin",
      label: "Suitable for Sensitive Skin",
      advanced: true,
    }),
  ];

  const safetyFields: ListingSpecField[] = [
    selectField({
      key: "product_condition",
      label: "Product Condition",
      required: true,
      options: BEAUTY_CONDITION_OPTIONS,
    }),
    textField({
      key: "expiry_or_best_before",
      label: "Expiry / Best Before",
      required: true,
      placeholder: "e.g. 12 Oct 2026",
    }),
    booleanField({
      key: "sealed_packaging",
      label: "Sealed Packaging",
      required: true,
    }),
    booleanField({
      key: "opened_before",
      label: "Opened Before",
      required: true,
    }),
    selectField({
      key: "packaging_condition",
      label: "Packaging Condition",
      required: true,
      options: BEAUTY_PACKAGING_CONDITION_OPTIONS,
    }),
    selectField({
      key: "storage_requirement",
      label: "Storage Requirement",
      required: true,
      options: BEAUTY_STORAGE_OPTIONS,
    }),
    ...(params.safetyFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Anything the buyer should know",
    }),
  ];

  return createBeautyConfig({
    subcategory: "Skincare",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...safetyFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Product Identity", keys: identityFields.map((f) => f.key) },
      { title: "Use & Benefits", keys: styleFields.map((f) => f.key) },
      { title: "Condition & Safety", keys: safetyFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "size_value",
      "size_unit",
      "skin_type",
      "product_condition",
      "expiry_or_best_before",
      "sealed_packaging",
      "opened_before",
      "packaging_condition",
      "storage_requirement",
      ...(params.requiredKeys || []),
    ],
  });
}

export const CLEANSERS_CONFIG = createSkincareConfig({
  itemType: "Cleansers",
  styleFields: [
    selectField({
      key: "cleanser_type",
      label: "Cleanser Type",
      required: true,
      options: ["Gel", "Foam", "Cream", "Oil", "Micellar", "Bar", "Other"],
    }),
    selectField({
      key: "use_frequency",
      label: "Use Frequency",
      advanced: true,
      options: ["Daily", "Morning", "Night", "As Needed"],
    }),
  ],
  requiredKeys: ["cleanser_type"],
});

export const MOISTURIZERS_CONFIG = createSkincareConfig({
  itemType: "Moisturizers",
  styleFields: [
    selectField({
      key: "moisturizer_type",
      label: "Moisturizer Type",
      required: true,
      options: ["Cream", "Lotion", "Gel", "Butter", "Night Cream", "Day Cream", "Other"],
    }),
    selectField({
      key: "day_or_night",
      label: "Day or Night",
      advanced: true,
      options: ["Day", "Night", "Both"],
    }),
    selectField({
      key: "finish",
      label: "Finish",
      advanced: true,
      options: ["Matte", "Natural", "Dewy", "Not Sure"],
    }),
  ],
  requiredKeys: ["moisturizer_type"],
});

export const SERUMS_TREATMENTS_CONFIG = createSkincareConfig({
  itemType: "Serums & Treatments",
  styleFields: [
    selectField({
      key: "treatment_type",
      label: "Treatment Type",
      required: true,
      options: ["Serum", "Spot Treatment", "Essence", "Ampoule", "Exfoliant", "Other"],
    }),
    textField({
      key: "active_ingredient_strength",
      label: "Active Ingredient Strength",
      advanced: true,
      placeholder: "e.g. 10% Niacinamide, 2% Salicylic Acid",
    }),
  ],
  requiredKeys: ["treatment_type"],
});

export const SUNSCREEN_CONFIG = createSkincareConfig({
  itemType: "Sunscreen",
  styleFields: [
    selectField({
      key: "sunscreen_type",
      label: "Sunscreen Type",
      required: true,
      options: ["Cream", "Gel", "Lotion", "Spray", "Stick", "Other"],
    }),
    textField({
      key: "spf_rating",
      label: "SPF Rating",
      required: true,
      placeholder: "e.g. SPF 30, SPF 50+",
    }),
    selectField({
      key: "finish",
      label: "Finish",
      advanced: true,
      options: ["Matte", "Natural", "Dewy", "Invisible", "Not Sure"],
    }),
  ],
  requiredKeys: ["sunscreen_type", "spf_rating"],
});

export const FACE_MASKS_CONFIG = createSkincareConfig({
  itemType: "Face Masks",
  styleFields: [
    selectField({
      key: "mask_type",
      label: "Mask Type",
      required: true,
      options: ["Sheet Mask", "Clay Mask", "Gel Mask", "Sleeping Mask", "Peel-Off", "Other"],
    }),
    selectField({
      key: "single_or_multi_use",
      label: "Single or Multi Use",
      required: true,
      options: ["Single Use", "Multi Use"],
    }),
  ],
  requiredKeys: ["mask_type", "single_or_multi_use"],
});

export const SKINCARE_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  CLEANSERS_CONFIG,
  MOISTURIZERS_CONFIG,
  SERUMS_TREATMENTS_CONFIG,
  SUNSCREEN_CONFIG,
  FACE_MASKS_CONFIG,
];
