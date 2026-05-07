import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  DOCUMENT_CONDITION_OPTIONS,
  MATERIAL_FORMAT_OPTIONS,
  STUDY_LEVEL_OPTIONS,
  SUBJECT_AREA_OPTIONS,
  booleanField,
  createAcademicConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createMaterialConfig(params: {
  itemType: string;
  materialFields?: ListingSpecField[];
  accessFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    multiselectField({
      key: "subject_areas",
      label: "Subject Areas",
      required: true,
      options: SUBJECT_AREA_OPTIONS,
    }),
    selectField({
      key: "study_level",
      label: "Study Level",
      required: true,
      options: STUDY_LEVEL_OPTIONS,
    }),
    textField({
      key: "course_or_topic",
      label: "Course / Topic",
      required: true,
      placeholder: "e.g. Statistics I, Financial Accounting basics",
    }),
  ];

  const materialFields: ListingSpecField[] = [
    ...(params.materialFields || []),
    selectField({
      key: "format_type",
      label: "Format Type",
      required: true,
      options: MATERIAL_FORMAT_OPTIONS,
    }),
    numberField({
      key: "pages_or_files_count",
      label: "Pages / Files Count",
      advanced: true,
      placeholder: "e.g. 20",
    }),
    booleanField({
      key: "organized_by_topic",
      label: "Organized by Topic",
      advanced: true,
    }),
  ];

  const accessFields: ListingSpecField[] = [
    booleanField({
      key: "original_owner_permission",
      label: "Permission to Share / Sell",
      required: true,
      helpText: "Use this only for materials you are allowed to distribute.",
    }),
    booleanField({
      key: "editable_version_available",
      label: "Editable Version Available",
      advanced: true,
    }),
    selectField({
      key: "document_condition",
      label: "Document Condition",
      required: true,
      options: DOCUMENT_CONDITION_OPTIONS,
    }),
    ...(params.accessFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "coverage_summary",
      label: "Coverage Summary",
      required: true,
      placeholder: "Describe what the material covers",
    }),
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra details buyers should know",
    }),
  ];

  return createAcademicConfig({
    subcategory: "Notes & Study Materials",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...materialFields,
      ...accessFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Academic Scope", keys: identityFields.map((f) => f.key) },
      { title: "Material Details", keys: materialFields.map((f) => f.key) },
      { title: "Access & Condition", keys: accessFields.map((f) => f.key) },
      { title: "Coverage & Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "subject_areas",
      "study_level",
      "course_or_topic",
      "format_type",
      "original_owner_permission",
      "document_condition",
      "coverage_summary",
      ...(params.requiredKeys || []),
    ],
  });
}

export const LECTURE_NOTES_CONFIG = createMaterialConfig({
  itemType: "Lecture Notes",
  materialFields: [
    booleanField({
      key: "typed_or_handwritten",
      label: "Typed Version Available",
      advanced: true,
    }),
  ],
});

export const REVISION_SUMMARIES_CONFIG = createMaterialConfig({
  itemType: "Revision Summaries",
  materialFields: [
    booleanField({
      key: "key_points_only",
      label: "Key Points Only",
      advanced: true,
    }),
    booleanField({
      key: "exam_focus",
      label: "Exam Focused",
      advanced: true,
    }),
  ],
});

export const PAST_PAPERS_COLLECTION_CONFIG = createMaterialConfig({
  itemType: "Past Papers Collection",
  materialFields: [
    booleanField({
      key: "marking_schemes_included",
      label: "Marking Schemes Included",
      advanced: true,
    }),
    textField({
      key: "exam_year_range",
      label: "Exam Year Range",
      advanced: true,
      placeholder: "e.g. 2020-2024",
    }),
  ],
});

export const TEXTBOOKS_HANDOUTS_CONFIG = createMaterialConfig({
  itemType: "Textbooks & Handouts",
  materialFields: [
    booleanField({
      key: "physical_copy",
      label: "Physical Copy",
      advanced: true,
    }),
    booleanField({
      key: "digital_copy",
      label: "Digital Copy",
      advanced: true,
    }),
  ],
});

export const FORMULAS_QUICK_GUIDES_CONFIG = createMaterialConfig({
  itemType: "Formulas & Quick Guides",
  materialFields: [
    booleanField({
      key: "cheat_sheet_style",
      label: "Quick Reference Style",
      advanced: true,
      helpText: "For revision/reference only, not for unauthorized exam use.",
    }),
  ],
});

export const MATERIALS_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  LECTURE_NOTES_CONFIG,
  REVISION_SUMMARIES_CONFIG,
  PAST_PAPERS_COLLECTION_CONFIG,
  TEXTBOOKS_HANDOUTS_CONFIG,
  FORMULAS_QUICK_GUIDES_CONFIG,
];
