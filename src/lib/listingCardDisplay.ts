import { getAdvancedListingFields, getBasicListingFields, getListingSchema, type ListingSpecField } from "../listingSchemas";

export type ListingCardSpec = {
  key: string;
  label: string;
  value: string;
};

type ListingSpecValue = string | number | boolean | string[] | null | undefined;

type ListingCardData = {
  category?: string | null;
  subcategory?: string | null;
  item_type?: string | null;
  spec_values?: Record<string, ListingSpecValue> | null;
  condition?: string | null;
  quantity?: number | string | null;
  sold_quantity?: number | string | null;
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

export function getListingCardSpecs(listing: ListingCardData, limit = 3): ListingCardSpec[] {
  const specValues = listing.spec_values ?? {};
  const fields = getSchemaFields(listing);
  const specs: ListingCardSpec[] = [];

  for (const field of fields) {
    const value = formatSpecValue(specValues[field.key]);
    if (!value) continue;

    specs.push({
      key: field.key,
      label: field.label,
      value,
    });

    if (specs.length >= limit) {
      return specs;
    }
  }

  if (specs.length > 0) {
    return specs;
  }

  if (listing.item_type) {
    specs.push({
      key: "item_type",
      label: "Type",
      value: listing.item_type,
    });
  }

  return specs.slice(0, limit);
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
