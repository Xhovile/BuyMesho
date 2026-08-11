import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  BEAUTY_CONDITION_OPTIONS,
  BEAUTY_PACKAGING_CONDITION_OPTIONS,
  BEAUTY_STORAGE_OPTIONS,
  BEAUTY_TARGET_CONCERN_OPTIONS,
  HAIR_TYPE_OPTIONS,
  booleanField,
  createBeautyConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createHaircareProductConfig(params: {
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
      placeholder: "e.g. Dark & Lovely, ORS, No Brand",
    }),
    numberField({
      key: "size_value",
      label: "Size",
      required: true,
      placeholder: "e.g. 250",
    }),
    selectField({
      key: "size_unit",
      label: "Size Unit",
      required: true,
      options: ["ml", "g", "pcs", "oz"],
    }),
    selectField({
      key: "hair_type",
      label: "Hair Type",
      required: true,
      options: HAIR_TYPE_OPTIONS,
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
      placeholder: "Main ingredients or actives",
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    booleanField({
      key: "sulfate_free",
      label: "Sulfate Free",
      advanced: true,
    }),
    booleanField({
      key: "paraben_free",
      label: "Paraben Free",
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
    subcategory: "Haircare",
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
      "hair_type",
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

function createHairAccessoryConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  conditionFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "e.g. Darling, Sensationnel, No Brand",
    }),
    textField({
      key: "color",
      label: "Color",
      required: true,
      placeholder: "e.g. 1B, black, brown",
    }),
    textField({
      key: "length",
      label: "Length",
      required: true,
      placeholder: "e.g. 12 inch, 20 inch",
    }),
    selectField({
      key: "hair_texture",
      label: "Hair Texture",
      required: true,
      options: ["Straight", "Wavy", "Curly", "Kinky", "Body Wave", "Deep Wave", "Other"],
    }),
    selectField({
      key: "fiber_type",
      label: "Fiber Type",
      required: true,
      options: ["Synthetic", "Human Hair", "Blended", "Not Sure"],
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    booleanField({
      key: "heat_safe",
      label: "Heat Safe",
      advanced: true,
    }),
    booleanField({
      key: "washable",
      label: "Washable",
      advanced: true,
    }),
  ];

  const conditionFields: ListingSpecField[] = [
    selectField({
      key: "product_condition",
      label: "Product Condition",
      required: true,
      options: [
        "Brand New",
        "Like New",
        "Gently Used",
        "Partially Used",
        "Damaged",
      ],
    }),
    booleanField({
      key: "sanitized_or_cleaned",
      label: "Sanitized / Cleaned",
      advanced: true,
    }),
    booleanField({
      key: "ready_to_wear",
      label: "Ready to Wear",
      required: true,
    }),
    ...(params.conditionFields || []),
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
    subcategory: "Haircare",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...conditionFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Product Identity", keys: identityFields.map((f) => f.key) },
      { title: "Hair Specs", keys: styleFields.map((f) => f.key) },
      { title: "Condition", keys: conditionFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "color",
      "length",
      "hair_texture",
      "fiber_type",
      "product_condition",
      "ready_to_wear",
      ...(params.requiredKeys || []),
    ],
  });
}

export const SHAMPOO_CONFIG = createHaircareProductConfig({
  itemType: "Shampoo",
  styleFields: [
    selectField({
      key: "shampoo_type",
      label: "Shampoo Type",
      required: true,
      options: ["Moisturizing", "Clarifying", "Anti-Dandruff", "Strengthening", "Color Safe", "Other"],
    }),
  ],
  requiredKeys: ["shampoo_type"],
});

export const CONDITIONER_CONFIG = createHaircareProductConfig({
  itemType: "Conditioner",
  styleFields: [
    selectField({
      key: "conditioner_type",
      label: "Conditioner Type",
      required: true,
      options: ["Rinse-Out", "Leave-In", "Deep Conditioner", "Protein Conditioner", "Other"],
    }),
  ],
  requiredKeys: ["conditioner_type"],
});

export const HAIR_OIL_TREATMENTS_CONFIG = createHaircareProductConfig({
  itemType: "Hair Oil & Treatments",
  styleFields: [
    selectField({
      key: "treatment_type",
      label: "Treatment Type",
      required: true,
      options: ["Hair Oil", "Scalp Treatment", "Growth Treatment", "Hair Mask", "Repair Treatment", "Other"],
    }),
  ],
  requiredKeys: ["treatment_type"],
});

export const WIGS_EXTENSIONS_CONFIG = createHairAccessoryConfig({
  itemType: "Wigs & Extensions",
  styleFields: [
    selectField({
      key: "hairpiece_type",
      label: "Hairpiece Type",
      required: true,
      options: ["Wig", "Bundle", "Closure", "Frontal", "Braiding Hair", "Ponytail", "Other"],
    }),
    booleanField({
      key: "lace_present",
      label: "Lace Present",
      advanced: true,
    }),
  ],
  requiredKeys: ["hairpiece_type"],
});

export const STYLING_PRODUCTS_CONFIG = createHaircareProductConfig({
  itemType: "Styling Products",
  styleFields: [
    selectField({
      key: "styling_product_type",
      label: "Styling Product Type",
      required: true,
      options: ["Gel", "Mousse", "Edge Control", "Spray", "Wax", "Cream", "Other"],
    }),
    selectField({
      key: "hold_level",
      label: "Hold Level",
      advanced: true,
      options: ["Light", "Medium", "Strong", "Very Strong", "Not Sure"],
    }),
  ],
  requiredKeys: ["styling_product_type"],
});

export const HAIRCARE_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  SHAMPOO_CONFIG,
  CONDITIONER_CONFIG,
  HAIR_OIL_TREATMENTS_CONFIG,
  WIGS_EXTENSIONS_CONFIG,
  STYLING_PRODUCTS_CONFIG,
];
