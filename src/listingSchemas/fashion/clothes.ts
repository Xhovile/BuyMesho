import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  AUTHENTICITY_OPTIONS,
  FASHION_CONDITION_OPTIONS,
  FASHION_GENDER_OPTIONS,
  FASHION_MATERIAL_OPTIONS,
  FASHION_SIZE_OPTIONS,
  FASHION_STYLE_TAG_OPTIONS,
  booleanField,
  createFashionConfig,
  multiselectField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createClothingConfig(params: {
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
    selectField({
      key: "size",
      label: "Size",
      required: true,
      options: FASHION_SIZE_OPTIONS,
    }),
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "e.g. Nike, Zara, H&M, No Brand",
    }),
    textField({
      key: "color",
      label: "Color",
      required: true,
      placeholder: "e.g. Black, White, Blue",
    }),
    selectField({
      key: "material",
      label: "Material",
      required: true,
      options: FASHION_MATERIAL_OPTIONS,
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    multiselectField({
      key: "style_tags",
      label: "Style Tags",
      advanced: true,
      options: FASHION_STYLE_TAG_OPTIONS,
    }),
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
    booleanField({
      key: "has_stains",
      label: "Any Stains?",
      required: true,
    }),
    booleanField({
      key: "has_tears",
      label: "Any Tears / Holes?",
      required: true,
    }),
    booleanField({
      key: "has_fading",
      label: "Visible Fading",
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
      key: "washed_or_dry_cleaned",
      label: "Washed / Dry Cleaned",
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
      placeholder: "e.g. Worn 3 times, used for one semester",
    }),
    textField({
      key: "reason_for_selling",
      label: "Reason for Selling",
      advanced: true,
      placeholder: "Optional",
    }),
  ];

  return createFashionConfig({
    subcategory: "Clothes",
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
      { title: "Style & Fit", keys: styleFields.map((f) => f.key) },
      { title: "Condition", keys: conditionFields.map((f) => f.key) },
      { title: "Readiness", keys: readinessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "gender",
      "size",
      "brand",
      "color",
      "material",
      "body_condition",
      "has_stains",
      "has_tears",
      "ready_to_wear",
      ...(params.requiredKeys || []),
    ],
  });
}

export const T_SHIRTS_CONFIG = createClothingConfig({
  itemType: "T-Shirts",
  styleFields: [
    selectField({
      key: "fit_type",
      label: "Fit Type",
      options: ["Slim Fit", "Regular Fit", "Oversized", "Boxy", "Athletic", "Not Sure"],
    }),
    selectField({
      key: "sleeve_length",
      label: "Sleeve Length",
      required: true,
      options: ["Short Sleeve", "Long Sleeve", "Sleeveless", "Not Sure"],
    }),
    selectField({
      key: "neckline",
      label: "Neckline",
      required: true,
      options: ["Crew Neck", "V-Neck", "Polo Neck", "Henley", "Other", "Not Sure"],
    }),
    selectField({
      key: "print_style",
      label: "Print / Design",
      options: ["Plain", "Graphic", "Striped", "Branded", "Custom", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "print_condition",
      label: "Print Condition",
      advanced: true,
      options: ["No Print", "Excellent", "Good", "Slight Wear", "Cracked / Faded"],
    }),
  ],
  requiredKeys: ["sleeve_length", "neckline"],
});

export const SHIRTS_CONFIG = createClothingConfig({
  itemType: "Shirts",
  styleFields: [
    selectField({
      key: "fit_type",
      label: "Fit Type",
      options: ["Slim Fit", "Regular Fit", "Tailored", "Relaxed", "Not Sure"],
    }),
    selectField({
      key: "sleeve_length",
      label: "Sleeve Length",
      required: true,
      options: ["Long Sleeve", "Short Sleeve", "Three-Quarter", "Not Sure"],
    }),
    selectField({
      key: "collar_type",
      label: "Collar Type",
      required: true,
      options: ["Standard", "Button-Down", "Mandarin", "Spread", "Other", "Not Sure"],
    }),
    selectField({
      key: "occasion",
      label: "Occasion",
      options: ["Formal", "Office", "Casual", "School", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    booleanField({
      key: "missing_buttons",
      label: "Missing Buttons",
      advanced: true,
    }),
  ],
  requiredKeys: ["sleeve_length", "collar_type"],
});

export const HOODIES_CONFIG = createClothingConfig({
  itemType: "Hoodies",
  styleFields: [
    selectField({
      key: "fit_type",
      label: "Fit Type",
      options: ["Slim Fit", "Regular Fit", "Oversized", "Relaxed", "Not Sure"],
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      required: true,
      options: ["Pullover", "Zip-Up", "Half Zip", "Not Sure"],
    }),
    selectField({
      key: "warmth_level",
      label: "Warmth Level",
      options: ["Light", "Medium", "Heavy"],
      advanced: true,
    }),
    selectField({
      key: "pocket_style",
      label: "Pocket Style",
      options: ["Kangaroo", "Side Pockets", "No Pockets", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "hood_condition",
      label: "Hood Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
    selectField({
      key: "zip_condition",
      label: "Zip Condition",
      advanced: true,
      options: ["Not Applicable", "Fully Working", "Works with Minor Issue", "Damaged"],
    }),
  ],
  requiredKeys: ["closure_type"],
});

export const JACKETS_CONFIG = createClothingConfig({
  itemType: "Jackets",
  styleFields: [
    selectField({
      key: "jacket_style",
      label: "Jacket Style",
      required: true,
      options: ["Denim", "Bomber", "Puffer", "Blazer", "Leather", "Windbreaker", "School Jacket", "Other"],
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      required: true,
      options: ["Zip", "Buttons", "Snap Buttons", "Open Front", "Other"],
    }),
    selectField({
      key: "warmth_level",
      label: "Warmth Level",
      options: ["Light", "Medium", "Heavy"],
      advanced: true,
    }),
    selectField({
      key: "water_resistance",
      label: "Water Resistance",
      options: ["Yes", "No", "Partially", "Not Sure"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "lining_condition",
      label: "Lining Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
  ],
  requiredKeys: ["jacket_style", "closure_type"],
});

export const DRESSES_CONFIG = createClothingConfig({
  itemType: "Dresses",
  styleFields: [
    selectField({
      key: "dress_length",
      label: "Dress Length",
      required: true,
      options: ["Mini", "Knee Length", "Midi", "Maxi", "Not Sure"],
    }),
    selectField({
      key: "sleeve_length",
      label: "Sleeve Length",
      options: ["Sleeveless", "Short Sleeve", "Long Sleeve", "Off-Shoulder", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "neckline",
      label: "Neckline",
      options: ["Round", "V-Neck", "Square", "Halter", "Sweetheart", "Other", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "occasion",
      label: "Occasion",
      options: ["Casual", "Formal", "Party", "Traditional", "Office", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "lining_condition",
      label: "Lined",
      advanced: true,
      options: ["Lined", "Not Lined", "Partially Lined", "Not Sure"],
    }),
  ],
  requiredKeys: ["dress_length"],
});

export const TROUSERS_CONFIG = createClothingConfig({
  itemType: "Trousers",
  styleFields: [
    textField({
      key: "waist_size",
      label: "Waist Size",
      required: true,
      placeholder: "e.g. 32, M, 14",
    }),
    textField({
      key: "length_size",
      label: "Length / Inseam",
      required: true,
      placeholder: "e.g. 30, Regular, Long",
    }),
    selectField({
      key: "fit_type",
      label: "Fit Type",
      options: ["Slim Fit", "Regular Fit", "Straight", "Relaxed", "Wide Leg", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "rise_type",
      label: "Rise Type",
      options: ["Low Rise", "Mid Rise", "High Rise", "Not Sure"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "fastening_condition",
      label: "Zip / Button Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
  ],
  requiredKeys: ["waist_size", "length_size"],
});

export const JEANS_CONFIG = createClothingConfig({
  itemType: "Jeans",
  styleFields: [
    textField({
      key: "waist_size",
      label: "Waist Size",
      required: true,
      placeholder: "e.g. 32, M, 14",
    }),
    textField({
      key: "length_size",
      label: "Length / Inseam",
      required: true,
      placeholder: "e.g. 30, Regular, Long",
    }),
    selectField({
      key: "fit_type",
      label: "Fit Type",
      options: ["Skinny", "Slim", "Straight", "Regular", "Relaxed", "Baggy", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "wash_type",
      label: "Wash Type",
      options: ["Light Wash", "Mid Wash", "Dark Wash", "Black", "Distressed", "Raw Denim", "Other"],
      advanced: true,
    }),
    selectField({
      key: "stretch_level",
      label: "Stretch Level",
      options: ["Non-Stretch", "Slight Stretch", "Stretch"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "distress_condition",
      label: "Distressed / Ripped Condition",
      advanced: true,
      options: ["Not Applicable", "Clean Distress", "Worn but Fine", "Needs Repair"],
    }),
  ],
  requiredKeys: ["waist_size", "length_size"],
});

export const SHORTS_CONFIG = createClothingConfig({
  itemType: "Shorts",
  styleFields: [
    textField({
      key: "waist_size",
      label: "Waist Size",
      required: true,
      placeholder: "e.g. 32, M, 14",
    }),
    selectField({
      key: "length_type",
      label: "Length Type",
      required: true,
      options: ["Above Knee", "Knee Length", "Long Shorts", "Not Sure"],
    }),
    selectField({
      key: "fit_type",
      label: "Fit Type",
      options: ["Slim Fit", "Regular Fit", "Relaxed", "Athletic", "Not Sure"],
      advanced: true,
    }),
    selectField({
      key: "closure_type",
      label: "Closure Type",
      options: ["Elastic", "Zip and Button", "Drawstring", "Other"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "pocket_condition",
      label: "Pocket Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged"],
    }),
  ],
  requiredKeys: ["waist_size", "length_type"],
});

export const UNIFORMS_CONFIG = createClothingConfig({
  itemType: "Uniforms",
  styleFields: [
    textField({
      key: "institution_or_use",
      label: "Institution / Use",
      required: true,
      placeholder: "e.g. LUANAR, school, office",
    }),
    multiselectField({
      key: "set_pieces",
      label: "Set Pieces",
      advanced: true,
      options: ["Shirt", "Trousers", "Skirt", "Blazer", "Tie", "Sweater", "Dress", "Other"],
    }),
    selectField({
      key: "official_or_custom",
      label: "Official or Custom",
      required: true,
      options: ["Official", "Tailor Made", "Mixed", "Not Sure"],
    }),
    booleanField({
      key: "badge_or_logo_present",
      label: "Badge / Logo Present",
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "badge_condition",
      label: "Badge / Logo Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged", "Not Applicable"],
    }),
  ],
  requiredKeys: ["institution_or_use", "official_or_custom"],
});

export const TRADITIONAL_WEAR_CONFIG = createClothingConfig({
  itemType: "Traditional Wear",
  styleFields: [
    selectField({
      key: "cultural_style",
      label: "Cultural Style",
      required: true,
      options: ["African Print", "Ankara", "Kitenge", "Gown", "Kaftan", "Traditional Suit", "Other"],
    }),
    multiselectField({
      key: "set_pieces",
      label: "Set Pieces",
      advanced: true,
      options: ["Top", "Trousers", "Skirt", "Dress", "Headwrap", "Shawl", "Other"],
    }),
    selectField({
      key: "occasion",
      label: "Occasion",
      options: ["Ceremony", "Church", "Casual", "Wedding", "Cultural Event", "Other"],
      advanced: true,
    }),
    selectField({
      key: "handmade_or_tailored",
      label: "Handmade / Tailored",
      options: ["Tailor Made", "Ready Made", "Mixed", "Not Sure"],
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "embroidery_condition",
      label: "Embroidery / Finish Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged", "Not Applicable"],
    }),
  ],
  requiredKeys: ["cultural_style"],
});

export const CLOTHES_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  T_SHIRTS_CONFIG,
  SHIRTS_CONFIG,
  HOODIES_CONFIG,
  JACKETS_CONFIG,
  DRESSES_CONFIG,
  TROUSERS_CONFIG,
  JEANS_CONFIG,
  SHORTS_CONFIG,
  UNIFORMS_CONFIG,
  TRADITIONAL_WEAR_CONFIG,
];
