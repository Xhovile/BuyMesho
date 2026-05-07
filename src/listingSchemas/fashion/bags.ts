import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  AUTHENTICITY_OPTIONS,
  FASHION_CONDITION_OPTIONS,
  FASHION_MATERIAL_OPTIONS,
  booleanField,
  createFashionConfig,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createBagConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  conditionFields?: ListingSpecField[];
  readinessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "brand",
      label: "Brand",
      required: true,
      placeholder: "e.g. Gucci, Zara, Generic, No Brand",
    }),
    textField({
      key: "color",
      label: "Color",
      required: true,
      placeholder: "e.g. Black, Brown, Beige",
    }),
    selectField({
      key: "material",
      label: "Material",
      required: true,
      options: FASHION_MATERIAL_OPTIONS,
    }),
    selectField({
      key: "size_capacity",
      label: "Size / Capacity",
      required: true,
      options: ["Small", "Medium", "Large", "Extra Large", "Not Sure"],
    }),
  ];

  const styleFields: ListingSpecField[] = [
    selectField({
      key: "closure_type",
      label: "Closure Type",
      required: true,
      options: ["Zip", "Magnet", "Buckle", "Drawstring", "Flap", "Open Top", "Other"],
    }),
    selectField({
      key: "strap_type",
      label: "Strap / Carry Type",
      options: ["Shoulder", "Crossbody", "Top Handle", "Backpack", "Hand Carry", "Mixed"],
      advanced: true,
    }),
    numberField({
      key: "compartments_count",
      label: "Number of Compartments",
      advanced: true,
      placeholder: "e.g. 3",
    }),
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
      key: "strap_condition",
      label: "Strap / Handle Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"],
    }),
    selectField({
      key: "zip_condition",
      label: "Zip / Closure Condition",
      required: true,
      options: ["Fully Working", "Mostly Fine", "Sometimes Sticks", "Damaged", "Not Applicable"],
    }),
    selectField({
      key: "lining_condition",
      label: "Inside / Lining Condition",
      required: true,
      options: ["Like New", "Very Good", "Good", "Fair", "Damaged"],
    }),
    booleanField({
      key: "has_tears",
      label: "Any Tears?",
      required: true,
    }),
    booleanField({
      key: "has_stains",
      label: "Any Stains?",
      required: true,
    }),
    ...(params.conditionFields || []),
  ];

  const readinessFields: ListingSpecField[] = [
    booleanField({
      key: "all_compartments_working",
      label: "All Compartments Working",
      required: true,
    }),
    booleanField({
      key: "ready_to_use",
      label: "Ready to Use",
      required: true,
    }),
    booleanField({
      key: "cleaned_recently",
      label: "Cleaned Recently",
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
      placeholder: "e.g. Used for classes, travel, office use",
    }),
    textField({
      key: "reason_for_selling",
      label: "Reason for Selling",
      advanced: true,
      placeholder: "Optional",
    }),
  ];

  return createFashionConfig({
    subcategory: "Bags",
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
      { title: "Bag Structure", keys: styleFields.map((f) => f.key) },
      { title: "Condition", keys: conditionFields.map((f) => f.key) },
      { title: "Readiness", keys: readinessFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "color",
      "material",
      "size_capacity",
      "closure_type",
      "body_condition",
      "strap_condition",
      "zip_condition",
      "lining_condition",
      "has_tears",
      "has_stains",
      "all_compartments_working",
      "ready_to_use",
      ...(params.requiredKeys || []),
    ],
  });
}

export const BACKPACKS_CONFIG = createBagConfig({
  itemType: "Backpacks",
  styleFields: [
    selectField({
      key: "backpack_use",
      label: "Main Use",
      required: true,
      options: ["School", "Travel", "Laptop", "Casual", "Hiking", "Other"],
    }),
    selectField({
      key: "fits_laptop",
      label: "Laptop Fit",
      options: ["No", 'Yes - 13"', 'Yes - 15"', 'Yes - 17"', "Not Sure"],
      advanced: true,
    }),
    booleanField({
      key: "side_pockets_present",
      label: "Side Pockets Present",
      advanced: true,
    }),
  ],
  conditionFields: [
    selectField({
      key: "back_padding_condition",
      label: "Back Padding Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged", "Not Applicable"],
    }),
  ],
  requiredKeys: ["backpack_use"],
});

export const HANDBAGS_CONFIG = createBagConfig({
  itemType: "Handbags",
  styleFields: [
    selectField({
      key: "handbag_style",
      label: "Handbag Style",
      required: true,
      options: ["Structured", "Soft", "Tote", "Satchel", "Mini Bag", "Shoulder Bag", "Other"],
    }),
    selectField({
      key: "occasion",
      label: "Occasion",
      options: ["Daily", "Office", "Party", "Formal", "Other"],
      advanced: true,
    }),
  ],
  requiredKeys: ["handbag_style"],
});

export const LAPTOP_BAGS_CONFIG = createBagConfig({
  itemType: "Laptop Bags",
  styleFields: [
    selectField({
      key: "fits_laptop",
      label: "Laptop Fit",
      required: true,
      options: ['13"', '14"', '15"', '16"', '17"', "Not Sure"],
    }),
    selectField({
      key: "padding_level",
      label: "Padding Level",
      options: ["Light", "Medium", "Heavy"],
      advanced: true,
    }),
    booleanField({
      key: "charger_pouch_included",
      label: "Charger Pouch Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["fits_laptop"],
});

export const DUFFEL_BAGS_CONFIG = createBagConfig({
  itemType: "Duffel Bags",
  styleFields: [
    selectField({
      key: "duffel_use",
      label: "Main Use",
      required: true,
      options: ["Gym", "Travel", "Sports", "Storage", "Other"],
    }),
    booleanField({
      key: "shoe_compartment_present",
      label: "Shoe Compartment Present",
      advanced: true,
    }),
  ],
  requiredKeys: ["duffel_use"],
});

export const CROSSBODY_BAGS_CONFIG = createBagConfig({
  itemType: "Crossbody Bags",
  styleFields: [
    selectField({
      key: "crossbody_style",
      label: "Crossbody Style",
      required: true,
      options: ["Compact", "Casual", "Formal", "Utility", "Mini", "Other"],
    }),
    booleanField({
      key: "strap_adjustable",
      label: "Strap Adjustable",
      advanced: true,
    }),
  ],
  requiredKeys: ["crossbody_style"],
});

export const WALLETS_PURSES_CONFIG = createBagConfig({
  itemType: "Wallets / Purses",
  styleFields: [
    selectField({
      key: "wallet_type",
      label: "Wallet / Purse Type",
      required: true,
      options: ["Bifold", "Trifold", "Cardholder", "Coin Purse", "Clutch Wallet", "Other"],
    }),
    numberField({
      key: "card_slots_count",
      label: "Card Slots",
      advanced: true,
      placeholder: "e.g. 6",
    }),
  ],
  conditionFields: [
    selectField({
      key: "coin_zip_condition",
      label: "Coin Zip Condition",
      advanced: true,
      options: ["Excellent", "Good", "Fair", "Damaged", "Not Applicable"],
    }),
  ],
  requiredKeys: ["wallet_type"],
});

export const BAGS_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  BACKPACKS_CONFIG,
  HANDBAGS_CONFIG,
  LAPTOP_BAGS_CONFIG,
  DUFFEL_BAGS_CONFIG,
  CROSSBODY_BAGS_CONFIG,
  WALLETS_PURSES_CONFIG,
];
