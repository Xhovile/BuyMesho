import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingItemSchema,
  ListingSpecField,
  ListingSpecValidationError,
  ListingSpecValidationResult,
  ListingSpecValues,
} from "./core";

import { ELECTRONICS_LISTING_ITEM_CONFIGS } from "./electronics";
import { FASHION_LISTING_ITEM_CONFIGS } from "./fashion";
import { FOOD_LISTING_ITEM_CONFIGS } from "./food";
import { ACADEMIC_LISTING_ITEM_CONFIGS } from "./academic";
import { BEAUTY_LISTING_ITEM_CONFIGS } from "./beauty";

export type ListingItemConfigRegistry = Record<
  string,
  Record<string, Record<string, ListingItemConfig>>
>;

export const ALL_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ...ELECTRONICS_LISTING_ITEM_CONFIGS,
  ...FASHION_LISTING_ITEM_CONFIGS,
  ...FOOD_LISTING_ITEM_CONFIGS,
  ...ACADEMIC_LISTING_ITEM_CONFIGS,
  ...BEAUTY_LISTING_ITEM_CONFIGS,
];

export const ALL_LISTING_SCHEMAS: ListingItemSchema[] =
  ALL_LISTING_ITEM_CONFIGS.map((item) => item.schema);

export const LISTING_ITEM_CONFIG_REGISTRY: ListingItemConfigRegistry =
  ALL_LISTING_ITEM_CONFIGS.reduce((acc, itemConfig) => {
    const { schema } = itemConfig;

    if (!acc[schema.category]) {
      acc[schema.category] = {};
    }

    if (!acc[schema.category][schema.subcategory]) {
      acc[schema.category][schema.subcategory] = {};
    }

    acc[schema.category][schema.subcategory][schema.itemType] = itemConfig;

    return acc;
  }, {} as ListingItemConfigRegistry);

export function getListingItemConfig(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingItemConfig | null {
  if (!category || !subcategory || !itemType) {
    return null;
  }

  return (
    LISTING_ITEM_CONFIG_REGISTRY[category]?.[subcategory]?.[itemType] ?? null
  );
}

export function getListingSchema(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingItemSchema | null {
  return getListingItemConfig(category, subcategory, itemType)?.schema ?? null;
}

export function getListingFieldGroups(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingFieldGroup[] {
  return getListingItemConfig(category, subcategory, itemType)?.fieldGroups ?? [];
}

export function getListingRequiredKeys(
  category?: string,
  subcategory?: string,
  itemType?: string
): string[] {
  return getListingItemConfig(category, subcategory, itemType)?.requiredKeys ?? [];
}

export function getListingCategories(): string[] {
  return Object.keys(LISTING_ITEM_CONFIG_REGISTRY);
}

export function getListingSubcategories(category?: string): string[] {
  if (!category) return [];
  return Object.keys(LISTING_ITEM_CONFIG_REGISTRY[category] ?? {});
}

export function getListingItemTypes(
  category?: string,
  subcategory?: string
): string[] {
  if (!category || !subcategory) return [];
  return Object.keys(
    LISTING_ITEM_CONFIG_REGISTRY[category]?.[subcategory] ?? {}
  );
}

export function hasListingSchema(
  category?: string,
  subcategory?: string,
  itemType?: string
): boolean {
  return !!getListingItemConfig(category, subcategory, itemType);
}

export function getListingField(
  category?: string,
  subcategory?: string,
  itemType?: string,
  fieldKey?: string
): ListingSpecField | null {
  if (!fieldKey) {
    return null;
  }

  const schema = getListingSchema(category, subcategory, itemType);
  if (!schema) {
    return null;
  }

  return schema.fields.find((field) => field.key === fieldKey) ?? null;
}

export function getBasicListingFields(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingSpecField[] {
  const schema = getListingSchema(category, subcategory, itemType);
  if (!schema) {
    return [];
  }

  return schema.fields.filter((field) => !field.advanced);
}

export function getAdvancedListingFields(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingSpecField[] {
  const schema = getListingSchema(category, subcategory, itemType);
  if (!schema) {
    return [];
  }

  return schema.fields.filter((field) => !!field.advanced);
}

export function getRequiredListingFields(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingSpecField[] {
  const schema = getListingSchema(category, subcategory, itemType);
  const requiredKeys = getListingRequiredKeys(category, subcategory, itemType);

  if (!schema) {
    return [];
  }

  return schema.fields.filter((field) => requiredKeys.includes(field.key));
}

export function createEmptyListingSpecValues(
  category?: string,
  subcategory?: string,
  itemType?: string
): ListingSpecValues {
  const schema = getListingSchema(category, subcategory, itemType);

  if (!schema) {
    return {};
  }

  return schema.fields.reduce((acc, field) => {
    switch (field.type) {
      case "multiselect":
        acc[field.key] = [];
        break;
      case "boolean":
        acc[field.key] = null;
        break;
      case "number":
        acc[field.key] = null;
        break;
      case "text":
      case "textarea":
      case "select":
      default:
        acc[field.key] = "";
        break;
    }

    return acc;
  }, {} as ListingSpecValues);
}

export function validateListingSpecValues(
  category?: string,
  subcategory?: string,
  itemType?: string,
  values: ListingSpecValues = {}
): ListingSpecValidationResult {
  const schema = getListingSchema(category, subcategory, itemType);
  const requiredKeys = getListingRequiredKeys(category, subcategory, itemType);

  if (!schema) {
    return {
      isValid: false,
      errors: [
        {
          key: "schema",
          message: "No listing schema found for the selected item.",
        },
      ],
    };
  }

  const errors: ListingSpecValidationError[] = [];

  for (const field of schema.fields) {
    const value = values[field.key];
    const isRequired = requiredKeys.includes(field.key) || !!field.required;

    if (isRequired) {
      const isEmptyString =
        typeof value === "string" && value.trim().length === 0;
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isMissing =
        value === null ||
        value === undefined ||
        isEmptyString ||
        isEmptyArray;

      if (isMissing) {
        errors.push({
          key: field.key,
          message: `${field.label} is required.`,
        });
        continue;
      }
    }

    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (field.type === "multiselect" && !Array.isArray(value)) {
      errors.push({
        key: field.key,
        message: `${field.label} must be a list of selected values.`,
      });
    }

    if (field.type === "boolean" && typeof value !== "boolean") {
      errors.push({
        key: field.key,
        message: `${field.label} must be true or false.`,
      });
    }

    if (field.type === "number") {
      const isValidNumber =
        typeof value === "number" ||
        (typeof value === "string" &&
          value.trim() !== "" &&
          !Number.isNaN(Number(value)));

      if (!isValidNumber) {
        errors.push({
          key: field.key,
          message: `${field.label} must be a valid number.`,
        });
      }
    }

    if (
      (field.type === "select" ||
        field.type === "text" ||
        field.type === "textarea") &&
      typeof value !== "string"
    ) {
      errors.push({
        key: field.key,
        message: `${field.label} must be text.`,
      });
    }

    if (
      field.type === "select" &&
      field.options &&
      typeof value === "string" &&
      value.trim() !== "" &&
      !field.options.includes(value)
    ) {
      errors.push({
        key: field.key,
        message: `${field.label} has an invalid option selected.`,
      });
    }

    if (
      field.type === "multiselect" &&
      field.options &&
      Array.isArray(value)
    ) {
      const invalidOptions = value.filter(
        (item) => typeof item !== "string" || !field.options?.includes(item)
      );

      if (invalidOptions.length > 0) {
        errors.push({
          key: field.key,
          message: `${field.label} contains invalid selected values.`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
