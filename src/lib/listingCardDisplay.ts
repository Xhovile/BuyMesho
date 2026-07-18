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

const CATEGORY_FIELD_PRIORITY: Record<string, Array<[RegExp, number]>> = {
  "Electronics & Gadgets": [
    [/ram|memory/i, 140],
    [/storage|internal_storage|ssd|hdd|disk/i, 135],
    [/processor|cpu|chip|soc|snapdragon|mediatek|exynos|intel|ryzen|core/i, 130],
    [/battery|mah|health/i, 125],
    [/screen|display|refresh|hz|inch/i, 120],
    [/condition|state|grade|quality/i, 110],
    [/color|warranty|model/i, 90],
  ],
  "Fashion & Clothing": [
    [/size|waist|length|fit/i, 140],
    [/color|colour/i, 135],
    [/material|fabric|cotton|denim|leather/i, 130],
    [/condition|state|grade|quality/i, 120],
    [/style|design|pattern/i, 100],
  ],
  "Food & Snacks": [
    [/portion|pack|quantity|size/i, 140],
    [/flavor|flavour|taste|type/i, 135],
    [/ingredients|contents|menu/i, 125],
    [/expiry|expires|freshness|date/i, 120],
    [/delivery|pickup|location/i, 100],
  ],
  "Academic Services": [
    [/service|type/i, 140],
    [/duration|time|deadline/i, 135],
    [/level|course|subject|topic/i, 130],
    [/delivery|online|onsite|location/i, 120],
    [/price|cost/i, 40],
  ],
  "Beauty & Personal Care": [
    [/service|treatment|style/i, 140],
    [/location|home service|salon/i, 135],
    [/duration|time/i, 130],
    [/availability|booking|appointment/i, 125],
    [/gender|for men|for women/i, 90],
  ],
};

const HIGH_VALUE_FIELD_KEY_PATTERNS: Array<[RegExp, number]> = [
  [/ram|memory/i, 120],
  [/storage|internal_storage|disk|ssd|hdd/i, 120],
  [/processor|cpu|chip|soc|snapdragon|mediatek|exynos|intel|ryzen|core/i, 115],
  [/battery|mah|health/i, 110],
  [/screen|display|refresh|hz|inch|size/i, 105],
  [/condition|state|grade|quality/i, 100],
  [/color|size|fit|material|fabric|flavor|portion|type/i, 90],
  [/warranty|expiry|validity|delivery|duration|location/i, 85],
];

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
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatSpecValue(value: ListingSpecValue): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return toTrimmedString(value);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : null;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

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
  if (!listing.category || !listing.subcategory || !listing.item_type) {
    return [];
  }

  const schema = getListingSchema(listing.category, listing.subcategory, listing.item_type);
  if (!schema) {
    return [];
  }

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

function getFieldPriority(field: ListingSpecField, category?: string | null): number {
  const key = `${field.key} ${field.label}`;
  let score = field.advanced ? 0 : 20;

  for (const [pattern, weight] of HIGH_VALUE_FIELD_KEY_PATTERNS) {
    if (pattern.test(key)) {
      score += weight;
    }
  }

  const categoryBoosts = category ? CATEGORY_FIELD_PRIORITY[category] ?? [] : [];
  for (const [pattern, weight] of categoryBoosts) {
    if (pattern.test(key)) {
      score += weight;
    }
  }

  for (const pattern of REDUNDANT_FIELD_KEY_PATTERNS) {
    if (pattern.test(key)) {
      score -= 100;
    }
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

export function getListingCardHighlights(listing: ListingCardData, limit = 3): string[] {
  const specValues = listing.spec_values ?? {};
  const title = listing.title ?? listing.name ?? null;
  const fields = getSchemaFields(listing)
    .slice()
    .sort((a, b) => getFieldPriority(b, listing.category) - getFieldPriority(a, listing.category));

  const highlights: string[] = [];
  const seenValues = new Set<string>();

  for (const field of fields) {
    const value = formatSpecValue(specValues[field.key]);
    if (!value) continue;

    const normalizedValue = normalizeComparableText(value);
    if (!normalizedValue) continue;
    if (seenValues.has(normalizedValue)) continue;
    if (isRedundantValue(value, title)) continue;

    seenValues.add(normalizedValue);
    highlights.push(value);

    if (highlights.length >= limit) {
      return highlights;
    }
  }

  return highlights;
}

export function getListingCardSpecs(listing: ListingCardData, limit = 3): ListingCardSpec[] {
  return getListingCardHighlights(listing, limit).map((value, index) => ({
    key: `highlight-${index}`,
    label: "",
    value,
  }));
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

  if (availableQuantity <= 0) {
    return "Sold out";
  }

  return `${availableQuantity.toLocaleString()} left`;
}
