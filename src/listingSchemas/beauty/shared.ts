import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingSpecField,
} from "../core";

export const BEAUTY_CATEGORY = "Beauty & Personal Care";

export const BEAUTY_CONDITION_OPTIONS = [
  "Sealed / Unopened",
  "Opened - Like New",
  "Gently Used",
  "Partially Used",
  "Damaged Packaging",
];

export const BEAUTY_PACKAGING_CONDITION_OPTIONS = [
  "Excellent",
  "Good",
  "Fair",
  "Damaged",
];

export const BEAUTY_STORAGE_OPTIONS = [
  "Room Temperature",
  "Keep Refrigerated",
  "Keep Away from Sunlight",
  "Keep in Cool Dry Place",
  "Use Immediately",
];

export const SKIN_TYPE_OPTIONS = [
  "All Skin Types",
  "Oily",
  "Dry",
  "Combination",
  "Sensitive",
  "Acne-Prone",
  "Not Sure",
];

export const HAIR_TYPE_OPTIONS = [
  "All Hair Types",
  "Straight",
  "Wavy",
  "Curly",
  "Coily",
  "Natural Hair",
  "Chemically Treated",
  "Locs",
  "Not Sure",
];

export const SHADE_DEPTH_OPTIONS = [
  "Very Fair",
  "Fair",
  "Light",
  "Light Medium",
  "Medium",
  "Tan",
  "Deep",
  "Very Deep",
  "Not Sure",
];

export const COVERAGE_OPTIONS = [
  "Sheer",
  "Light",
  "Medium",
  "Full",
  "Buildable",
];

export const FINISH_OPTIONS = [
  "Matte",
  "Natural",
  "Dewy",
  "Radiant",
  "Satin",
  "Glossy",
  "Not Sure",
];

export const SCENT_FAMILY_OPTIONS = [
  "Floral",
  "Fresh",
  "Fruity",
  "Woody",
  "Oriental",
  "Sweet",
  "Citrus",
  "Aquatic",
  "Spicy",
  "Musk",
  "Not Sure",
];

export const BEAUTY_TARGET_CONCERN_OPTIONS = [
  "Acne",
  "Dark Spots",
  "Hyperpigmentation",
  "Dryness",
  "Oil Control",
  "Anti-Aging",
  "Sun Protection",
  "Dullness",
  "Hair Growth",
  "Hair Breakage",
  "Frizz Control",
  "Scalp Care",
];

export const SERVICE_AVAILABILITY_OPTIONS = [
  "Available Now",
  "By Appointment",
  "Weekdays Only",
  "Weekends Only",
  "Limited Slots",
];

export const SERVICE_LOCATION_OPTIONS = [
  "Seller Location",
  "Client Location",
  "Home Service",
  "Shop / Salon",
  "Online Consultation",
];

export const SERVICE_DURATION_OPTIONS = [
  "Under 30 mins",
  "30-60 mins",
  "1-2 hours",
  "2-4 hours",
  "Half Day",
  "Full Day",
  "Varies",
];

type BaseFieldParams = {
  key: string;
  label: string;
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
};

type OptionFieldParams = BaseFieldParams & {
  options: string[];
};

export const textField = ({
  key,
  label,
  required,
  advanced,
  placeholder,
  helpText,
}: BaseFieldParams): ListingSpecField => ({
  key,
  label,
  type: "text",
  required,
  advanced,
  placeholder,
  helpText,
});

export const textareaField = ({
  key,
  label,
  required,
  advanced,
  placeholder,
  helpText,
}: BaseFieldParams): ListingSpecField => ({
  key,
  label,
  type: "textarea",
  required,
  advanced,
  placeholder,
  helpText,
});

export const numberField = ({
  key,
  label,
  required,
  advanced,
  placeholder,
  helpText,
}: BaseFieldParams): ListingSpecField => ({
  key,
  label,
  type: "number",
  required,
  advanced,
  placeholder,
  helpText,
});

export const booleanField = ({
  key,
  label,
  required,
  advanced,
  helpText,
}: Omit<BaseFieldParams, "placeholder">): ListingSpecField => ({
  key,
  label,
  type: "boolean",
  required,
  advanced,
  helpText,
});

export const selectField = ({
  key,
  label,
  options,
  required,
  advanced,
  placeholder,
  helpText,
}: OptionFieldParams): ListingSpecField => ({
  key,
  label,
  type: "select",
  options,
  required,
  advanced,
  placeholder,
  helpText,
});

export const multiselectField = ({
  key,
  label,
  options,
  required,
  advanced,
  helpText,
}: Omit<OptionFieldParams, "placeholder">): ListingSpecField => ({
  key,
  label,
  type: "multiselect",
  options,
  required,
  advanced,
  helpText,
});

export function createBeautyConfig(params: {
  subcategory: string;
  itemType: string;
  fields: ListingSpecField[];
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}): ListingItemConfig {
  return {
    schema: {
      category: BEAUTY_CATEGORY,
      subcategory: params.subcategory,
      itemType: params.itemType,
      fields: params.fields,
    },
    fieldGroups: params.fieldGroups,
    requiredKeys: params.requiredKeys,
  };
}
