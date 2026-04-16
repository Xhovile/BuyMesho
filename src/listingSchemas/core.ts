export type ListingSpecFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "boolean";

export interface ListingSpecField {
  key: string;
  label: string;
  type: ListingSpecFieldType;
  required?: boolean;
  advanced?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
}

export interface ListingItemSchema {
  category: string;
  subcategory: string;
  itemType: string;
  fields: ListingSpecField[];
}

export interface ListingFieldGroup {
  title: string;
  keys: string[];
}

export interface ListingItemConfig {
  schema: ListingItemSchema;
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}

export type ListingSpecValue = string | number | boolean | string[] | null;
export type ListingSpecValues = Record<string, ListingSpecValue>;

export interface ListingSpecValidationError {
  key: string;
  message: string;
}

export interface ListingSpecValidationResult {
  isValid: boolean;
  errors: ListingSpecValidationError[];
}
