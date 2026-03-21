import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  BEAUTY_CONDITION_OPTIONS,
  BEAUTY_PACKAGING_CONDITION_OPTIONS,
  BEAUTY_STORAGE_OPTIONS,
  COVERAGE_OPTIONS,
  FINISH_OPTIONS,
  SHADE_DEPTH_OPTIONS,
  SKIN_TYPE_OPTIONS,
  booleanField,
  createBeautyConfig,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createMakeupProductConfig(params: {
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
      placeholder: "e.g. Maybelline, MAC, No Brand",
    }),
    textField({
      key: "shade_name",
      label: "Shade Name",
      advanced: true,
      placeholder: "e.g. Caramel, Nude 5",
    }),
    selectField({
      key: "shade_depth",
      label: "Shade Depth",
      advanced: true,
      options: SHADE_DEPTH_OPTIONS,
    }),
    selectField({
      key: "skin_type",
      label: "Skin Type",
      advanced: true,
      options: SKIN_TYPE_OPTIONS,
    }),
    numberField({
      key: "size_value",
      label: "Size",
      required: true,
      placeholder: "e.g. 30",
    }),
    selectField({
      key: "size_unit",
      label: "Size Unit",
      required: true,
      options: ["ml", "g", "pcs", "oz"],
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    selectField({
      key: "finish",
      label: "Finish",
      advanced: true,
      options: FINISH_OPTIONS,
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
    subcategory: "Makeup",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...safetyFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Product Identity", keys: identityFields.map((f) => f.key) },
      { title: "Makeup Specs", keys: styleFields.map((f) => f.key) },
      { title: "Condition & Safety", keys: safetyFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "size_value",
      "size_unit",
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

function createMakeupToolConfig(params: {
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
      placeholder: "e.g. Real Techniques, Generic",
    }),
    textField({
      key: "material",
      label: "Material",
      required: true,
      placeholder: "e.g. synthetic bristles, sponge foam",
    }),
    textField({
      key: "quantity_or_set_size",
      label: "Quantity / Set Size",
      required: true,
      placeholder: "e.g. 1 piece, set of 8",
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
  ];

  const conditionFields: ListingSpecField[] = [
    selectField({
      key: "product_condition",
      label: "Product Condition",
      required: true,
      options: ["Brand New", "Like New", "Gently Used", "Used", "Damaged"],
    }),
    booleanField({
      key: "sanitized_or_cleaned",
      label: "Sanitized / Cleaned",
      required: true,
    }),
    booleanField({
      key: "ready_to_use",
      label: "Ready to Use",
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
    subcategory: "Makeup",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...conditionFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Tool Identity", keys: identityFields.map((f) => f.key) },
      { title: "Tool Specs", keys: styleFields.map((f) => f.key) },
      { title: "Condition", keys: conditionFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "material",
      "quantity_or_set_size",
      "product_condition",
      "sanitized_or_cleaned",
      "ready_to_use",
      ...(params.requiredKeys || []),
    ],
  });
}

export const FOUNDATION_CONCEALER_CONFIG = createMakeupProductConfig({
  itemType: "Foundation & Concealer",
  styleFields: [
    selectField({
      key: "product_type",
      label: "Product Type",
      required: true,
      options: ["Foundation", "Concealer", "Tinted Moisturizer", "BB Cream", "Other"],
    }),
    selectField({
      key: "coverage_level",
      label: "Coverage Level",
      required: true,
      options: COVERAGE_OPTIONS,
    }),
    selectField({
      key: "product_form",
      label: "Product Form",
      required: true,
      options: ["Liquid", "Cream", "Stick", "Powder", "Other"],
    }),
  ],
  requiredKeys: ["product_type", "coverage_level", "product_form"],
});

export const POWDER_BLUSH_CONFIG = createMakeupProductConfig({
  itemType: "Powder & Blush",
  styleFields: [
    selectField({
      key: "product_type",
      label: "Product Type",
      required: true,
      options: ["Loose Powder", "Pressed Powder", "Blush", "Bronzer", "Contour", "Other"],
    }),
    selectField({
      key: "product_form",
      label: "Product Form",
      advanced: true,
      options: ["Loose", "Pressed", "Cream", "Stick", "Other"],
    }),
  ],
  requiredKeys: ["product_type"],
});

export const LIP_PRODUCTS_CONFIG = createMakeupProductConfig({
  itemType: "Lip Products",
  styleFields: [
    selectField({
      key: "lip_product_type",
      label: "Lip Product Type",
      required: true,
      options: ["Lipstick", "Lip Gloss", "Lip Balm", "Lip Tint", "Lip Liner", "Other"],
    }),
    booleanField({
      key: "long_wear",
      label: "Long Wear",
      advanced: true,
    }),
  ],
  requiredKeys: ["lip_product_type"],
});

export const EYE_MAKEUP_CONFIG = createMakeupProductConfig({
  itemType: "Eye Makeup",
  styleFields: [
    selectField({
      key: "eye_product_type",
      label: "Eye Product Type",
      required: true,
      options: ["Mascara", "Eyeliner", "Eyeshadow", "Brow Product", "Lashes", "Other"],
    }),
    booleanField({
      key: "waterproof",
      label: "Waterproof",
      advanced: true,
    }),
  ],
  requiredKeys: ["eye_product_type"],
});

export const MAKEUP_TOOLS_CONFIG = createMakeupToolConfig({
  itemType: "Makeup Tools",
  styleFields: [
    selectField({
      key: "tool_type",
      label: "Tool Type",
      required: true,
      options: ["Brushes", "Sponge", "Blender", "Mirror", "Curler", "Palette Tool", "Other"],
    }),
  ],
  requiredKeys: ["tool_type"],
});

export const MAKEUP_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  FOUNDATION_CONCEALER_CONFIG,
  POWDER_BLUSH_CONFIG,
  LIP_PRODUCTS_CONFIG,
  EYE_MAKEUP_CONFIG,
  MAKEUP_TOOLS_CONFIG,
];
