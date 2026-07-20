import type {
  ListingFieldGroup,
  ListingItemConfig,
  ListingItemSchema,
  ListingSpecField,
  ListingSpecValidationError,
  ListingSpecValidationResult,
  ListingSpecValues,
} from "../listingSchemas/core.js";
import {
  EVENT_CATEGORY,
  EVENT_DELIVERY_MODE_OPTIONS,
  EVENT_SUBCATEGORY,
  EVENT_TICKET_MODE_OPTIONS,
  booleanField,
  createEmptyEventSpecValues,
  createEventConfig,
  multiselectField,
  numberField,
  selectField,
  textField,
  textareaField,
  validateEventSpecValues,
} from "./core.js";

const BASE_EVENT_FIELDS: ListingSpecField[] = [
  textField({
    key: "event_title",
    label: "Event Title",
    required: true,
    placeholder: "e.g. Autumn Music Night",
  }),
  textField({
    key: "organizer_name",
    label: "Organizer Name",
    required: true,
    placeholder: "e.g. Student Union / Club / Church",
  }),
  textField({
    key: "event_date",
    label: "Event Date",
    required: true,
    placeholder: "e.g. 26 Aug 2026",
  }),
  textField({
    key: "start_time",
    label: "Start Time",
    required: true,
    placeholder: "e.g. 7:00 PM",
  }),
  textField({
    key: "venue",
    label: "Venue",
    required: true,
    placeholder: "e.g. Bunda campus hall",
  }),
  textField({
    key: "location",
    label: "Location",
    required: true,
    placeholder: "Town, campus, or venue area",
  }),
  selectField({
    key: "ticket_mode",
    label: "Ticket Mode",
    required: true,
    options: Array.from(EVENT_TICKET_MODE_OPTIONS),
  }),
  numberField({
    key: "ticket_price",
    label: "Ticket Price",
    advanced: true,
    placeholder: "0 for free events",
  }),
  textField({
    key: "ticket_link",
    label: "Ticket Link",
    advanced: true,
    placeholder: "Optional external ticket link",
  }),
  textareaField({
    key: "description",
    label: "Description",
    required: true,
    placeholder: "Short event summary",
  }),
  textField({
    key: "contact_whatsapp",
    label: "Contact WhatsApp",
    advanced: true,
    placeholder: "Include country code",
  }),
  textField({
    key: "poster_alt",
    label: "Poster Alt Text",
    advanced: true,
    placeholder: "Short poster description for accessibility",
  }),
];

function createEventListingConfig(params: {
  itemType: string;
  extraFields: ListingSpecField[];
  extraRequiredKeys?: string[];
  sectionTitle: string;
}): ListingItemConfig {
  const fields = [...BASE_EVENT_FIELDS, ...params.extraFields];
  const requiredKeys = [
    "event_title",
    "organizer_name",
    "event_date",
    "start_time",
    "venue",
    "location",
    "ticket_mode",
    "description",
    ...(params.extraRequiredKeys ?? []),
  ];

  return createEventConfig({
    itemType: params.itemType,
    fields,
    fieldGroups: [
      { title: "Event Basics", keys: ["event_title", "organizer_name", "event_date", "start_time"] },
      { title: "Venue & Access", keys: ["venue", "location", "ticket_mode", "ticket_price", "ticket_link"] },
      { title: params.sectionTitle, keys: params.extraFields.map((field) => field.key) },
      { title: "Extra Details", keys: ["description", "contact_whatsapp", "poster_alt"] },
    ].filter((group) => group.keys.length > 0) as ListingFieldGroup[],
    requiredKeys,
  });
}

export const CONCERT_EVENT_CONFIG = createEventListingConfig({
  itemType: "Concert",
  sectionTitle: "Concert Details",
  extraFields: [
    textField({
      key: "headliner",
      label: "Headliner",
      required: true,
      placeholder: "Main artist or act",
    }),
    textField({
      key: "supporting_acts",
      label: "Supporting Acts",
      advanced: true,
      placeholder: "Other performers on the bill",
    }),
    selectField({
      key: "music_genre",
      label: "Music Genre",
      advanced: true,
      options: ["Afrobeats", "Gospel", "Hip-Hop", "Amapiano", "Live Band", "Traditional", "Other"],
    }),
    selectField({
      key: "age_limit",
      label: "Age Limit",
      advanced: true,
      options: ["All Ages", "16+", "18+", "21+", "Other"],
    }),
  ],
  extraRequiredKeys: ["headliner"],
});

export const SPORTS_EVENT_CONFIG = createEventListingConfig({
  itemType: "Sports",
  sectionTitle: "Sports Details",
  extraFields: [
    selectField({
      key: "sport_type",
      label: "Sport Type",
      required: true,
      options: ["Football", "Basketball", "Netball", "Volleyball", "Athletics", "Rugby", "Tennis", "Other"],
    }),
    textField({
      key: "teams_or_competitors",
      label: "Teams / Competitors",
      required: true,
      placeholder: "Who is playing or competing?",
    }),
    selectField({
      key: "competition_format",
      label: "Competition Format",
      advanced: true,
      options: ["Friendly", "League", "Tournament", "Final", "Showcase", "Other"],
    }),
    textField({
      key: "prize_or_award",
      label: "Prize / Award",
      advanced: true,
      placeholder: "Optional prize or trophy information",
    }),
  ],
  extraRequiredKeys: ["sport_type", "teams_or_competitors"],
});

export const CONFERENCE_EVENT_CONFIG = createEventListingConfig({
  itemType: "Conference",
  sectionTitle: "Conference Details",
  extraFields: [
    textField({
      key: "theme",
      label: "Theme",
      required: true,
      placeholder: "Main conference theme",
    }),
    textField({
      key: "host_organization",
      label: "Host Organization",
      required: true,
      placeholder: "Who is hosting?",
    }),
    textField({
      key: "speaker_names",
      label: "Speaker Names",
      advanced: true,
      placeholder: "Optional speaker list",
    }),
    selectField({
      key: "delivery_mode",
      label: "Delivery Mode",
      required: true,
      options: Array.from(EVENT_DELIVERY_MODE_OPTIONS),
    }),
    textField({
      key: "registration_deadline",
      label: "Registration Deadline",
      advanced: true,
      placeholder: "e.g. 20 Aug 2026",
    }),
  ],
  extraRequiredKeys: ["theme", "host_organization", "delivery_mode"],
});

export const WORKSHOP_EVENT_CONFIG = createEventListingConfig({
  itemType: "Workshop",
  sectionTitle: "Workshop Details",
  extraFields: [
    textField({
      key: "skill_focus",
      label: "Skill Focus",
      required: true,
      placeholder: "e.g. design, coding, baking, photography",
    }),
    selectField({
      key: "level",
      label: "Level",
      required: true,
      options: ["Beginner", "Intermediate", "Advanced", "All Levels"],
    }),
    booleanField({
      key: "materials_provided",
      label: "Materials Provided",
      required: true,
    }),
    textField({
      key: "registration_deadline",
      label: "Registration Deadline",
      advanced: true,
      placeholder: "e.g. 20 Aug 2026",
    }),
  ],
  extraRequiredKeys: ["skill_focus", "level", "materials_provided"],
});

export const PARTY_EVENT_CONFIG = createEventListingConfig({
  itemType: "Party",
  sectionTitle: "Party Details",
  extraFields: [
    selectField({
      key: "party_type",
      label: "Party Type",
      required: true,
      options: ["Birthday", "Graduation", "Club Night", "Day Party", "House Party", "After Party", "Other"],
    }),
    textField({
      key: "dress_code",
      label: "Dress Code",
      advanced: true,
      placeholder: "Optional dress code",
    }),
    selectField({
      key: "age_limit",
      label: "Age Limit",
      advanced: true,
      options: ["All Ages", "16+", "18+", "21+"],
    }),
    textField({
      key: "dj_or_host",
      label: "DJ / Host",
      advanced: true,
      placeholder: "Optional DJ or host name",
    }),
  ],
  extraRequiredKeys: ["party_type"],
});

export const CHURCH_EVENT_CONFIG = createEventListingConfig({
  itemType: "Church Event",
  sectionTitle: "Church Event Details",
  extraFields: [
    textField({
      key: "ministry_name",
      label: "Ministry / Church Name",
      required: true,
      placeholder: "Church, ministry, or fellowship name",
    }),
    selectField({
      key: "service_type",
      label: "Service Type",
      required: true,
      options: ["Sunday Service", "Prayer Meeting", "Revival", "Crusade", "Worship Night", "Youth Fellowship", "Bible Study", "Other"],
    }),
    textField({
      key: "denomination",
      label: "Denomination",
      advanced: true,
      placeholder: "Optional denomination or fellowship",
    }),
    textField({
      key: "theme",
      label: "Theme",
      advanced: true,
      placeholder: "Optional sermon or event theme",
    }),
  ],
  extraRequiredKeys: ["ministry_name", "service_type"],
});

export const CAMPUS_EVENT_CONFIG = createEventListingConfig({
  itemType: "Campus Event",
  sectionTitle: "Campus Event Details",
  extraFields: [
    textField({
      key: "university_name",
      label: "University Name",
      required: true,
      placeholder: "Campus hosting the event",
    }),
    textField({
      key: "club_or_association",
      label: "Club / Association",
      required: true,
      placeholder: "Who is running it?",
    }),
    selectField({
      key: "event_format",
      label: "Event Format",
      required: true,
      options: ["Seminar", "Orientation", "Debate", "Talent Show", "Fundraiser", "Competition", "Social", "Other"],
    }),
    selectField({
      key: "audience",
      label: "Audience",
      advanced: true,
      options: ["Open to All", "Students Only", "Invited Guests", "Members Only"],
    }),
    textField({
      key: "department",
      label: "Department",
      advanced: true,
      placeholder: "Optional department or faculty",
    }),
  ],
  extraRequiredKeys: ["university_name", "club_or_association", "event_format"],
});

export const OTHER_EVENT_CONFIG = createEventListingConfig({
  itemType: "Other",
  sectionTitle: "Custom Event Details",
  extraFields: [
    textField({
      key: "event_focus",
      label: "Event Focus",
      required: true,
      placeholder: "Explain the event in one line",
    }),
    textField({
      key: "custom_notes",
      label: "Custom Notes",
      advanced: true,
      placeholder: "Anything specific users should know",
    }),
  ],
  extraRequiredKeys: ["event_focus"],
});

export const EVENT_ITEM_CONFIGS: ListingItemConfig[] = [
  CONCERT_EVENT_CONFIG,
  SPORTS_EVENT_CONFIG,
  CONFERENCE_EVENT_CONFIG,
  WORKSHOP_EVENT_CONFIG,
  PARTY_EVENT_CONFIG,
  CHURCH_EVENT_CONFIG,
  CAMPUS_EVENT_CONFIG,
  OTHER_EVENT_CONFIG,
];

export const EVENT_SCHEMAS: ListingItemSchema[] = EVENT_ITEM_CONFIGS.map((item) => item.schema);

export const EVENT_ITEM_CONFIG_REGISTRY: Record<string, Record<string, Record<string, ListingItemConfig>>> = {
  [EVENT_CATEGORY]: {
    [EVENT_SUBCATEGORY]: EVENT_ITEM_CONFIGS.reduce((acc, itemConfig) => {
      acc[itemConfig.schema.itemType] = itemConfig;
      return acc;
    }, {} as Record<string, ListingItemConfig>),
  },
};

export function getEventItemTypes(): string[] {
  return Object.keys(EVENT_ITEM_CONFIG_REGISTRY[EVENT_CATEGORY]?.[EVENT_SUBCATEGORY] ?? {});
}

export function getEventSchema(itemType?: string): ListingItemSchema | null {
  if (!itemType) return null;
  return EVENT_ITEM_CONFIG_REGISTRY[EVENT_CATEGORY]?.[EVENT_SUBCATEGORY]?.[itemType]?.schema ?? null;
}

export function getEventItemConfig(itemType?: string): ListingItemConfig | null {
  if (!itemType) return null;
  return EVENT_ITEM_CONFIG_REGISTRY[EVENT_CATEGORY]?.[EVENT_SUBCATEGORY]?.[itemType] ?? null;
}

export function getEventFieldGroups(itemType?: string): ListingFieldGroup[] {
  return getEventItemConfig(itemType)?.fieldGroups ?? [];
}

export function getEventRequiredKeys(itemType?: string): string[] {
  return getEventItemConfig(itemType)?.requiredKeys ?? [];
}

export function getBasicEventFields(itemType?: string): ListingSpecField[] {
  const schema = getEventSchema(itemType);
  if (!schema) return [];
  return schema.fields.filter((field) => !field.advanced);
}

export function getAdvancedEventFields(itemType?: string): ListingSpecField[] {
  const schema = getEventSchema(itemType);
  if (!schema) return [];
  return schema.fields.filter((field) => !!field.advanced);
}

export function getEventField(itemType?: string, fieldKey?: string): ListingSpecField | null {
  if (!itemType || !fieldKey) return null;
  const schema = getEventSchema(itemType);
  if (!schema) return null;
  return schema.fields.find((field) => field.key === fieldKey) ?? null;
}

export function hasEventSchema(itemType?: string): boolean {
  return !!getEventItemConfig(itemType);
}

export function createEmptyEventValues(itemType?: string): ListingSpecValues {
  const schema = getEventSchema(itemType);
  if (!schema) return {};
  return createEmptyEventSpecValues(schema.fields);
}

export function validateEventValues(
  itemType?: string,
  values: ListingSpecValues = {}
): ListingSpecValidationResult {
  const schema = getEventSchema(itemType);
  if (!schema) {
    return {
      isValid: false,
      errors: [
        {
          key: "schema",
          message: "No event schema found for the selected event type.",
        },
      ],
    };
  }

  return validateEventSpecValues(schema.fields, getEventRequiredKeys(itemType), values);
}
