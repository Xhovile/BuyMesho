import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingSpecField,
} from "../core";

export const ACADEMIC_CATEGORY = "Academic Services";

export const STUDY_LEVEL_OPTIONS = [
  "Primary",
  "Secondary",
  "Foundation",
  "Certificate",
  "Diploma",
  "Undergraduate",
  "Postgraduate",
  "Mixed Levels",
];

export const SUBJECT_AREA_OPTIONS = [
  "Mathematics",
  "Statistics",
  "Accounting",
  "Economics",
  "Marketing",
  "Business Studies",
  "Agriculture",
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Studies",
  "English",
  "Research Methods",
  "Mixed Subjects",
  "Other",
];

export const DELIVERY_MODE_OPTIONS = [
  "In Person",
  "Online",
  "Hybrid",
];

export const MEETING_LOCATION_OPTIONS = [
  "Campus",
  "Seller Location",
  "Client Location",
  "Library",
  "Online",
  "Flexible",
];

export const TURNAROUND_OPTIONS = [
  "Same Day",
  "Next Day",
  "2-3 Days",
  "Within a Week",
  "Flexible",
];

export const AVAILABILITY_OPTIONS = [
  "Available Now",
  "By Appointment",
  "Weekdays Only",
  "Weekends Only",
  "Limited Slots",
];

export const MATERIAL_FORMAT_OPTIONS = [
  "Printed Copy",
  "PDF",
  "Word Document",
  "PowerPoint",
  "Excel",
  "Scanned Copy",
  "Image Files",
  "Mixed Formats",
];

export const DOCUMENT_CONDITION_OPTIONS = [
  "Brand New",
  "Like New",
  "Good",
  "Used",
  "Worn",
];

export const PRINT_OPTIONS = [
  "Black & White",
  "Color",
  "Both",
];

export const PAPER_SIZE_OPTIONS = [
  "A4",
  "A3",
  "Letter",
  "Custom",
];

export const BINDING_OPTIONS = [
  "None",
  "Stapled",
  "Spiral Bound",
  "Tape Bound",
  "Laminated",
  "Folder Only",
];

export const DESIGN_TYPE_OPTIONS = [
  "Poster",
  "Flyer",
  "Presentation Slides",
  "Infographic",
  "Invitation",
  "Banner",
  "Certificate",
  "Other",
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

export function createAcademicConfig(params: {
  subcategory: string;
  itemType: string;
  fields: ListingSpecField[];
  fieldGroups: ListingFieldGroup[];
  requiredKeys: string[];
}): ListingItemConfig {
  return {
    schema: {
      category: ACADEMIC_CATEGORY,
      subcategory: params.subcategory,
      itemType: params.itemType,
      fields: params.fields,
    },
    fieldGroups: params.fieldGroups,
    requiredKeys: params.requiredKeys,
  };
}
