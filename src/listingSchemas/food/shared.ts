import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingSpecField,
} from "../core";

export const FOOD_CATEGORY = "Food & Groceries";

export const FOOD_STORAGE_OPTIONS = [
  "Room Temperature",
  "Keep Refrigerated",
  "Keep Frozen",
  "Store in Cool Dry Place",
  "Not Sure",
];

export const FOOD_FRESHNESS_OPTIONS = [
  "Very Fresh",
  "Fresh",
  "Use Soon",
  "Near Expiry",
];

export const FOOD_PACKAGING_OPTIONS = [
  "Sealed Pack",
  "Bottle",
  "Can",
  "Bag",
  "Box",
  "Loose / Unpacked",
  "Other",
];

export const FOOD_SPICE_LEVEL_OPTIONS = [
  "Mild",
  "Medium",
  "Hot",
  "Extra Hot",
  "Not Spicy",
];

export const FOOD_DIETARY_TAG_OPTIONS = [
  "Vegan",
  "Vegetarian",
  "Halal",
  "Kosher",
  "Gluten-Free",
  "Dairy-Free",
  "Nut-Free",
  "Organic",
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

export function createFoodConfig(params: {
  subcategory: string;
  itemType: string;
  fields: ListingSpecField[];
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}): ListingItemConfig {
  return {
    schema: {
      category: FOOD_CATEGORY,
      subcategory: params.subcategory,
      itemType: params.itemType,
      fields: params.fields,
    },
    fieldGroups: params.fieldGroups,
    requiredKeys: params.requiredKeys,
  };
}
