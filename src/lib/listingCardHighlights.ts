import { getAdvancedListingFields, getBasicListingFields, getListingSchema, type ListingSpecField } from "../listingSchemas";

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

const CONDITION_KEY_PATTERN = /(^|_)(condition|state|grade|quality)(_|$)/i;
const REDUNDANT_KEY_PATTERNS = [/^name$/i, /(^|_)(name|title)(_|$)/i, /(^|_)(seller|vendor|store)(_|$)/i];

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

function makeSpec(key: string, label: string, value: ListingSpecValue): ListingCardSpec | null {
  const formatted = formatSpecValue(value);
  if (!formatted) return null;
  return { key, label, value: formatted };
}

function isRedundantValue(value: string, title: string | null): boolean {
  if (!title) return false;
  const normalizedValue = normalizeComparableText(value);
  const normalizedTitle = normalizeComparableText(title);
  if (!normalizedValue || !normalizedTitle) return false;
  return (
    normalizedValue === normalizedTitle ||
    normalizedTitle.includes(normalizedValue) ||
    normalizedValue.includes(normalizedTitle)
  );
}

function getListingTitle(listing: ListingCardData): string | null {
  return listing.title ?? listing.name ?? null;
}

function getSpecValues(listing: ListingCardData): Record<string, ListingSpecValue> {
  return listing.spec_values ?? {};
}

function getFieldFromSpecValues(
  listing: ListingCardData,
  key: string,
  label: string,
): ListingCardSpec | null {
  return makeSpec(key, label, getSpecValues(listing)[key]);
}

function getExplicitCardSpecs(listing: ListingCardData, limit: number): ListingCardSpec[] | null {
  const title = getListingTitle(listing);
  const specs: ListingCardSpec[] = [];
  const push = (spec: ListingCardSpec | null) => {
    if (!spec || specs.length >= limit) return;
    const normalizedValue = normalizeComparableText(spec.value);
    if (!normalizedValue) return;
    if (isRedundantValue(spec.value, title)) return;
    if (specs.some((entry) => normalizeComparableText(entry.value) === normalizedValue)) return;
    specs.push(spec);
  };

  const subcategorySpec = listing.subcategory ? { key: "subcategory", label: "Subcategory", value: listing.subcategory } : null;

  if (listing.subcategory === "Computers" || listing.item_type === "Laptop") {
    push(getFieldFromSpecValues(listing, "brand", "Brand"));
    push(getFieldFromSpecValues(listing, "ram", "RAM"));
    push(getFieldFromSpecValues(listing, "operating_system", "Operating System"));
    return specs.length > 0 ? specs : null;
  }

  if (listing.subcategory === "Phones & Mobile Devices" || listing.item_type === "Smartphone") {
    push(getFieldFromSpecValues(listing, "ram", "RAM"));
    push(getFieldFromSpecValues(listing, "sim_type", "SIM Type"));
    push(getFieldFromSpecValues(listing, "brand", "Brand"));
    return specs.length > 0 ? specs : null;
  }

  if (listing.category === "Food & Snacks") {
    const values = getSpecValues(listing);
    push(subcategorySpec);

    const cookingMethod = makeSpec("cooking_method", "Cooking Method", values.cooking_method);
    const productTypeCandidates: Array<[string, string]> = [
      ["product_type", "Product Type"],
      ["fast_food_type", "Product Type"],
      ["breakfast_type", "Product Type"],
      ["traditional_meal_type", "Product Type"],
      ["snack_type", "Product Type"],
      ["sweet_type", "Product Type"],
      ["nut_mix_type", "Product Type"],
      ["pantry_type", "Product Type"],
      ["oil_type", "Product Type"],
      ["staple_type", "Product Type"],
      ["spice_type", "Product Type"],
    ];

    push(cookingMethod);
    for (const [key, label] of productTypeCandidates) {
      const spec = makeSpec(key, label, values[key]);
      if (spec) {
        push(spec);
        break;
      }
    }

    return specs.length > 0 ? specs : null;
  }

  if (listing.subcategory === "Power & Internet") {
    const values = getSpecValues(listing);

    if (listing.item_type === "Power Bank") {
      push(makeSpec("capacity", "Power Output", values.capacity));
      push(makeSpec("compatible_with", "Network Support", values.compatible_with));
      push(makeSpec("input_port_type", "Charger Type", values.input_port_type));
      return specs.length > 0 ? specs : null;
    }

    if (listing.item_type === "Charger / Charging Adapter") {
      push(makeSpec("charger_type", "Charger Type", values.charger_type));
      push(makeSpec("brand", "Brand", values.brand));
      push(makeSpec("model", "Model", values.model));
      return specs.length > 0 ? specs : null;
    }
  }

  return null;
}

function getGenericCardSpecs(listing: ListingCardData, limit: number): ListingCardSpec[] {
  const specValues = getSpecValues(listing);
  const title = getListingTitle(listing);
  const schemaFields = listing.category && listing.subcategory && listing.item_type
    ? [
        ...getBasicListingFields(listing.category, listing.subcategory, listing.item_type),
        ...getAdvancedListingFields(listing.category, listing.subcategory, listing.item_type),
      ]
    : [];

  const fields: ListingSpecField[] = [];
  const seenKeys = new Set<string>();
  for (const field of schemaFields) {
    if (!seenKeys.has(field.key)) {
      seenKeys.add(field.key);
      fields.push(field);
    }
  }

  const specs: ListingCardSpec[] = [];
  const seenValues = new Set<string>();

  for (const field of fields) {
    if (specs.length >= limit) break;
    if (CONDITION_KEY_PATTERN.test(field.key)) continue;
    if (REDUNDANT_KEY_PATTERNS.some((pattern) => pattern.test(field.key))) continue;

    const spec = makeSpec(field.key, field.label, specValues[field.key]);
    if (!spec) continue;

    const normalizedValue = normalizeComparableText(spec.value);
    if (!normalizedValue) continue;
    if (seenValues.has(normalizedValue)) continue;
    if (isRedundantValue(spec.value, title)) continue;

    seenValues.add(normalizedValue);
    specs.push(spec);
  }

  return specs;
}

function collectListingCardSpecs(listing: ListingCardData, limit = 3): ListingCardSpec[] {
  const explicit = getExplicitCardSpecs(listing, limit);
  if (explicit && explicit.length > 0) {
    return explicit.slice(0, limit);
  }
  return getGenericCardSpecs(listing, limit);
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
