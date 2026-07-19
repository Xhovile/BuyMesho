export type ListingCardSpec = {
  key: string;
  label: string;
  value: string;
};

export type ListingSpecValue = string | number | boolean | string[] | null | undefined;

export type ListingCardData = {
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

export type DisplayFieldProfile = Array<{
  key: string;
  label: string;
  valueKeys?: string[];
}>;

export function toTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toFiniteNumber(value: unknown): number | null {
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

export function buildSpecsFromProfile(listing: ListingCardData, profile: DisplayFieldProfile): ListingCardSpec[] {
  const values = listing.spec_values ?? {};
  const specs: ListingCardSpec[] = [];
  const seenValues = new Set<string>();

  for (const field of profile) {
    const keys = field.valueKeys ?? [field.key];
    let rawValue: ListingSpecValue | undefined;

    for (const key of keys) {
      const candidate = key === "item_type" ? listing.item_type : values[key];
      if (formatSpecValue(candidate)) {
        rawValue = candidate;
        break;
      }
    }

    const value = formatSpecValue(rawValue);
    if (!value) continue;

    const normalizedValue = normalizeComparableText(value);
    if (!normalizedValue || seenValues.has(normalizedValue)) continue;

    seenValues.add(normalizedValue);
    specs.push({ key: field.key, label: field.label, value });
  }

  return specs.slice(0, 3);
}
