import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  AVAILABILITY_OPTIONS,
  DELIVERY_MODE_OPTIONS,
  MEETING_LOCATION_OPTIONS,
  STUDY_LEVEL_OPTIONS,
  SUBJECT_AREA_OPTIONS,
  TURNAROUND_OPTIONS,
  booleanField,
  createAcademicConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createTutoringConfig(params: {
  itemType: string;
  serviceFields?: ListingSpecField[];
  bookingFields?: ListingSpecField[];
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
      key: "provider_experience",
      label: "Experience",
      required: true,
      placeholder: "e.g. 2 years tutoring, strong grade in subject",
    }),
    booleanField({
      key: "portfolio_or_results_available",
      label: "Portfolio / Results Available",
      advanced: true,
    }),
  ];

  const serviceFields: ListingSpecField[] = [
    ...(params.serviceFields || []),
    selectField({
      key: "delivery_mode",
      label: "Delivery Mode",
      required: true,
      options: DELIVERY_MODE_OPTIONS,
    }),
    selectField({
      key: "meeting_location",
      label: "Meeting Location",
      required: true,
      options: MEETING_LOCATION_OPTIONS,
    }),
    selectField({
      key: "availability",
      label: "Availability",
      required: true,
      options: AVAILABILITY_OPTIONS,
    }),
  ];

  const bookingFields: ListingSpecField[] = [
    numberField({
      key: "session_length_minutes",
      label: "Session Length (minutes)",
      required: true,
      placeholder: "e.g. 60",
    }),
    textField({
      key: "booking_notice",
      label: "Booking Notice",
      required: true,
      placeholder: "e.g. Same day, 24 hours before",
    }),
    booleanField({
      key: "materials_included",
      label: "Materials Included",
      advanced: true,
    }),
    ...(params.bookingFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "service_scope",
      label: "Service Scope",
      required: true,
      placeholder: "Describe what support is included",
      helpText:
        "Keep this to tutoring, revision, explanation, and guidance only.",
    }),
    textareaField({
      key: "seller_notes",
      label: "Seller Notes",
      advanced: true,
      placeholder: "Extra details learners should know",
    }),
  ];

  return createAcademicConfig({
    subcategory: "Tutoring & Revision",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...serviceFields,
      ...bookingFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Tutor Identity", keys: identityFields.map((f) => f.key) },
      { title: "Service Setup", keys: serviceFields.map((f) => f.key) },
      { title: "Sessions & Booking", keys: bookingFields.map((f) => f.key) },
      { title: "Scope & Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "subject_areas",
      "study_level",
      "provider_experience",
      "delivery_mode",
      "meeting_location",
      "availability",
      "session_length_minutes",
      "booking_notice",
      "service_scope",
      ...(params.requiredKeys || []),
    ],
  });
}

export const ONE_ON_ONE_TUTORING_CONFIG = createTutoringConfig({
  itemType: "One-on-One Tutoring",
  serviceFields: [
    booleanField({
      key: "personalized_learning_plan",
      label: "Personalized Learning Plan",
      advanced: true,
    }),
  ],
});

export const GROUP_TUTORING_CONFIG = createTutoringConfig({
  itemType: "Group Tutoring",
  bookingFields: [
    numberField({
      key: "max_group_size",
      label: "Max Group Size",
      required: true,
      placeholder: "e.g. 5",
    }),
  ],
  requiredKeys: ["max_group_size"],
});

export const EXAM_REVISION_SESSIONS_CONFIG = createTutoringConfig({
  itemType: "Exam Revision Sessions",
  serviceFields: [
    booleanField({
      key: "past_papers_used",
      label: "Past Papers Used",
      advanced: true,
    }),
    booleanField({
      key: "practice_questions_included",
      label: "Practice Questions Included",
      advanced: true,
    }),
  ],
});

export const ASSIGNMENT_GUIDANCE_CONFIG = createTutoringConfig({
  itemType: "Assignment Guidance",
  noteFields: undefined,
  serviceFields: [
    selectField({
      key: "guidance_type",
      label: "Guidance Type",
      required: true,
      options: [
        "Topic Clarification",
        "Structure Guidance",
        "Referencing Guidance",
        "Data Interpretation Guidance",
        "Editing Feedback",
      ],
      helpText:
        "Guidance only. Not writing or completing graded work on behalf of others.",
    }),
  ],
  requiredKeys: ["guidance_type"],
});

export const STUDY_COACHING_CONFIG = createTutoringConfig({
  itemType: "Study Coaching",
  serviceFields: [
    selectField({
      key: "coaching_focus",
      label: "Coaching Focus",
      required: true,
      options: [
        "Time Management",
        "Study Planning",
        "Revision Strategy",
        "Exam Preparation",
        "Note-Taking",
        "Mixed",
      ],
    }),
  ],
  requiredKeys: ["coaching_focus"],
});

export const TUTORING_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  ONE_ON_ONE_TUTORING_CONFIG,
  GROUP_TUTORING_CONFIG,
  EXAM_REVISION_SESSIONS_CONFIG,
  ASSIGNMENT_GUIDANCE_CONFIG,
  STUDY_COACHING_CONFIG,
];
