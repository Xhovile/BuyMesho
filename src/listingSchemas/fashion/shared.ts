import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingSpecField,
} from "../core";

export const FASHION_CATEGORY = "Fashion & Clothing";

export const FASHION_CONDITION_OPTIONS = [
  "Brand New",
  "Like New",
  "Very Good",
  "Good",
  "Fair",
  "Needs Repair",
];

export const FASHION_GENDER_OPTIONS = [
  "Men",
  "Women",
  "Unisex",
  "Kids",
  "Boys",
  "Girls",
  "Not Sure",
];

export const FASHION_MATERIAL_OPTIONS = [
  "Cotton",
  "Denim",
  "Polyester",
  "Wool",
  "Leather",
  "Faux Leather",
  "Canvas",
  "Linen",
  "Silk",
  "Nylon",
  "Rubber",
  "Synthetic",
  "Mixed",
  "Other",
  "Not Sure",
];

export const FASHION_SIZE_OPTIONS = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "One Size",
  "Free Size",
  "Not Sure",
];

export const AUTHENTICITY_OPTIONS = [
  "Original",
  "Tailor Made",
  "Thrifted",
  "Store Bought",
  "Custom Made",
  "Inspired / First Copy",
  "Not Sure",
];

export const FASHION_STYLE_TAG_OPTIONS = [
  "Casual",
  "Formal",
  "Streetwear",
  "Sportswear",
  "Traditional",
  "Office",
  "School",
  "Party",
  "Minimal",
  "Luxury",
  "Vintage",
  "Thrifted",
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

export function createFashionConfig(params: {
  subcategory: string;
  itemType: string;
  fields: ListingSpecField[];
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}): ListingItemConfig {
  return {
    schema: {
      category: FASHION_CATEGORY,
      subcategory: params.subcategory,
      itemType: params.itemType,
      fields: params.fields,
    },
    fieldGroups: params.fieldGroups,
    requiredKeys: params.requiredKeys,
  };
  }
