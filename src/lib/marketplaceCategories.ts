export const MARKETPLACE_CATEGORIES = [
  {
    slug: "food-snacks",
    name: "Food & Snacks",
    legacySlugs: ["food"],
  },
  {
    slug: "fashion-clothing",
    name: "Fashion & Clothing",
    legacySlugs: ["fashion"],
  },
  {
    slug: "academic-services",
    name: "Academic Services",
    legacySlugs: ["books", "services"],
  },
  {
    slug: "electronics-gadgets",
    name: "Electronics & Gadgets",
    legacySlugs: ["phones"],
  },
  {
    slug: "beauty-personal-care",
    name: "Beauty & Personal Care",
    legacySlugs: ["beauty"],
  },
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];
export type MarketplaceCategorySlug = MarketplaceCategory["slug"];

export const MARKETPLACE_CATEGORY_SLUGS = MARKETPLACE_CATEGORIES.map(
  (category) => category.slug,
) as MarketplaceCategorySlug[];

const CATEGORY_ALIASES = new Map<string, MarketplaceCategorySlug>();

for (const category of MARKETPLACE_CATEGORIES) {
  CATEGORY_ALIASES.set(category.slug, category.slug);
  for (const legacySlug of category.legacySlugs) {
    CATEGORY_ALIASES.set(legacySlug, category.slug);
  }
}

export function resolveMarketplaceCategory(
  value: string | null | undefined,
): MarketplaceCategory | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  const slug = CATEGORY_ALIASES.get(normalized);
  return (
    MARKETPLACE_CATEGORIES.find((category) => category.slug === slug) ?? null
  );
}

export function isMarketplaceCategorySlug(
  value: string | null | undefined,
): value is MarketplaceCategorySlug {
  const normalized = value?.trim().toLowerCase();
  return !!normalized && MARKETPLACE_CATEGORY_SLUGS.includes(normalized as MarketplaceCategorySlug);
}

export function getMarketplaceCategorySlug(
  value: string | null | undefined,
): MarketplaceCategorySlug | null {
  return resolveMarketplaceCategory(value)?.slug ?? null;
}
