import {
  getAdvancedListingFields,
  getBasicListingFields,
  getListingSchema,
  type ListingSpecField,
} from "../listingSchemas";

export type ListingCardSpec = {
  key: string;
  label: string;
  value: string;
};

type ListingSpecValue = string | number | boolean | string[] | null | undefined;

type ListingCardData = {
  title?: string | null;
  name?: string | null;
  category?: string | null;
  subcategory?: string | null;
  item_type?: string | null;
  spec_values?: Record<string, ListingSpecValue> | null;
  condition?: string | null;
  quantity?: number | string | null;
  sold_quantity?: number | string | null;
};

const REDUNDANT_FIELD_KEY_PATTERNS = [
  /(^|_)(brand|make|manufacturer)(_|$)/i,
  /(^|_)(name|title)(_|$)/i,
  /(^|_)(product_name|item_name)(_|$)/i,
  /(^|_)(seller|vendor|store)(_|$)/i,
  /(^|_)(university|campus)(_|$)/i,
];

const CONDITION_FIELD_KEY_PATTERNS = [/condition|state|grade|quality/i];

const DECISION_FIELD_TYPES = new Set<ListingSpecField["type"]>([
  "select",
  "multiselect",
  "boolean",
  "text",
  "number",
]);

const HIGH_VALUE_FIELD_KEY_PATTERNS: Array<[RegExp, number]> = [
  [/ram|memory/i, 120],
  [/storage|internal_storage|disk|ssd|hdd/i, 120],
  [/processor|cpu|chip|soc|snapdragon|mediatek|exynos|intel|ryzen|core/i, 115],
  [/battery|mah|health/i, 110],
  [/screen|display|refresh|hz|inch/i, 105],
  [/color|size|fit|material|fabric|flavor|portion|type/i, 90],
  [/warranty|expiry|validity|delivery|duration|location/i, 85],
];

const ITEM_PRIORITY: Record<string, string[]> = {
  Smartphone: ["brand", "model", "ram", "storage", "network_type", "refresh_rate", "chipset", "screen_size", "battery_health_percentage", "body_condition"],
  Laptop: ["brand", "model", "processor", "ram", "storage_capacity", "storage_type", "screen_size", "refresh_rate", "body_condition", "display_condition"],
  Tablet: ["brand", "model", "storage", "ram", "screen_size", "network_type", "body_condition"],

  "One-on-One Tutoring": ["subject_areas", "study_level", "delivery_mode", "meeting_location", "availability", "session_length_minutes"],
  "Group Tutoring": ["subject_areas", "study_level", "delivery_mode", "meeting_location", "availability", "session_length_minutes", "max_group_size"],
  "Exam Revision Sessions": ["subject_areas", "study_level", "delivery_mode", "availability", "service_scope"],
  "Assignment Guidance": ["subject_areas", "study_level", "guidance_type", "delivery_mode", "availability", "service_scope"],
  "Study Coaching": ["coaching_focus", "study_level", "delivery_mode", "availability", "session_length_minutes"],

  "Hair Braiding": ["braiding_type", "service_location", "availability", "duration_estimate", "provider_experience", "hair_included"],
  "Barber Cuts": ["cut_type", "service_location", "availability", "duration_estimate", "provider_experience", "beard_service_available"],
  "Nail Services": ["nail_service_type", "service_location", "availability", "duration_estimate", "provider_experience", "designs_available"],
  "Makeup Services": ["makeup_service_type", "service_location", "availability", "duration_estimate", "provider_experience", "lashes_included"],
  "Facial & Skincare Services": ["facial_service_type", "service_location", "availability", "duration_estimate", "provider_experience", "products_included"],

  Cleansers: ["brand", "size_value", "size_unit", "skin_type", "cleanser_type", "product_condition", "expiry_or_best_before"],
  Moisturizers: ["brand", "size_value", "size_unit", "skin_type", "moisturizer_type", "product_condition", "expiry_or_best_before"],
  "Serums & Treatments": ["brand", "size_value", "size_unit", "skin_type", "treatment_type", "product_condition", "expiry_or_best_before"],
  Sunscreen: ["brand", "size_value", "size_unit", "skin_type", "product_condition", "expiry_or_best_before"],
};

function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeComparableText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim();
}

function formatSpecValue(value: ListingSpecValue): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") return toTrimmedString(value);
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (Array.isArray(value)) {
    const cleaned = value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
    return cleaned.length > 0 ? cleaned.join(", ") : null;
  }

  return null;
}

function getSchemaFields(listing: ListingCardData): ListingSpecField[] {
  if (!listing.category || !listing.subcategory || !listing.item_type) return [];

  const schema = getListingSchema(listing.category, listing.subcategory, listing.item_type);
  if (!schema) return [];

  const fields = [
    ...getBasicListingFields(listing.category, listing.subcategory, listing.item_type),
    ...getAdvancedListingFields(listing.category, listing.subcategory, listing.item_type),
  ];

  const seen = new Set<string>();
  return fields.filter((field) => {
    if (seen.has(field.key)) return false;
    seen.add(field.key);
    return true;
  });
}

function getFieldPriority(field: ListingSpecField, itemType?: string | null): number {
  const key = `${field.key} ${field.label}`;
  let score = field.advanced ? 0 : 20;

  if (field.required) score += 300;
  if (DECISION_FIELD_TYPES.has(field.type)) score += 60;

  for (const [pattern, weight] of HIGH_VALUE_FIELD_KEY_PATTERNS) {
    if (pattern.test(key)) score += weight;
  }

  if (itemType) {
    const keys = ITEM_PRIORITY[itemType] ?? [];
    const itemIndex = keys.indexOf(field.key);
    if (itemIndex >= 0) score += 400 - itemIndex * 10;
  }

  for (const pattern of REDUNDANT_FIELD_KEY_PATTERNS) {
    if (pattern.test(key)) score -= 100;
  }

  return score;
}

function isRedundantValue(value: string, title: string | null): boolean {
  if (!title) return false;

  const normalizedValue = normalizeComparableText(value);
  const normalizedTitle = normalizeComparableText(title);

  if (!normalizedValue || !normalizedTitle) return false;
  if (normalizedValue === normalizedTitle) return true;
  if (normalizedTitle.includes(normalizedValue)) return true;
  if (normalizedValue.includes(normalizedTitle)) return true;
  return false;
}

function collectPriorityKeys(listing: ListingCardData): string[] {
  const keys: string[] = [];
  const itemKeys = listing.item_type ? ITEM_PRIORITY[listing.item_type] ?? [] : [];

  for (const key of itemKeys) {
    if (!keys.includes(key)) keys.push(key);
  }

  return keys;
}

function collectListingCardSpecs(listing: ListingCardData, limit = 3): ListingCardSpec[] {
  const specValues = listing.spec_values ?? {};
  const title = listing.title ?? listing.name ?? null;
  const fields = getSchemaFields(listing)
    .slice()
    .sort((a, b) => getFieldPriority(b, listing.item_type) - getFieldPriority(a, listing.item_type));

  const specs: ListingCardSpec[] = [];
  const seenValues = new Set<string>();
  const priorityKeys = collectPriorityKeys(listing);

  const addField = (field: ListingSpecField) => {
    if (specs.length >= limit) return;
    if (!DECISION_FIELD_TYPES.has(field.type)) return;
    if (CONDITION_FIELD_KEY_PATTERNS.some((pattern) => pattern.test(field.key))) return;

    const value = formatSpecValue(specValues[field.key]);
    if (!value) return;

    const normalizedValue = normalizeComparableText(value);
    if (!normalizedValue) return;
    if (seenValues.has(normalizedValue)) return;
    if (isRedundantValue(value, title)) return;

    seenValues.add(normalizedValue);
    specs.push({ key: field.key, label: field.label, value });
  };

  for (const field of fields.filter((field) => field.required)) addField(field);
  for (const key of priorityKeys) {
    const field = fields.find((entry) => entry.key === key);
    if (field) addField(field);
  }
  for (const field of fields) addField(field);

  return specs;
}

export function getListingCardHighlights(listing: ListingCardData, limit = 3): string[] {
  return collectListingCardSpecs(listing, limit).map((spec) => spec.value);
}

export function getListingCardSpecs(listing: ListingCardData, limit = 3): ListingCardSpec[] {
  return collectListingCardSpecs(listing, limit);
}

export function getListingConditionLabel(condition?: string | null): string | null {
  const normalized = toTrimmedString(condition);
  if (!normalized) return null;
  return normalized[0].toUpperCase() + normalized.slice(1);
}

export function getListingAvailabilityLabel(
  quantity?: number | string | null,
  soldQuantity?: number | string | null,
): string | null {
  const safeQuantity = toFiniteNumber(quantity);
  if (safeQuantity === null) return null;

  const safeSoldQuantity = Math.max(0, toFiniteNumber(soldQuantity) ?? 0);
  const availableQuantity = Math.max(0, safeQuantity - safeSoldQuantity);

  if (availableQuantity <= 0) return "Sold out";
  return `${availableQuantity.toLocaleString()} left`;
}
