import type { Listing } from "../types";
import type { AppRoute } from "../lib/appNavigation.paths";

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

export type RouteSEOConfig = SEOConfig & {
  /**
   * When true, a dedicated page owns SEO for this route (for example,
   * category pages and listing detail pages). The root router should not
   * overwrite that page-level metadata.
   */
  managedByPage?: boolean;
};

/**
 * Central route-level SEO registry. Public/indexable routes are explicit;
 * everything else defaults to noindex so private application surfaces do not
 * accidentally become searchable.
 */
export function getRouteSEO(pathname: string, route: AppRoute): RouteSEOConfig {
  const normalizedPathname =
    pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
  const normalizedStudioPath = normalizedPathname.toLowerCase();

  if (route === "listing_details") {
    return {
      title: DEFAULT_SEO.title,
      description: DEFAULT_SEO.description,
      canonicalPath: "/listing",
      noIndex: false,
      managedByPage: true,
    };
  }

  if (route === "category") {
    return {
      title: DEFAULT_SEO.title,
      description: DEFAULT_SEO.description,
      canonicalPath: normalizedPathname,
      noIndex: false,
      managedByPage: true,
    };
  }

  if (route === "listing_reviews") {
    return {
      title: "Listing Reviews — BuyMesho",
      description: "Read ratings and reviews for a BuyMesho marketplace listing.",
      canonicalPath: "/listing/reviews",
      noIndex: true,
    };
  }

  if (
    normalizedStudioPath === "/xhovilestudio" ||
    normalizedStudioPath === "/services/xhovilestudio"
  ) {
    return {
      title: "Xhovile Studio — Service Payment",
      description:
        "Submit a Graphic Design or Website Development request and continue to secure payment checkout.",
      canonicalPath: "/xhovilestudio",
      noIndex: true,
    };
  }

  if (
    normalizedStudioPath === "/xhovilestudio/receipt" ||
    normalizedStudioPath === "/services/xhovilestudio/receipt"
  ) {
    return {
      title: "Xhovile Studio — Payment Receipt",
      description: "View and download your Xhovile Studio payment receipt.",
      canonicalPath: "/xhovilestudio/receipt",
      noIndex: true,
    };
  }

  if (
    normalizedStudioPath === "/xhovilestudio/admin" ||
    normalizedStudioPath === "/services/xhovilestudio/admin"
  ) {
    return {
      title: "Xhovile Studio — Admin",
      description: "Xhovile Studio administration.",
      canonicalPath: "/xhovilestudio/admin",
      noIndex: true,
    };
  }

  switch (normalizedPathname) {
    case "/":
    case "/home":
      return {
        title: DEFAULT_SEO.title,
        description: DEFAULT_SEO.description,
        canonicalPath: "/",
        noIndex: false,
        keywords: [
          "BuyMesho",
          "Malawi e-commerce",
          "Malawi marketplace",
          "online shopping Malawi",
          "buy and sell Malawi",
          "Malawi sellers",
          "products Malawi",
          "services Malawi",
          "event tickets Malawi",
        ].join(", "),
      };
    case "/install":
      return {
        title: "Install BuyMesho",
        description:
          "Install BuyMesho on your phone for fast access to Malawi's secure e-commerce platform.",
        canonicalPath: "/install",
        noIndex: false,
      };
    case "/signup":
      return {
        title: "Create a BuyMesho Account",
        description: "Join BuyMesho to buy, sell, and manage your marketplace activity.",
        canonicalPath: "/signup",
        noIndex: false,
      };
    case "/about":
      return {
        title: "About BuyMesho — Malawi's Secure E-commerce Platform",
        description: "Learn what BuyMesho is, who it serves, and how the e-commerce platform works.",
        canonicalPath: "/about",
        noIndex: false,
      };
    case "/explore":
      return {
        title: "Explore BuyMesho Marketplace",
        description: "Browse listings, deals, sellers, events, and more on BuyMesho.",
        canonicalPath: "/explore",
        noIndex: false,
      };
    case "/explore/deals":
      return {
        title: "BuyMesho Deals",
        description: "Find current deals and value listings on BuyMesho.",
        canonicalPath: "/explore/deals",
        noIndex: false,
      };
    case "/explore/lay-by":
      return {
        title: "BuyMesho Lay-by",
        description: "Browse lay-by friendly listings on BuyMesho.",
        canonicalPath: "/explore/lay-by",
        noIndex: false,
      };
    case "/explore/events":
      return {
        title: "BuyMesho Events",
        description: "Discover public events and event listings on BuyMesho.",
        canonicalPath: "/explore/events",
        noIndex: false,
      };
    case "/tickets":
      return {
        title: "BuyMesho Tickets",
        description: "View your event tickets, download PDFs, and share passes on WhatsApp.",
        canonicalPath: "/tickets",
        noIndex: false,
      };
    case "/explore/wholesale":
      return {
        title: "BuyMesho Wholesale",
        description: "Browse wholesale listings and supplier options on BuyMesho.",
        canonicalPath: "/explore/wholesale",
        noIndex: false,
      };
    case "/explore/sellers":
      return {
        title: "BuyMesho Sellers",
        description: "Browse seller profiles on BuyMesho.",
        canonicalPath: "/explore/sellers",
        noIndex: false,
      };
    case "/explore/lending":
      return {
        title: "BuyMesho Lending",
        description: "Lending on BuyMesho is coming soon.",
        canonicalPath: "/explore/lending",
        noIndex: true,
      };
    case "/privacy":
      return {
        title: "BuyMesho Privacy Policy",
        description: "Read the BuyMesho privacy policy.",
        canonicalPath: "/privacy",
        noIndex: false,
      };
    case "/terms":
      return {
        title: "BuyMesho Terms of Service",
        description: "Read the BuyMesho terms of service.",
        canonicalPath: "/terms",
        noIndex: false,
      };
    case "/safety":
      return {
        title: "BuyMesho Safety Tips",
        description: "Read safety tips for using BuyMesho.",
        canonicalPath: "/safety",
        noIndex: false,
      };
    case "/transaction-json":
      return {
        title: "Transaction JSON — BuyMesho",
        description: "Deep-link JSON view for transaction debugging.",
        canonicalPath: "/transaction-json",
        noIndex: true,
      };
    default:
      return {
        title: "BuyMesho",
        description: "BuyMesho marketplace.",
        canonicalPath: normalizedPathname,
        noIndex: true,
      };
  }
}

export const DEFAULT_SEO = {
  title: "BuyMesho: Malawi's Secure E-commerce Platform",
  description:
    "BuyMesho is Malawi's secure e-commerce platform for discovering and buying products, services, and tickets from sellers across the country.",
  siteName: "BuyMesho",
  type: "website" as const,
  image: `${SITE_URL}/Og-image.webp`,
  imageAlt: "BuyMesho: Malawi's Secure E-commerce Platform",
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

  const keywords = config.keywords?.filter(Boolean).join(", ") || "";
  updateMetaTag("name", "keywords", keywords);

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
  } else {
    document.head.querySelector('meta[property="product:price:amount"]')?.remove();
    document.head.querySelector('meta[property="product:price:currency"]')?.remove();
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
  updateSEOMetaTags({
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    url: SITE_URL,
    type: DEFAULT_SEO.type,
    noIndex: false,
  });
}
