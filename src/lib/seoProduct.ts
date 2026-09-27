export type ProductSchemaSellerType = "Person" | "Organization";

export type ProductSchemaInput = {
  name: string;
  description: string;
  url: string;
  image?: string | null;
  category?: string | null;
  condition?: string | null;
  price: number;
  currency: string;
  availability: "InStock" | "OutOfStock";
  sellerName?: string | null;
  sellerType?: ProductSchemaSellerType | null;
  areaServed?: string | null;
  brandName?: string | null;
};

export function getProductSchemaCondition(condition?: string | null) {
  const normalized = condition?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === "new" || normalized.includes("brand new")) return "https://schema.org/NewCondition";
  if (normalized.includes("like new")) return "https://schema.org/LikeNewCondition";
  if (normalized.includes("refurb")) return "https://schema.org/RefurbishedCondition";
  if (normalized.includes("open box") || normalized.includes("open-box")) return "https://schema.org/UsedCondition";
  if (normalized.includes("used")) return "https://schema.org/UsedCondition";
  return undefined;
}

export function buildProductJsonLd(input: ProductSchemaInput): Record<string, unknown> {
  const itemCondition = getProductSchemaCondition(input.condition);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": input.url + "#product",
    name: input.name,
    ...(input.image ? { image: [input.image] } : {}),
    description: input.description,
    ...(input.category ? { category: input.category } : {}),
    ...(itemCondition ? { itemCondition } : {}),
    ...(input.brandName
      ? {
          brand: {
            "@type": "Brand",
            name: input.brandName,
          },
        }
      : {}),
    mainEntityOfPage: input.url,
    offers: {
      "@type": "Offer",
      url: input.url,
      priceCurrency: input.currency,
      price: input.price,
      availability:
        input.availability === "OutOfStock"
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      ...(itemCondition ? { itemCondition } : {}),
      ...(input.sellerName
        ? {
            seller: {
              "@type": input.sellerType || "Organization",
              name: input.sellerName,
            },
          }
        : {}),
      ...(input.areaServed ? { areaServed: input.areaServed } : {}),
    },
  };
}
