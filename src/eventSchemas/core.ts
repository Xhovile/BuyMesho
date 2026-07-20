import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingSpecField,
  ListingSpecValidationError,
  ListingSpecValidationResult,
  ListingSpecValues,
} from "../listingSchemas/core.js";

export const EVENT_CATEGORY = "Events";
export const EVENT_SUBCATEGORY = "Tickets & Happenings";

export type EventItemConfig = ListingItemConfig;
export type EventSpecField = ListingSpecField;
export type EventSpecValue = ListingSpecValues[string];

export const EVENT_TICKET_MODE_OPTIONS = ["Free", "Paid", "RSVP", "Donation"] as const;
export const EVENT_DELIVERY_MODE_OPTIONS = ["In Person", "Online", "Hybrid"] as const;

export const textField = ({
  key,
  label,
  required,
  advanced,
  placeholder,
  helpText,
}: {
  key: string;
  label: string;
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
}): ListingSpecField => ({
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
}: {
  key: string;
  label: string;
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
}): ListingSpecField => ({
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
}: {
  key: string;
  label: string;
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
}): ListingSpecField => ({
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
}: {
  key: string;
  label: string;
  required?: boolean;
  advanced?: boolean;
  helpText?: string;
}): ListingSpecField => ({
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
}: {
  key: string;
  label: string;
  options: string[];
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
}): ListingSpecField => ({
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
}: {
  key: string;
  label: string;
  options: string[];
  required?: boolean;
  advanced?: boolean;
  helpText?: string;
}): ListingSpecField => ({
  key,
  label,
  type: "multiselect",
  options,
  required,
  advanced,
  helpText,
});

export function createEventConfig(params: {
  itemType: string;
  fields: ListingSpecField[];
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}): EventItemConfig {
  return {
    schema: {
      category: EVENT_CATEGORY,
      subcategory: EVENT_SUBCATEGORY,
      itemType: params.itemType,
      fields: params.fields,
    },
    fieldGroups: params.fieldGroups,
    requiredKeys: params.requiredKeys,
  };
}

export function createEmptyEventSpecValues(fields: ListingSpecField[]): ListingSpecValues {
  return fields.reduce((acc, field) => {
    switch (field.type) {
      case "multiselect":
        acc[field.key] = [];
        break;
      case "boolean":
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

export function validateEventSpecValues(
  fields: ListingSpecField[],
  requiredKeys: string[],
  values: ListingSpecValues = {}
): ListingSpecValidationResult {
  const errors: ListingSpecValidationError[] = [];

  for (const field of fields) {
    const value = values[field.key];
    const isRequired = requiredKeys.includes(field.key) || !!field.required;

    if (isRequired) {
      const isEmptyString = typeof value === "string" && value.trim().length === 0;
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isMissing = value === null || value === undefined || isEmptyString || isEmptyArray;

      if (isMissing) {
        errors.push({ key: field.key, message: `${field.label} is required.` });
        continue;
      }
    }

    if (value === null || value === undefined || value === "") continue;

    if (field.type === "multiselect" && !Array.isArray(value)) {
      errors.push({ key: field.key, message: `${field.label} must be a list of selected values.` });
      continue;
    }

    if (field.type === "boolean" && typeof value !== "boolean") {
      errors.push({ key: field.key, message: `${field.label} must be true or false.` });
      continue;
    }

    if (field.type === "number") {
      const isValidNumber =
        typeof value === "number" ||
        (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value)));

      if (!isValidNumber) {
        errors.push({ key: field.key, message: `${field.label} must be a valid number.` });
      }
      continue;
    }

    if ((field.type === "select" || field.type === "text" || field.type === "textarea") && typeof value !== "string") {
      errors.push({ key: field.key, message: `${field.label} must be text.` });
      continue;
    }

    if (
      field.type === "select" &&
      field.options &&
      typeof value === "string" &&
      value.trim() !== "" &&
      !field.options.includes(value)
    ) {
      errors.push({ key: field.key, message: `${field.label} has an invalid option selected.` });
      continue;
    }

    if (field.type === "multiselect" && field.options && Array.isArray(value)) {
      const invalidOptions = value.filter((item) => typeof item !== "string" || !field.options?.includes(item));
      if (invalidOptions.length > 0) {
        errors.push({ key: field.key, message: `${field.label} contains an invalid selection.` });
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
