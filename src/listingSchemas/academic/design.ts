import type { ListingItemConfig, ListingSpecField } from "../core.js";
import {
  AVAILABILITY_OPTIONS,
  DELIVERY_MODE_OPTIONS,
  TURNAROUND_OPTIONS,
  booleanField,
  createAcademicConfig,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared.js";

function createDesignSupportConfig(params: {
  itemType: string;
  designFields?: ListingSpecField[];
  deliveryFields?: ListingSpecField[];
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

  const designFields: ListingSpecField[] = [
    ...(params.designFields || []),
    booleanField({
      key: "source_content_provided_by_client",
      label: "Client Provides Source Content",
      advanced: true,
    }),
    booleanField({
      key: "revisions_available",
      label: "Revisions Available",
      advanced: true,
    }),
  ];

  const deliveryFields: ListingSpecField[] = [
    ...(params.deliveryFields || []),
    numberField({
      key: "estimated_slides_or_pages",
      label: "Estimated Slides / Pages",
      advanced: true,
      placeholder: "e.g. 10",
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
    subcategory: "Design & Presentation Support",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...designFields,
      ...deliveryFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Service Setup", keys: identityFields.map((f) => f.key) },
      { title: "Design Details", keys: designFields.map((f) => f.key) },
      { title: "Delivery", keys: deliveryFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "availability",
      "turnaround_time",
      "delivery_mode",
      "service_scope",
      ...(params.requiredKeys || []),
    ],
  });
}

export const POSTER_FLYER_DESIGN_CONFIG = createDesignSupportConfig({
  itemType: "Poster & Flyer Design",
  designFields: [
    selectField({
      key: "design_type",
      label: "Design Type",
      required: true,
      options: ["Poster", "Flyer", "Event Poster", "Academic Notice", "Other"],
    }),
  ],
  requiredKeys: ["design_type"],
});

export const PRESENTATION_SLIDES_CONFIG = createDesignSupportConfig({
  itemType: "Presentation Slides Design",
  designFields: [
    booleanField({
      key: "speaker_notes_supported",
      label: "Speaker Notes Supported",
      advanced: true,
    }),
    booleanField({
      key: "charts_graphs_supported",
      label: "Charts / Graphs Supported",
      advanced: true,
    }),
  ],
});

export const INFOGRAPHICS_CONFIG = createDesignSupportConfig({
  itemType: "Infographics",
  designFields: [
    selectField({
      key: "design_type",
      label: "Design Type",
      required: true,
      options: ["Infographic", "Data Visual Summary", "Research Poster", "Other"],
    }),
  ],
  requiredKeys: ["design_type"],
});

export const CERTIFICATE_INVITATION_DESIGN_CONFIG = createDesignSupportConfig({
  itemType: "Certificate & Invitation Design",
  designFields: [
    selectField({
      key: "design_type",
      label: "Design Type",
      required: true,
      options: ["Certificate", "Invitation", "Program Card", "Other"],
    }),
  ],
  requiredKeys: ["design_type"],
});

export const DESIGN_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  POSTER_FLYER_DESIGN_CONFIG,
  PRESENTATION_SLIDES_CONFIG,
  INFOGRAPHICS_CONFIG,
  CERTIFICATE_INVITATION_DESIGN_CONFIG,
];
