import type { ListingItemConfig, ListingSpecField } from "../core";
import {
  SERVICE_AVAILABILITY_OPTIONS,
  SERVICE_DURATION_OPTIONS,
  SERVICE_LOCATION_OPTIONS,
  booleanField,
  createBeautyConfig,
  numberField,
  selectField,
  textField,
  textareaField,
} from "./shared";

function createBeautyServiceConfig(params: {
  itemType: string;
  styleFields?: ListingSpecField[];
  bookingFields?: ListingSpecField[];
  requiredKeys?: string[];
}): ListingItemConfig {
  const identityFields: ListingSpecField[] = [
    textField({
      key: "provider_experience",
      label: "Experience",
      required: true,
      placeholder: "e.g. 2 years, 6 months, beginner with portfolio",
    }),
    selectField({
      key: "service_location",
      label: "Service Location",
      required: true,
      options: SERVICE_LOCATION_OPTIONS,
    }),
    selectField({
      key: "availability",
      label: "Availability",
      required: true,
      options: SERVICE_AVAILABILITY_OPTIONS,
    }),
    selectField({
      key: "duration_estimate",
      label: "Duration Estimate",
      required: true,
      options: SERVICE_DURATION_OPTIONS,
    }),
  ];

  const styleFields: ListingSpecField[] = [
    ...(params.styleFields || []),
    booleanField({
      key: "materials_included",
      label: "Materials Included",
      advanced: true,
    }),
    booleanField({
      key: "portfolio_available",
      label: "Portfolio Available",
      advanced: true,
    }),
  ];

  const bookingFields: ListingSpecField[] = [
    textField({
      key: "booking_notice",
      label: "Booking Notice",
      required: true,
      placeholder: "e.g. Same day, 24 hours before",
    }),
    booleanField({
      key: "deposit_required",
      label: "Deposit Required",
      advanced: true,
    }),
    booleanField({
      key: "home_service_available",
      label: "Home Service Available",
      advanced: true,
    }),
    numberField({
      key: "travel_fee_amount",
      label: "Travel Fee Amount",
      advanced: true,
      placeholder: "e.g. 2000",
    }),
    ...(params.bookingFields || []),
  ];

  const noteFields: ListingSpecField[] = [
    textareaField({
      key: "aftercare_or_client_notes",
      label: "Aftercare / Client Notes",
      advanced: true,
      placeholder: "E.g. come with clean hair, aftercare tips, what to bring",
    }),
  ];

  return createBeautyConfig({
    subcategory: "Salon & Barber Services",
    itemType: params.itemType,
    fields: [
      ...identityFields,
      ...styleFields,
      ...bookingFields,
      ...noteFields,
    ],
    fieldGroups: [
      { title: "Service Identity", keys: identityFields.map((f) => f.key) },
      { title: "Service Details", keys: styleFields.map((f) => f.key) },
      { title: "Booking & Logistics", keys: bookingFields.map((f) => f.key) },
      { title: "Extra Notes", keys: noteFields.map((f) => f.key) },
    ],
    requiredKeys: [
      "provider_experience",
      "service_location",
      "availability",
      "duration_estimate",
      "booking_notice",
      ...(params.requiredKeys || []),
    ],
  });
}

export const HAIR_BRAIDING_CONFIG = createBeautyServiceConfig({
  itemType: "Hair Braiding",
  styleFields: [
    selectField({
      key: "braiding_type",
      label: "Braiding Type",
      required: true,
      options: ["Box Braids", "Cornrows", "Knotless", "Twists", "Fulani", "Custom", "Other"],
    }),
    booleanField({
      key: "hair_included",
      label: "Hair Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["braiding_type"],
});

export const BARBER_CUTS_CONFIG = createBeautyServiceConfig({
  itemType: "Barber Cuts",
  styleFields: [
    selectField({
      key: "cut_type",
      label: "Cut Type",
      required: true,
      options: ["Fade", "Low Cut", "Beard Grooming", "Kids Cut", "Line-Up", "Custom", "Other"],
    }),
    booleanField({
      key: "beard_service_available",
      label: "Beard Service Available",
      advanced: true,
    }),
  ],
  requiredKeys: ["cut_type"],
});

export const NAIL_SERVICES_CONFIG = createBeautyServiceConfig({
  itemType: "Nail Services",
  styleFields: [
    selectField({
      key: "nail_service_type",
      label: "Nail Service Type",
      required: true,
      options: ["Manicure", "Pedicure", "Gel Polish", "Acrylics", "Nail Art", "Other"],
    }),
    booleanField({
      key: "designs_available",
      label: "Designs Available",
      advanced: true,
    }),
  ],
  requiredKeys: ["nail_service_type"],
});

export const MAKEUP_SERVICES_CONFIG = createBeautyServiceConfig({
  itemType: "Makeup Services",
  styleFields: [
    selectField({
      key: "makeup_service_type",
      label: "Makeup Service Type",
      required: true,
      options: ["Soft Glam", "Full Glam", "Bridal", "Photoshoot", "Event Makeup", "Other"],
    }),
    booleanField({
      key: "lashes_included",
      label: "Lashes Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["makeup_service_type"],
});

export const FACIAL_SKINCARE_SERVICES_CONFIG = createBeautyServiceConfig({
  itemType: "Facial & Skincare Services",
  styleFields: [
    selectField({
      key: "facial_service_type",
      label: "Facial Service Type",
      required: true,
      options: ["Basic Facial", "Deep Cleanse", "Exfoliation", "Acne Care", "Brightening", "Other"],
    }),
    booleanField({
      key: "products_included",
      label: "Products Included",
      advanced: true,
    }),
  ],
  requiredKeys: ["facial_service_type"],
});

export const BEAUTY_SERVICES_LISTING_ITEM_CONFIGS: ListingItemConfig[] = [
  HAIR_BRAIDING_CONFIG,
  BARBER_CUTS_CONFIG,
  NAIL_SERVICES_CONFIG,
  MAKEUP_SERVICES_CONFIG,
  FACIAL_SKINCARE_SERVICES_CONFIG,
];
