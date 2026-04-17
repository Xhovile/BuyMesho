import type { ListingItemConfig, ListingSpecField } from "../core.js";
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
} from "./shared.js";

const SHOE_SOLE_MATERIAL_OPTIONS = [
  "Rubber",
  "Foam",
  "Leather",
  "Synthetic",
  "Crepe",
  "Mixed",
  "Other",
  "Not Sure",
];

function createShoeConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  conditionFields?: ListingSpecField[];
  readinessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    selectField({
      key: "gender",
      label: "Gender",
      required: true,
      options: FASHION_GENDER_OPTIONS,
    }),
    textField({
      key: "shoe_size",
      label: "Shoe Size",
      required: true,
      placeholder: "e.g. 40, 41, UK 8, EU 42",
    }),
    selectField({
      key: "size_system",
      label: "Size System",
      advanced: true,
      options: ["UK", "EU", "US", "Not Sure"],
    }),
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "e.g. Nike, Adidas, Bata, No Brand",
    }),
    textField({
      key: "color",
      label: "Color",
      required: true,
      placeholder: "e.g. Black, White, Brown",
    }),
    selectField({
      key: "upper_material",
      label: "Upper Material",
      required: true,
      options: FASHION_MATERIAL_OPTIONS,
    }),
    selectField({
      key: "sole_material",
      label: "Sole Material",
      advanced: true,
      options: SHOE_SOLE_MATERIAL_OPTIONS,
    }),
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
    selectField({
      key: "sole_condition",
      label: "Sole Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Worn", "Damaged"],
    }),
    selectField({
      key: "inside_condition",
      label: "Inside Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"],
    }),
    booleanField({
      key: "has_scuffs",
      label: "Visible Scuffs / Marks",
      required: true,
    }),
    booleanField({
      key: "has_cracks",
      label: "Cracks / Serious Damage",
      required: true,
    }),
    booleanField({
      key: "has_odor",
      label: "Any Odor",
      advanced: true,
    }),
    ...(params.conditionFields || []),
  ];

  const readinessFields: ListingSpecField[] = [
    booleanField({
      key: "ready_to_wear",
      label: "Ready to Wear",
      required: true,
    }),
    booleanField({
      key: "cleaned_recently",
      label: "Cleaned Recently",
      advanced: true,
    }),
    booleanField({
      key: "includes_box",
      label: "Original Box Included",
      advanced: true,
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
      placeholder: "e.g. Used for one semester, gym use only",
    }),
    textField({
      key: "reason_for_selling",
      label: "Reason for Selling",
      advanced: true,
      placeholder: "Optional",
    }),
  ];

  return createFashionConfig({
    subcategory: "Shoes",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...conditionFields,
      ...readinessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Item Identity", keys: identityFields.map((f) => f.key) },
      { title: "Style & Use", keys: styleFields.map((f) => f.key) },
      { title: "Condition", keys: conditionFields.map((f) => f.key) },
      { title: "Readiness", keys: readinessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "gender",
      "shoe_size",
      "brand",
      "color",
      "upper_material",
      "body_condition",
      "sole_condition",
      "inside_condition",
      "has_scuffs",
      "has_cracks",
      "ready_to_wear",
      ...(params.requiredKeys || []),
    ],
  });
}

export const SNEAKERS_CONFIG = createShoeConfig({
  itemType: "Sneakers",
  styleFields: [
    selectField({
      key: "sneaker_style",
      label: "Sneaker Style",
      required: true,
      options: ["Low Top", "Mid Top", "High Top", "Running", "Lifestyle", "Basketball", "Skate", "Other"],
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      options: ["Laces", "Slip-On", "Velcro", "Other"],
      advanced: true,
    }),
    selectField({
      key: "primary_use",
      label: "Primary Use",
      options: ["Everyday", "Running", "Gym", "Basketball", "Skate", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "traction_condition",
      label: "Traction / Grip Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Worn Out"],
    }),
  ],
  requiredKeys: ["sneaker_style"],
});

export const FORMAL_SHOES_CONFIG = createShoeConfig({
  itemType: "Formal Shoes",
  styleFields: [
    selectField({
      key: "formal_style",
      label: "Formal Style",
      required: true,
      options: ["Oxford", "Derby", "Loafer", "Brogue", "Monk Strap", "Other"],
    }),
    selectField({
      key: "toe_shape",
      label: "Toe Shape",
      options: ["Round", "Square", "Pointed", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      options: ["Laces", "Slip-On", "Buckle", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    booleanField({
      key: "polish_ready",
      label: "Polish Ready",
      advanced: true,
    }),
  ],
  requiredKeys: ["formal_style"],
});

export const BOOTS_CONFIG = createShoeConfig({
  itemType: "Boots",
  styleFields: [
    selectField({
      key: "boot_height",
      label: "Boot Height",
      required: true,
      options: ["Ankle", "Mid-Calf", "Knee High", "Not Sure"],
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      options: ["Zip", "Laces", "Slip-On", "Buckle", "Other"],
      advanced: true,
    }),
    selectField({
      key: "water_resistance",
      label: "Water Resistance",
      options: ["Yes", "No", "Partially", "Not Sure"],
      advanced: true,
    }),
  ],
  requiredKeys: ["boot_height"],
});

export const SANDALS_CONFIG = createShoeConfig({
  itemType: "Sandals",
  styleFields: [
    selectField({
      key: "sandal_style",
      label: "Sandal Style",
      required: true,
      options: ["Slides", "Strappy", "Outdoor", "Gladiator", "Flat", "Other"],
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      options: ["Slip-On", "Buckle", "Velcro", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "footbed_condition",
      label: "Footbed Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
  ],
  requiredKeys: ["sandal_style"],
});

export const HEELS_CONFIG = createShoeConfig({
  itemType: "Heels",
  styleFields: [
    selectField({
      key: "heel_type",
      label: "Heel Type",
      required: true,
      options: ["Block", "Stiletto", "Wedge", "Platform", "Kitten", "Other"],
    }),
    selectField({
      key: "heel_height",
      label: "Heel Height",
      required: true,
      options: ["Low", "Mid", "High", "Very High"],
    }),
    selectField({
      key: "toe_shape",
      label: "Toe Shape",
      options: ["Round", "Square", "Pointed", "Open Toe", "Not Sure"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "heel_tip_condition",
      label: "Heel Tip Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Needs Repair"],
    }),
  ],
  requiredKeys: ["heel_type", "heel_height"],
});

export const SPORTS_SHOES_CONFIG = createShoeConfig({
  itemType: "Sports Shoes",
  styleFields: [
    selectField({
      key: "sport_type",
      label: "Sport Type",
      required: true,
      options: ["Running", "Football", "Basketball", "Training", "Tennis", "Other"],
    }),
    selectField({
      key: "stud_or_sole_type",
      label: "Stud / Sole Type",
      options: ["Flat Sole", "Rubber Studs", "Firm Ground", "Indoor", "Mixed", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "ankle_support",
      label: "Ankle Support",
      options: ["Low", "Mid", "High"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "traction_condition",
      label: "Traction / Grip Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Worn Out"],
    }),
  ],
  requiredKeys: ["sport_type"],
});

export const SLIPPERS_CONFIG = createShoeConfig({
  itemType: "Slippers",
  styleFields: [
    selectField({
      key: "slipper_style",
      label: "Slipper Style",
      required: true,
      options: ["House", "Outdoor", "Bathroom", "Open Toe", "Closed Toe", "Other"],
    }),
    selectField({
      key: "sole_thickness",
      label: "Sole Thickness",
      options: ["Thin", "Medium", "Thick"],
      advanced: true,
    }),
  ],
  requiredKeys: ["slipper_style"],
});

export const SHOES_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  SNEAKERS_CONFIG,
  FORMAL_SHOES_CONFIG,
  BOOTS_CONFIG,
  SANDALS_CONFIG,
  HEELS_CONFIG,
  SPORTS_SHOES_CONFIG,
  SLIPPERS_CONFIG,
];
