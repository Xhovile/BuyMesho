import type { Listing } from "../types";

export interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
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

const DEFAULT_SEO = {
  title: "BuyMesho | Campus Marketplace in Malawi",
  description:
    "BuyMesho is Malawi's premier student-to-student and public campus marketplace. Buy and sell smartphones, textbooks, fashion, electronics, and tickets securely with Escrow protection.",
  siteName: "BuyMesho",
  type: "website",
  image: "https://buymesho.com/og-image.jpg",
  currency: "MWK",
};

/**
 * Helper to update or create a meta tag by property or name selector
 */
function updateMetaTag(selector: string, content: string, attributeName: "name" | "property") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${selector}]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, selector.replace(/^meta\[(?:name|property)="|"\]$/g, "").replace(/.*="/, "").replace('"]', ''));
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

/**
 * Helper to set or create a link tag (e.g. canonical)
 */
function updateLinkTag(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

/**
 * Inject or update JSON-LD Structured Data for Product indexing
 */
function updateJsonLdSchema(data: object | null) {
  const SCHEMA_ID = "buymesho-jsonld-schema";
  let scriptTag = document.head.querySelector<HTMLScriptElement>(`script#${SCHEMA_ID}`);

  if (!data) {
    if (scriptTag) scriptTag.remove();
    return;
  }

  if (!scriptTag) {
    scriptTag = document.createElement("script");
    scriptTag.id = SCHEMA_ID;
    scriptTag.type = "application/ld+json";
    document.head.appendChild(scriptTag);
  }

  scriptTag.textContent = JSON.stringify(data);
}

/**
 * Main SEO injection function for general pages and product/listing pages
 */
export function updateSEOMetaTags(config: Partial<SEOConfig>) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const title = config.title ? `${config.title} | ${DEFAULT_SEO.siteName}` : DEFAULT_SEO.title;
  const description = config.description || DEFAULT_SEO.description;
  const image = config.image || DEFAULT_SEO.image;
  const url = config.url || window.location.href;
  const type = config.type || DEFAULT_SEO.type;
  const keywords = config.keywords?.length
    ? config.keywords.join(", ")
    : "BuyMesho, campus marketplace, Malawi, student deals, buy and sell, MWK, university marketplace";

  // 1. Title & Standard Meta Tags
  document.title = title;
  updateMetaTag('name="description"', description, "name");
  updateMetaTag('name="keywords"', keywords, "name");
  updateMetaTag('name="robots"', config.noIndex ? "noindex, nofollow" : "index, follow", "name");

  // 2. Canonical Link
  updateLinkTag("canonical", url);

  // 3. Open Graph / Facebook Meta
  updateMetaTag('property="og:site_name"', DEFAULT_SEO.siteName, "property");
  updateMetaTag('property="og:title"', title, "property");
  updateMetaTag('property="og:description"', description, "property");
  updateMetaTag('property="og:image"', image, "property");
  updateMetaTag('property="og:url"', url, "property");
  updateMetaTag('property="og:type"', type, "property");

  if (config.price !== undefined) {
    updateMetaTag('property="og:price:amount"', config.price.toString(), "property");
    updateMetaTag('property="og:price:currency"', config.currency || DEFAULT_SEO.currency, "property");
  }

  // 4. Twitter Cards
  updateMetaTag('name="twitter:card"', image ? "summary_large_image" : "summary", "name");
  updateMetaTag('name="twitter:title"', title, "name");
  updateMetaTag('name="twitter:description"', description, "name");
  updateMetaTag('name="twitter:image"', image, "name");

  // 5. Product JSON-LD Structured Data Schema.org
  if (config.price !== undefined || config.category) {
    const jsonLdProduct = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: config.title || DEFAULT_SEO.title,
      image: [image],
      description: description,
      category: config.category || "General Marketplace",
      itemCondition: config.condition
        ? `https://schema.org/${config.condition.toLowerCase().includes("new") ? "NewCondition" : "UsedCondition"}`
        : "https://schema.org/UsedCondition",
      brand: {
        "@type": "Brand",
        name: "BuyMesho Campus Marketplace",
      },
      offers: {
        "@type": "Offer",
        url: url,
        priceCurrency: config.currency || DEFAULT_SEO.currency,
        price: config.price || 0,
        priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        itemCondition: config.condition
          ? `https://schema.org/${config.condition.toLowerCase().includes("new") ? "NewCondition" : "UsedCondition"}`
          : "https://schema.org/UsedCondition",
        availability: config.availability === "OutOfStock" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
        seller: {
          "@type": "Person",
          name: config.sellerName || "BuyMesho Seller",
        },
        areaServed: config.campus ? `${config.campus}, Malawi` : "Malawi Universities",
      },
    };

    updateJsonLdSchema(jsonLdProduct);
  } else {
    updateJsonLdSchema(null);
  }
}

/**
 * Generate SEO metadata specifically tailored for a BuyMesho product/listing object
 */
export function getSEOForListing(listing: Listing, sellerName?: string): SEOConfig {
  const itemTitle = listing.name || "Campus Item";
  const formattedPrice = new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency: "MWK",
    maximumFractionDigits: 0,
  }).format(listing.price || 0);

  const title = `${itemTitle} - ${formattedPrice} | BuyMesho`;
  const locationText = listing.university ? `at ${listing.university}` : "in Malawi";
  const cleanDescription = (listing.description || "")
    ? `${listing.description.slice(0, 150)}... Buy ${itemTitle} for ${formattedPrice} ${locationText} on BuyMesho.`
    : `Buy ${itemTitle} for ${formattedPrice} ${locationText} on BuyMesho. Verified campus marketplace with Escrow protection.`;

  const primaryImage =
    listing.photos && listing.photos.length > 0
      ? listing.photos[0]
      : DEFAULT_SEO.image;

  const currentUrl = typeof window !== "undefined" ? window.location.href : `https://buymesho.com/listing/${listing.id}`;

  return {
    title,
    description: cleanDescription,
    image: primaryImage,
    url: currentUrl,
    type: "product",
    price: listing.price,
    currency: "MWK",
    category: listing.category,
    campus: listing.university,
    condition: listing.condition,
    sellerName: sellerName || listing.business_name || "Campus Seller",
    availability: listing.status === "sold" ? "OutOfStock" : "InStock",
    keywords: [
      itemTitle,
      listing.category,
      listing.university || "Malawi Campus",
      "BuyMesho",
      "Buy and Sell Malawi",
      "Student Marketplace",
      formattedPrice,
    ].filter(Boolean) as string[],
  };
}

/**
 * Reset SEO tags back to default BuyMesho branding
 */
export function resetSEOMetaTags() {
  updateSEOMetaTags({});
}
