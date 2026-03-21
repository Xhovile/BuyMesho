import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  AVAILABILITY_OPTIONS,
  BINDING_OPTIONS,
  DELIVERY_MODE_OPTIONS,
  MATERIAL_FORMAT_OPTIONS,
  PAPER_SIZE_OPTIONS,
  PRINT_OPTIONS,
  TURNAROUND_OPTIONS,
  booleanField,
  createAcademicConfig,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createDocumentServiceConfig(params: {
  subcategory: string;
  itemType: string;
  serviceFields?: ListingSpecField[];
  outputFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    selectField({
      key: "availability",
      label: "Availability",
      required: true,
      options: AVAILABILITY_OPTIONS,
    }),
    selectField({
      key: "turnaround_time",
      label: "Turnaround Time",
      required: true,
      options: TURNAROUND_OPTIONS,
    }),
    selectField({
      key: "delivery_mode",
      label: "Delivery Mode",
      required: true,
      options: DELIVERY_MODE_OPTIONS,
    }),
  ];

  const serviceFields: ListingSpecField[] = [
    ...(params.serviceFields || []),
    booleanField({
      key: "urgent_service_available",
      label: "Urgent Service Available",
      advanced: true,
    }),
  ];

  const outputFields: ListingSpecField[] = [
    ...(params.outputFields || []),
    selectField({
      key: "output_format",
      label: "Output Format",
      required: true,
      options: MATERIAL_FORMAT_OPTIONS,
    }),
    textareaField({
      key: "service_scope",
      label: "Service Scope",
      required: true,
      placeholder: "Describe what is included",
    }),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra details buyers should know",
    }),
  ];

  return createAcademicConfig({
    subcategory: params.subcategory,
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...serviceFields,
      ...outputFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Service Setup", keys: identityFields.map((f) => f.key) },
      { title: "Work Details", keys: serviceFields.map((f) => f.key) },
      { title: "Output", keys: outputFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "availability",
      "turnaround_time",
      "delivery_mode",
      "output_format",
      "service_scope",
      ...(params.requiredKeys || []),
    ],
  });
}

export const PRINTING_CONFIG = createDocumentServiceConfig({
  subcategory: "Printing & Document Services",
  itemType: "Printing",
  serviceFields: [
    selectField({
      key: "print_type",
      label: "Print Type",
      required: true,
      options: PRINT_OPTIONS,
    }),
    selectField({
      key: "paper_size",
      label: "Paper Size",
      required: true,
      options: PAPER_SIZE_OPTIONS,
    }),
    booleanField({
      key: "double_sided_available",
      label: "Double-Sided Available",
      advanced: true,
    }),
  ],
  outputFields: [
    selectField({
      key: "binding_type",
      label: "Binding Type",
      advanced: true,
      options: BINDING_OPTIONS,
    }),
  ],
  requiredKeys: ["print_type", "paper_size"],
});

export const PHOTOCOPYING_SCANNING_CONFIG = createDocumentServiceConfig({
  subcategory: "Printing & Document Services",
  itemType: "Photocopying & Scanning",
  serviceFields: [
    selectField({
      key: "copy_service_type",
      label: "Service Type",
      required: true,
      options: ["Photocopying", "Scanning", "Both"],
    }),
    selectField({
      key: "paper_size",
      label: "Paper Size",
      advanced: true,
      options: PAPER_SIZE_OPTIONS,
    }),
  ],
  requiredKeys: ["copy_service_type"],
});

export const BINDING_LAMINATION_CONFIG = createDocumentServiceConfig({
  subcategory: "Printing & Document Services",
  itemType: "Binding & Lamination",
  serviceFields: [
    selectField({
      key: "binding_type",
      label: "Binding Type",
      required: true,
      options: BINDING_OPTIONS,
    }),
    booleanField({
      key: "lamination_available",
      label: "Lamination Available",
      advanced: true,
    }),
  ],
  requiredKeys: ["binding_type"],
});

export const TYPING_TRANSCRIPTION_CONFIG = createDocumentServiceConfig({
  subcategory: "Typing & Formatting",
  itemType: "Typing & Transcription",
  serviceFields: [
    selectField({
      key: "source_material_type",
      label: "Source Material Type",
      required: true,
      options: ["Handwritten Notes", "Scanned Document", "Audio", "Image", "Mixed"],
    }),
    booleanField({
      key: "proofreading_included",
      label: "Proofreading Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["source_material_type"],
});

export const REPORT_PROPOSAL_FORMATTING_CONFIG = createDocumentServiceConfig({
  subcategory: "Typing & Formatting",
  itemType: "Report / Proposal Formatting",
  serviceFields: [
    booleanField({
      key: "referencing_format_supported",
      label: "Referencing Format Supported",
      advanced: true,
    }),
    booleanField({
      key: "table_of_contents_setup",
      label: "Table of Contents Setup",
      advanced: true,
    }),
  ],
});

export const CV_DOCUMENT_FORMATTING_CONFIG = createDocumentServiceConfig({
  subcategory: "Typing & Formatting",
  itemType: "CV & Document Formatting",
  serviceFields: [
    booleanField({
      key: "cv_formatting_supported",
      label: "CV Formatting Supported",
      advanced: true,
    }),
    booleanField({
      key: "cover_letter_formatting_supported",
      label: "Cover Letter Formatting Supported",
      advanced: true,
    }),
  ],
});

export const DATA_ENTRY_SPREADSHEET_CONFIG = createDocumentServiceConfig({
  subcategory: "Typing & Formatting",
  itemType: "Data Entry & Spreadsheet Setup",
  serviceFields: [
    booleanField({
      key: "excel_supported",
      label: "Excel Supported",
      advanced: true,
    }),
    booleanField({
      key: "basic_formulas_supported",
      label: "Basic Formulas Supported",
      advanced: true,
    }),
  ],
});

export const DOCUMENTS_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  PRINTING_CONFIG,
  PHOTOCOPYING_SCANNING_CONFIG,
  BINDING_LAMINATION_CONFIG,
  TYPING_TRANSCRIPTION_CONFIG,
  REPORT_PROPOSAL_FORMATTING_CONFIG,
  CV_DOCUMENT_FORMATTING_CONFIG,
  DATA_ENTRY_SPREADSHEET_CONFIG,
];
