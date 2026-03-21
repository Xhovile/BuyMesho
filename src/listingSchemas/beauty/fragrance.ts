import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  BEAUTY_CONDITION_OPTIONS,
  BEAUTY_PACKAGING_CONDITION_OPTIONS,
  BEAUTY_STORAGE_OPTIONS,
  SCENT_FAMILY_OPTIONS,
  booleanField,
  createBeautyConfig,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createFragranceConfig(params: {
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
      placeholder: "e.g. Dior, Lattafa, Generic",
    }),
    numberField({
      key: "volume_ml",
      label: "Volume (ml)",
      required: true,
      placeholder: "e.g. 100",
    }),
    selectField({
      key: "scent_family",
      label: "Scent Family",
      required: true,
      options: SCENT_FAMILY_OPTIONS,
    }),
    selectField({
      key: "gender_target",
      label: "Gender Target",
      advanced: true,
      options: ["Men", "Women", "Unisex", "Kids", "Not Sure"],
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    selectField({
      key: "lasting_power",
      label: "Lasting Power",
      advanced: true,
      options: ["Light", "Moderate", "Long Lasting", "Very Long Lasting", "Not Sure"],
    }),
  ];

  const safetyFields: ListingSpecField[] = [
    selectField({
      key: "product_condition",
      label: "Product Condition",
      required: true,
      options: BEAUTY_CONDITION_OPTIONS,
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
    subcategory: "Fragrance",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...safetyFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Fragrance Identity", keys: identityFields.map((f) => f.key) },
      { title: "Scent Profile", keys: styleFields.map((f) => f.key) },
      { title: "Condition & Storage", keys: safetyFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "brand",
      "volume_ml",
      "scent_family",
      "product_condition",
      "sealed_packaging",
      "opened_before",
      "packaging_condition",
      "storage_requirement",
      ...(params.requiredKeys || []),
    ],
  });
}

export const PERFUME_CONFIG = createFragranceConfig({
  itemType: "Perfume",
  styleFields: [
    selectField({
      key: "concentration",
      label: "Concentration",
      required: true,
      options: ["Parfum", "EDP", "EDT", "EDC", "Body Spray", "Not Sure"],
    }),
  ],
  requiredKeys: ["concentration"],
});

export const BODY_MIST_CONFIG = createFragranceConfig({
  itemType: "Body Mist",
  styleFields: [
    selectField({
      key: "mist_type",
      label: "Mist Type",
      required: true,
      options: ["Body Mist", "Fragrance Mist", "Shimmer Mist", "Other"],
    }),
  ],
  requiredKeys: ["mist_type"],
});

export const DEODORANT_CONFIG = createFragranceConfig({
  itemType: "Deodorant",
  styleFields: [
    selectField({
      key: "deodorant_type",
      label: "Deodorant Type",
      required: true,
      options: ["Roll-On", "Spray", "Stick", "Cream", "Other"],
    }),
  ],
  requiredKeys: ["deodorant_type"],
});

export const SCENTED_OILS_CONFIG = createFragranceConfig({
  itemType: "Scented Oils",
  styleFields: [
    selectField({
      key: "oil_type",
      label: "Oil Type",
      required: true,
      options: ["Attar", "Perfume Oil", "Essential Oil Blend", "Body Oil", "Other"],
    }),
  ],
  requiredKeys: ["oil_type"],
});

export const FRAGRANCE_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  PERFUME_CONFIG,
  BODY_MIST_CONFIG,
  DEODORANT_CONFIG,
  SCENTED_OILS_CONFIG,
];
