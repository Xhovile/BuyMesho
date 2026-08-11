import type { Listing } from "../types";

export interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  imageAlt?: string;
  url?: string;
  type?: "website" | "product";
  keywords?: string[];
  noIndex?: boolean;
  price?: number;
  currency?: string;
  availability?: "InStock" | "OutOfStock";
  category?: string;
  sellerName?: string;
  campus?: string;
  condition?: string;
}

const SITE_URL = "https://buymesho.app";

export const DEFAULT_SEO = {
  title: "BuyMesho | Malawi's Secure Marketplace",
  description:
    "BuyMesho is Malawi's secure marketplace, helping student sellers reach more people while giving everyone a simple, trusted place to discover and buy products, services, and tickets.",
  siteName: "BuyMesho",
  type: "website" as const,
  image: `${SITE_URL}/Og-image.webp`,
  imageAlt: "BuyMesho — Malawi's Secure Marketplace",
  currency: "MWK",
};

function absoluteUrl(value: string): string {
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

function normalizeTitle(title?: string): string {
  if (!title) return DEFAULT_SEO.title;
  const cleaned = title.trim();
  if (!cleaned) return DEFAULT_SEO.title;
  if (cleaned === DEFAULT_SEO.title) return cleaned;
  if (cleaned.endsWith(` | ${DEFAULT_SEO.siteName}`)) return cleaned;
  return `${cleaned} | ${DEFAULT_SEO.siteName}`;
}

function updateMetaTag(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function updateLinkTag(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function updateJsonLdSchema(data: object | null) {
  const schemaId = "buymesho-jsonld-schema";
  let scriptTag = document.head.querySelector<HTMLScriptElement>(`script#${schemaId}`);

  if (!data) {
    scriptTag?.remove();
    return;
  }

  if (!scriptTag) {
    scriptTag = document.createElement("script");
    scriptTag.id = schemaId;
    scriptTag.type = "application/ld+json";
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(data);
}

/**
 * Update standard, Open Graph, Twitter/X and JSON-LD metadata.
 * This is intentionally browser-safe for the Vite SPA while index.html
 * provides the crawler-visible homepage defaults before JavaScript runs.
 */
export function updateSEOMetaTags(config: Partial<SEOConfig> = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const title = normalizeTitle(config.title);
  const description = config.description?.trim() || DEFAULT_SEO.description;
  const image = absoluteUrl(config.image || DEFAULT_SEO.image);
  const imageAlt = config.imageAlt?.trim() || DEFAULT_SEO.imageAlt;
  const url = absoluteUrl(config.url || window.location.pathname || "/");
  const type = config.type || DEFAULT_SEO.type;
  const robots = config.noIndex ? "noindex, nofollow" : "index, follow";

  document.title = title;
  updateMetaTag("name", "description", description);
  updateMetaTag("name", "robots", robots);
  updateMetaTag("name", "application-name", DEFAULT_SEO.siteName);

  updateLinkTag("canonical", url);

  updateMetaTag("property", "og:site_name", DEFAULT_SEO.siteName);
  updateMetaTag("property", "og:title", title);
  updateMetaTag("property", "og:description", description);
  updateMetaTag("property", "og:type", type);
  updateMetaTag("property", "og:url", url);
  updateMetaTag("property", "og:image", image);
  updateMetaTag("property", "og:image:alt", imageAlt);
  updateMetaTag("property", "og:locale", "en_MW");

  updateMetaTag("name", "twitter:card", "summary_large_image");
  updateMetaTag("name", "twitter:title", title);
  updateMetaTag("name", "twitter:description", description);
  updateMetaTag("name", "twitter:image", image);
  updateMetaTag("name", "twitter:image:alt", imageAlt);

  if (config.price !== undefined) {
    updateMetaTag("property", "product:price:amount", String(config.price));
    updateMetaTag("property", "product:price:currency", config.currency || DEFAULT_SEO.currency);
  }

  if (config.price !== undefined || config.category) {
    const itemCondition = config.condition
      ? config.condition.toLowerCase().includes("new")
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition"
      : undefined;

    const jsonLdProduct = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: config.title || DEFAULT_SEO.siteName,
      image: [image],
      description,
      ...(config.category ? { category: config.category } : {}),
      ...(itemCondition ? { itemCondition } : {}),
      brand: {
        "@type": "Brand",
        name: DEFAULT_SEO.siteName,
      },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: config.currency || DEFAULT_SEO.currency,
        price: config.price ?? 0,
        availability:
          config.availability === "OutOfStock"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        ...(itemCondition ? { itemCondition } : {}),
        ...(config.sellerName
          ? {
              seller: {
                "@type": "Person",
                name: config.sellerName,
              },
            }
          : {}),
        ...(config.campus ? { areaServed: `${config.campus}, Malawi` } : { areaServed: "Malawi" }),
      },
    };

    updateJsonLdSchema(jsonLdProduct);
  } else {
    updateJsonLdSchema(null);
  }
}

/**
 * Generate SEO metadata for a BuyMesho listing.
 */
export function getSEOForListing(listing: Listing, sellerName?: string): SEOConfig {
  const itemTitle = listing.name?.trim() || "Marketplace listing";
  const price = listing.price || 0;
  const formattedPrice = new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 0,
  }).format(price);
  const locationText = listing.university ? `at ${listing.university}` : "in Malawi";

  const descriptionSource = listing.description?.trim();
  const description = descriptionSource
    ? `${descriptionSource.slice(0, 155).trimEnd()}${descriptionSource.length > 155 ? "…" : ""} ${itemTitle} is listed for ${formattedPrice} ${locationText} on BuyMesho.`
    : `Discover ${itemTitle} for ${formattedPrice} ${locationText} on BuyMesho, Malawi's secure marketplace.`;

  const primaryImage = listing.photos?.[0] || DEFAULT_SEO.image;
  const currentUrl = typeof window !== "undefined"
    ? window.location.href
    : `${SITE_URL}/listing/${listing.id}`;

  return {
    title: `${itemTitle} - ${formattedPrice}`,
    description,
    image: primaryImage,
    imageAlt: `${itemTitle} on BuyMesho`,
    url: currentUrl,
    type: "product",
    price,
    currency: DEFAULT_SEO.currency,
    category: listing.category,
    campus: listing.university,
    condition: listing.condition,
    sellerName: sellerName || listing.business_name || "BuyMesho seller",
    availability: listing.status === "sold" ? "OutOfStock" : "InStock",
    keywords: [itemTitle, listing.category, listing.university, "BuyMesho", "Malawi marketplace"].filter(Boolean) as string[],
  };
}

export function resetSEOMetaTags() {
  updateSEOMetaTags({});
}
