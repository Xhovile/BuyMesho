import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  AUTHENTICITY_OPTIONS,
  FASHION_CONDITION_OPTIONS,
  FASHION_GENDER_OPTIONS,
  FASHION_MATERIAL_OPTIONS,
  booleanField,
  createFashionConfig,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createAccessoryConfig(params: {
  itemType: string;
  identityFields?: ListingSpecField[];
  styleFields?: ListingSpecField[];
  conditionFields?: ListingSpecField[];
  readinessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const baseIdentityFields: ListingSpecField[] = [
    selectField({
      key: "gender",
      label: "Gender",
      required: true,
      options: FASHION_GENDER_OPTIONS,
    }),
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "e.g. Casio, Ray-Ban, No Brand",
    }),
    textField({
      key: "color",
      label: "Color",
      required: true,
      placeholder: "e.g. Black, Gold, Silver",
    }),
    selectField({
      key: "material",
      label: "Material",
      required: true,
      options: FASHION_MATERIAL_OPTIONS,
    }),
    ...(params.identityFields || []),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    selectField({
      key: "authenticity",
      label: "Authenticity / Source",
      advanced: true,
      options: AUTHENTICITY_OPTIONS,
    }),
  ];

  const conditionFields: ListingSpecField[] = [
    selectField({
      key: "body_condition",
      label: "Overall Condition",
      required: true,
      options: FASHION_CONDITION_OPTIONS,
    }),
    ...(params.conditionFields || []),
  ];

  const readinessFields: ListingSpecField[] = [
    booleanField({
      key: "ready_to_use",
      label: "Ready to Use",
      required: true,
    }),
    ...(params.readinessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "known_defects",
      label: "Known Defects",
      advanced: true,
      placeholder: "Clearly mention any visible issue",
    }),
    textField({
      key: "usage_history",
      label: "Usage History",
      advanced: true,
      placeholder: "e.g. Used occasionally, gifted, never repaired",
    }),
    textField({
      key: "reason_for_selling",
      label: "Reason for Selling",
      advanced: true,
      placeholder: "Optional",
    }),
  ];

  return createFashionConfig({
    subcategory: "Watches & Accessories",
    itemType: params.itemType,
    fields: [
      ...baseIdentityFields,
      ...styleFields,
      ...conditionFields,
      ...readinessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Item Identity", keys: baseIdentityFields.map((f) => f.key) },
      { title: "Style & Specs", keys: styleFields.map((f) => f.key) },
      { title: "Condition", keys: conditionFields.map((f) => f.key) },
      { title: "Readiness", keys: readinessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "gender",
      "brand",
      "color",
      "material",
      "body_condition",
      "ready_to_use",
      ...(params.requiredKeys || []),
    ],
  });
}

export const WATCHES_CONFIG = createAccessoryConfig({
  itemType: "Watches",
  identityFields: [
    textField({
      key: "case_size",
      label: "Case Size",
      advanced: true,
      placeholder: 'e.g. 40mm, 42mm',
    }),
  ],
  styleFields: [
    selectField({
      key: "watch_type",
      label: "Watch Type",
      required: true,
      options: ["Analog", "Digital", "Smartwatch", "Sports", "Luxury", "Other"],
    }),
    selectField({
      key: "movement",
      label: "Movement",
      required: true,
      options: ["Quartz", "Automatic", "Mechanical", "Smart", "Not Sure"],
    }),
    textField({
      key: "dial_color",
      label: "Dial Color",
      advanced: true,
      placeholder: "e.g. Black, Blue, Silver",
    }),
    selectField({
      key: "water_resistance",
      label: "Water Resistance",
      options: ["Yes", "No", "Not Sure"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "glass_condition",
      label: "Glass Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Scratched", "Damaged"],
    }),
    selectField({
      key: "strap_condition",
      label: "Strap Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"],
    }),
    booleanField({
      key: "working_properly",
      label: "Working Properly",
      required: true,
    }),
  ],
  readinessFields: [
    booleanField({
      key: "includes_box",
      label: "Original Box Included",
      advanced: true,
    }),
    booleanField({
      key: "includes_receipt",
      label: "Receipt Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["watch_type", "movement", "glass_condition", "strap_condition", "working_properly"],
});

export const BELTS_CONFIG = createAccessoryConfig({
  itemType: "Belts",
  identityFields: [
    textField({
      key: "size_or_length",
      label: "Size / Length",
      required: true,
      placeholder: "e.g. 32, 100cm, Medium",
    }),
  ],
  styleFields: [
    selectField({
      key: "belt_style",
      label: "Belt Style",
      required: true,
      options: ["Formal", "Casual", "Reversible", "Designer", "Other"],
    }),
    textField({
      key: "buckle_material",
      label: "Buckle Material",
      advanced: true,
      placeholder: "e.g. Steel, Alloy",
    }),
  ],
  conditionFields: [
    selectField({
      key: "buckle_condition",
      label: "Buckle Condition",
      required: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
    selectField({
      key: "hole_condition",
      label: "Hole / Adjustment Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Stretched / Damaged"],
    }),
  ],
  requiredKeys: ["size_or_length", "belt_style", "buckle_condition"],
});

export const SUNGLASSES_CONFIG = createAccessoryConfig({
  itemType: "Sunglasses",
  styleFields: [
    selectField({
      key: "frame_shape",
      label: "Frame Shape",
      required: true,
      options: ["Round", "Square", "Aviator", "Cat Eye", "Rectangular", "Other"],
    }),
    textField({
      key: "lens_color",
      label: "Lens Color",
      required: true,
      placeholder: "e.g. Black, Brown, Blue",
    }),
    booleanField({
      key: "uv_protection",
      label: "UV Protection",
      advanced: true,
    }),
    booleanField({
      key: "polarized",
      label: "Polarized",
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "lens_condition",
      label: "Lens Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Scratched", "Damaged"],
    }),
    selectField({
      key: "frame_condition",
      label: "Frame Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Loose", "Damaged"],
    }),
  ],
  readinessFields: [
    booleanField({
      key: "includes_case",
      label: "Case Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["frame_shape", "lens_color", "lens_condition", "frame_condition"],
});

export const JEWELRY_CONFIG = createAccessoryConfig({
  itemType: "Jewelry",
  identityFields: [
    textField({
      key: "size_or_fit",
      label: "Size / Fit",
      advanced: true,
      placeholder: "e.g. Adjustable, ring size 7, medium",
    }),
  ],
  styleFields: [
    selectField({
      key: "jewelry_type",
      label: "Jewelry Type",
      required: true,
      options: ["Ring", "Bracelet", "Necklace", "Earrings", "Anklet", "Chain", "Set", "Other"],
    }),
    textField({
      key: "gemstone_or_stone",
      label: "Gemstone / Stone",
      advanced: true,
      placeholder: "e.g. None, zircon, pearl",
    }),
    selectField({
      key: "plating_type",
      label: "Plating Type",
      advanced: true,
      options: ["Gold Plated", "Silver Plated", "None", "Not Sure"],
    }),
  ],
  conditionFields: [
    selectField({
      key: "clasp_condition",
      label: "Clasp / Hook Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged", "Not Applicable"],
    }),
  ],
  requiredKeys: ["jewelry_type"],
});

export const CAPS_HATS_CONFIG = createAccessoryConfig({
  itemType: "Caps / Hats",
  identityFields: [
    textField({
      key: "size_or_fit",
      label: "Size / Fit",
      advanced: true,
      placeholder: "e.g. Adjustable, medium",
    }),
  ],
  styleFields: [
    selectField({
      key: "cap_hat_style",
      label: "Cap / Hat Style",
      required: true,
      options: ["Baseball Cap", "Bucket Hat", "Beanie", "Fedora", "Beret", "Snapback", "Trucker", "Other"],
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      advanced: true,
      options: ["Adjustable Strap", "Fitted", "Elastic", "Not Applicable", "Other"],
    }),
  ],
  conditionFields: [
    selectField({
      key: "brim_condition",
      label: "Brim / Shape Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Bent / Damaged", "Not Applicable"],
    }),
    booleanField({
      key: "is_washable",
      label: "Washable",
      advanced: true,
    }),
  ],
  requiredKeys: ["cap_hat_style"],
});

export const SCARVES_CONFIG = createAccessoryConfig({
  itemType: "Scarves",
  styleFields: [
    selectField({
      key: "scarf_style",
      label: "Scarf Style",
      required: true,
      options: ["Neck Scarf", "Head Scarf", "Shawl", "Winter Scarf", "Lightweight Scarf", "Other"],
    }),
    selectField({
      key: "length_type",
      label: "Length Type",
      options: ["Short", "Medium", "Long", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "pattern",
      label: "Pattern",
      options: ["Plain", "Printed", "Striped", "Checked", "Embroidered", "Other"],
      advanced: true,
    }),
    selectField({
      key: "season",
      label: "Best Season",
      options: ["All Season", "Warm Season", "Cold Season"],
      advanced: true,
    }),
  ],
  conditionFields: [
    booleanField({
      key: "has_fraying",
      label: "Any Fraying",
      advanced: true,
    }),
  ],
  requiredKeys: ["scarf_style"],
});

export const ACCESSORIES_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  WATCHES_CONFIG,
  BELTS_CONFIG,
  SUNGLASSES_CONFIG,
  JEWELRY_CONFIG,
  CAPS_HATS_CONFIG,
  SCARVES_CONFIG,
];
