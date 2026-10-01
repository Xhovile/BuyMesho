
import type { Request } from "express";
import { DEFAULT_SEO, getRouteSEO, truncateSeoDescription } from "../../src/lib/seo.js";
import { getEventAttendanceMode } from "../../src/lib/seoEvent.js";
import { buildProductJsonLd, isListingOutOfStock } from "../../src/lib/seoProduct.js";
import { resolveMarketplaceCategory, type MarketplaceCategorySlug } from "../../src/lib/marketplaceCategories.js";

const SITE_URL = "https://buymesho.app";
const MAX_SEO_LISTINGS = 12;

export type SeoRenderResult = {
  title: string;
  description: string;
  canonicalUrl: string;
  noIndex: boolean;
  image?: string;
  imageAlt?: string;
  type?: "website" | "product";
  jsonLd?: Record<string, unknown>;
  body: string;
};

type ListingRow = {
  id: number;
  name: string;
  price: number | string;
  description?: string | null;
  category?: string | null;
  university?: string | null;
  condition?: string | null;
  status?: string | null;
  quantity?: number | string | null;
  sold_quantity?: number | string | null;
  photos?: unknown;
  seller_uid?: string | null;
  business_name?: string | null;
};

type SellerRow = {
  uid: string;
  business_name?: string | null;
  business_logo?: string | null;
  university?: string | null;
  bio?: string | null;
};

type EventRow = {
  id: number;
  event_title: string;
  event_type: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_price?: number | string | null;
  status?: string | null;
  description?: string | null;
  poster_alt?: string | null;
  spec_values?: unknown;
};

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function absoluteUrl(value: string): string {
  try {
    return new URL(value, SITE_URL).toString();
  } catch {
    return SITE_URL;
  }
}

function normalizeTitle(title: string): string {
  const clean = title.trim() || DEFAULT_SEO.title;
  if (clean === DEFAULT_SEO.title || clean.endsWith(" | " + DEFAULT_SEO.siteName)) return clean;
  return clean + " | " + DEFAULT_SEO.siteName;
}

function formatMoney(value: number | string | null | undefined): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "MK 0";
  return "MK " + numeric.toLocaleString("en-MW", { maximumFractionDigits: 0 });
}

function parsePhotos(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
      : [];
  } catch {
    return [];
  }
}

function parseSpecValues(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function link(href: string, label: string): string {
  return '<a href="' + esc(href) + '">' + esc(label) + "</a>";
}

function bodyFrame(
  title: string,
  eyebrow: string,
  description: string,
  links: Array<{ href: string; label: string }>,
  sections: string[] = [],
): string {
  const nav = links.map((item) => link(item.href, item.label)).join(" · ");
  return [
    '<div style="max-width:1100px;margin:0 auto;padding:32px 20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#18181b">',
    '<header style="border-bottom:1px solid #e4e4e7;padding-bottom:20px">',
    '<p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#71717a">' + esc(eyebrow) + "</p>",
    '<h1 style="margin:0;font-size:clamp(34px,6vw,64px);line-height:.95;letter-spacing:-.05em">' + esc(title) + "</h1>",
    '<p style="max-width:760px;margin:16px 0 0;color:#52525b;font-size:17px;line-height:1.65">' + esc(description) + "</p>",
    "</header>",
    sections.join(""),
    '<nav aria-label="BuyMesho public pages" style="margin-top:34px;padding-top:20px;border-top:1px solid #e4e4e7;color:#52525b;font-size:14px;line-height:2">',
    nav,
    "</nav>",
    "</div>",
  ].join("");
}

function buildHead(result: SeoRenderResult): string {
  const title = normalizeTitle(result.title);
  const description = result.description.trim() || DEFAULT_SEO.description;
  const canonical = absoluteUrl(result.canonicalUrl);
  const image = absoluteUrl(result.image || DEFAULT_SEO.image);
  const imageAlt = result.imageAlt?.trim() || DEFAULT_SEO.imageAlt;
  const robots = result.noIndex ? "noindex, nofollow" : "index, follow";
  const type = result.type || "website";

  return [
    "<title>" + esc(title) + "</title>",
    '<meta name="description" content="' + esc(description) + '">',
    '<meta name="robots" content="' + esc(robots) + '">',
    '<meta name="application-name" content="BuyMesho">',
    '<link rel="canonical" href="' + esc(canonical) + '">',
    '<meta property="og:site_name" content="BuyMesho">',
    '<meta property="og:title" content="' + esc(title) + '">',
    '<meta property="og:description" content="' + esc(description) + '">',
    '<meta property="og:type" content="' + esc(type) + '">',
    '<meta property="og:url" content="' + esc(canonical) + '">',
    '<meta property="og:image" content="' + esc(image) + '">',
    '<meta property="og:image:alt" content="' + esc(imageAlt) + '">',
    '<meta property="og:locale" content="en_MW">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(title) + '">',
    '<meta name="twitter:description" content="' + esc(description) + '">',
    '<meta name="twitter:image" content="' + esc(image) + '">',
    '<meta name="twitter:image:alt" content="' + esc(imageAlt) + '">',
    result.jsonLd
      ? '<script type="application/ld+json" id="server-seo-schema">' + safeJson(result.jsonLd) + "</script>"
      : "",
  ].join("\n");
}

const CATEGORY_SEO_CONTENT: Record<MarketplaceCategorySlug, { intro: string; items: string[]; buyingGuide: string[] }> = {
  "food-snacks": {
    intro: "Explore meals, snacks, drinks, bakery items, and pantry essentials listed by sellers on BuyMesho in Malawi.",
    items: ["Meals and prepared food", "Snacks and confectionery", "Drinks and beverages", "Bakery items", "Pantry and grocery essentials"],
    buyingGuide: ["Compare the listing price and available quantity.", "Open a listing to review its seller and full product details.", "Contact the seller or continue through BuyMesho checkout when available."],
  },
  "fashion-clothing": {
    intro: "Explore clothing, shoes, bags, accessories, thrift finds, and everyday fashion from BuyMesho sellers in Malawi.",
    items: ["Clothing and campus wear", "Shoes and footwear", "Bags and accessories", "Thrift and pre-owned fashion", "Everyday style essentials"],
    buyingGuide: ["Check the item description, condition, and sizing information.", "Open the listing to compare the seller's details and price.", "Use BuyMesho checkout or seller contact options to complete the purchase."],
  },
  "academic-services": {
    intro: "Explore study materials, stationery, printing, academic support, books, and other student-focused services available through BuyMesho in Malawi.",
    items: ["Books and study materials", "Stationery and school supplies", "Printing and document services", "Academic support services", "Calculators and study tools"],
    buyingGuide: ["Review the service or item description and availability.", "Open the listing to check price, seller information, and delivery or collection details.", "Continue with the seller or BuyMesho checkout options provided on the listing."],
  },
  "electronics-gadgets": {
    intro: "Explore phones, computers, accessories, power products, audio devices, and everyday technology listed on BuyMesho in Malawi.",
    items: ["Phones and tablets", "Computers and laptops", "Chargers and power products", "Audio and accessories", "Everyday electronics"],
    buyingGuide: ["Check the condition, key specifications, and price.", "Open the listing for photos, seller information, and full details.", "Complete the purchase through BuyMesho checkout or the seller options shown."],
  },
  "beauty-personal-care": {
    intro: "Explore skincare, hair care, fragrances, cosmetics, and personal care essentials from BuyMesho sellers in Malawi.",
    items: ["Skincare products", "Hair care products", "Fragrances and body care", "Cosmetics and beauty items", "Personal care essentials"],
    buyingGuide: ["Read the product description and available size or quantity.", "Open the listing to review seller information and price.", "Use the purchase or seller contact options provided on BuyMesho."],
  },
};

function staticSeoResult(pathname: string, search: string, db?: any): SeoRenderResult {
  const normalized = pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
  const route = normalized === "/category"
    ? getRouteSEO(normalized, "category", search)
    : getRouteSEO(normalized, "home", search);

  if (normalized === "/category") {
    const requestedCategory = new URLSearchParams(search).get("category");
    const category = resolveMarketplaceCategory(requestedCategory);

    if (category) {
      const categoryListings = db
        ? db.prepare(
            "SELECT l.id,l.name FROM listings l JOIN sellers s ON l.seller_uid=s.uid WHERE l.category=? AND l.is_hidden=0 AND l.deleted_at IS NULL AND s.is_seller=1 ORDER BY l.created_at DESC,l.id DESC LIMIT 8"
          ).all(category.name) as Array<{ id: number; name?: string | null }>
        : [];
      const listingLinks = categoryListings
        .map((item) =>
          '<li style="margin:0 0 8px"><a href="/listing?listing=' +
          encodeURIComponent(String(item.id)) +
          '">' +
          esc(item.name || "Listing " + item.id) +
          "</a></li>"
        )
        .join("");

      return {
        title: category.name + " in Malawi",
        description: "Browse " + category.name.toLowerCase() + " from sellers on BuyMesho's Malawi marketplace.",
        canonicalUrl: "/category?category=" + encodeURIComponent(category.slug),
        noIndex: false,
        body: bodyFrame(
          category.name + " in Malawi",
          "BuyMesho category",
          "Browse " + category.name.toLowerCase() + " from sellers across the BuyMesho marketplace.",
          [
            { href: "/explore", label: "Explore all listings" },
            { href: "/buy-online-malawi", label: "Buy online in Malawi" },
            { href: "/sell-online-malawi", label: "Sell online in Malawi" },
          ],
          [
            categoryListings.length
              ? '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Current listings</h2><ul style="padding-left:20px">' + listingLinks + "</ul></section>"
              : "",
          ],
        ),
      };
    }
  }

  const copy: Record<string, { eyebrow: string; text: string }> = {
    "/": { eyebrow: "BuyMesho marketplace", text: "Browse products, services, sellers, deals, and public events through BuyMesho." },
    "/install": { eyebrow: "Install BuyMesho", text: "Install BuyMesho on your phone for fast access to Malawi's secure e-commerce platform." },
    "/signup": { eyebrow: "Create a BuyMesho account", text: "Join BuyMesho to buy, sell, and manage your marketplace activity." },
    "/explore": { eyebrow: "Public marketplace", text: "Browse public marketplace listings, categories, sellers, deals, and events." },
    "/explore/deals": { eyebrow: "BuyMesho deals", text: "Find current deals and value listings on BuyMesho." },
    "/buy-online-malawi": { eyebrow: "Buy online in Malawi", text: "Discover products, services, deals, sellers, and event tickets on BuyMesho." },
    "/sell-online-malawi": { eyebrow: "Sell online in Malawi", text: "Create a public seller presence and publish marketplace listings through BuyMesho." },
    "/buy-event-tickets-malawi": { eyebrow: "Buy event tickets in Malawi", text: "Learn how to find events, choose tickets, complete payment, receive digital tickets, and pass event validation on BuyMesho." },
    "/create-event-malawi": { eyebrow: "Create events in Malawi", text: "Learn how event creators set up events, configure tickets, publish events, manage activity, validate tickets, and receive payouts through BuyMesho." },
    "/explore/events": { eyebrow: "BuyMesho events", text: "Discover public events and ticket listings in Malawi." },
    "/explore/wholesale": { eyebrow: "BuyMesho wholesale", text: "Browse wholesale listings and supplier options on BuyMesho." },
    "/explore/sellers": { eyebrow: "BuyMesho sellers", text: "Browse approved seller profiles and public marketplace listings." },
    "/about": { eyebrow: "About BuyMesho", text: "Learn about BuyMesho and its public marketplace experience in Malawi." },
    "/privacy": { eyebrow: "BuyMesho", text: "Read the BuyMesho privacy policy." },
    "/terms": { eyebrow: "BuyMesho", text: "Read the BuyMesho terms of service." },
    "/safety": { eyebrow: "BuyMesho", text: "Read marketplace safety guidance for BuyMesho." },
  };

  const selected = copy[normalized] || { eyebrow: "BuyMesho", text: route.description };
  const sections: string[] = [
    '<section style="margin-top:24px"><p style="color:#52525b;line-height:1.7">' + esc(selected.text) + "</p></section>",
  ];


  if (db && normalized === "/explore/wholesale") {
    const wholesaleListings = db.prepare(
      "SELECT l.id,l.name,l.price,l.pack_size,l.bulk_units FROM listings l JOIN sellers s ON l.seller_uid=s.uid WHERE l.is_hidden=0 AND l.deleted_at IS NULL AND s.is_seller=1 AND (l.listing_mode='wholesale' OR l.is_wholesale=1 OR COALESCE(l.pack_size,0)>1) AND (l.status!='sold' AND l.sold_quantity<l.quantity) ORDER BY l.created_at DESC,l.id DESC LIMIT 8"
    ).all() as Array<{
      id: number;
      name?: string | null;
      price?: number | string | null;
      pack_size?: number | string | null;
      bulk_units?: string | null;
    }>;

    const listingLinks = wholesaleListings.map((item) =>
      '<li style="margin:0 0 10px"><a href="/listing?listing=' +
      encodeURIComponent(String(item.id)) +
      '">' +
      esc(item.name || "Wholesale listing " + item.id) +
      " · " +
      esc(formatMoney(item.price)) +
      (item.pack_size ? " · Pack of " + esc(String(item.pack_size)) : "") +
      (item.bulk_units ? " · " + esc(item.bulk_units) : "") +
      "</a></li>"
    ).join("");

    sections.push(
      '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Wholesale marketplace in Malawi</h2><p style="color:#52525b;line-height:1.7">BuyMesho wholesale listings are designed for buyers looking for packs, bulk quantities, and supplier-style purchasing. Browse current wholesale offers, compare prices and pack sizes, and open a listing for its full purchasing details.</p><p style="margin-top:10px;color:#52525b;line-height:1.7">Wholesale inventory is published by approved marketplace sellers and can include products sold in packs or bulk quantities.</p></section>',
    );

    sections.push(
      wholesaleListings.length
        ? '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Current wholesale listings</h2><ul style="padding-left:20px">' + listingLinks + "</ul></section>"
        : '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Current wholesale listings</h2><p style="color:#52525b;line-height:1.7">There are no active wholesale listings available right now. Check back as sellers add new bulk offers.</p></section>',
    );
  }

  if (db && (normalized === "/" || normalized === "/explore")) {
    const listings = db.prepare(
      "SELECT l.id,l.name,l.price FROM listings l JOIN sellers s ON l.seller_uid=s.uid WHERE l.is_hidden=0 AND l.deleted_at IS NULL AND s.is_seller=1 ORDER BY l.created_at DESC,l.id DESC LIMIT 8"
    ).all() as Array<{ id: number; name?: string | null; price?: number | string | null }>;
    if (listings.length) {
      const listingLinks = listings.map((item) =>
        '<li style="margin:0 0 8px"><a href="/listing?listing=' +
        encodeURIComponent(String(item.id)) +
        '">' +
        esc(item.name || "Listing " + item.id) +
        " · " +
        esc(formatMoney(item.price)) +
        "</a></li>"
      ).join("");
      sections.push(
        '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Current marketplace listings</h2><ul style="padding-left:20px">' +
        listingLinks +
        "</ul></section>",
      );
    }
  }

  if (db && normalized === "/explore/sellers") {
    const sellers = db.prepare(
      "SELECT uid,business_name FROM sellers WHERE is_seller=1 ORDER BY join_date DESC,uid ASC LIMIT 8"
    ).all() as Array<{ uid: string; business_name?: string | null }>;
    if (sellers.length) {
      const sellerLinks = sellers.map((item) =>
        '<li style="margin:0 0 8px"><a href="/seller?uid=' +
        encodeURIComponent(String(item.uid)) +
        '">' +
        esc(item.business_name?.trim() || "Seller profile") +
        "</a></li>"
      ).join("");
      sections.push(
        '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Public seller profiles</h2><ul style="padding-left:20px">' +
        sellerLinks +
        "</ul></section>",
      );
    }
  }

  if (db && normalized === "/explore/events") {
    const events = db.prepare(
      "SELECT id,event_title FROM events WHERE deleted_at IS NULL AND publication_status='published' AND (publication_mode='immediate' OR (publication_mode='scheduled' AND publication_at IS NOT NULL AND publication_at<=CURRENT_TIMESTAMP)) ORDER BY created_at DESC,id DESC LIMIT 8"
    ).all() as Array<{ id: number; event_title?: string | null }>;
    if (events.length) {
      const eventLinks = events.map((item) =>
        '<li style="margin:0 0 8px"><a href="/explore/events?event=' +
        encodeURIComponent(String(item.id)) +
        '">' +
        esc(item.event_title || "Event " + item.id) +
        "</a></li>"
      ).join("");
      sections.push(
        '<section style="margin-top:28px"><h2 style="font-size:24px;margin:0 0 12px">Public events</h2><ul style="padding-left:20px">' +
        eventLinks +
        "</ul></section>",
      );
    }
  }

  return {
    title: route.title,
    description: route.description,
    canonicalUrl: route.canonicalPath || normalized,
    noIndex: !!route.noIndex,
    body: bodyFrame(
      route.title,
      selected.eyebrow,
      selected.text,
      [
        { href: "/", label: "Homepage" },
        { href: "/explore", label: "Marketplace" },
        { href: "/explore/events", label: "Events" },
        { href: "/explore/deals", label: "Deals" },
        { href: "/explore/wholesale", label: "Wholesale" },
        { href: "/category?category=electronics-gadgets", label: "Electronics & Gadgets" },
        { href: "/category?category=fashion-clothing", label: "Fashion & Clothing" },
        { href: "/category?category=academic-services", label: "Academic Services" },
      ],
      sections,
    ),
  };
}

function buildListingResult(db: any, listingId: string): SeoRenderResult {
  const id = Number(listingId);
  const canonicalUrl = "/listing?listing=" + encodeURIComponent(listingId);

  if (!Number.isInteger(id) || id <= 0) {
    return {
      title: "Listing unavailable",
      description: "This BuyMesho listing is unavailable or could not be loaded.",
      canonicalUrl,
      noIndex: true,
      body: bodyFrame("Listing unavailable", "BuyMesho marketplace", "This listing is unavailable or could not be loaded.", [
        { href: "/explore", label: "Explore marketplace" },
        { href: "/buy-online-malawi", label: "Buy online in Malawi" },
      ]),
    };
  }

  const row = db.prepare(
    "SELECT l.id,l.name,l.price,l.description,l.category,l.university,l.condition,l.status,l.quantity,l.sold_quantity,l.photos,l.seller_uid,s.business_name " +
    "FROM listings l JOIN sellers s ON l.seller_uid=s.uid " +
    "WHERE l.id=? AND l.is_hidden=0 AND l.deleted_at IS NULL AND s.is_seller=1 LIMIT 1"
  ).get(id) as ListingRow | undefined;

  if (!row) {
    return {
      title: "Listing unavailable",
      description: "This BuyMesho listing is unavailable or could not be loaded.",
      canonicalUrl,
      noIndex: true,
      body: bodyFrame("Listing unavailable", "BuyMesho marketplace", "This listing is unavailable or could not be loaded.", [
        { href: "/explore", label: "Explore marketplace" },
        { href: "/buy-online-malawi", label: "Buy online in Malawi" },
      ]),
    };
  }

  const name = row.name?.trim() || "Marketplace listing";
  const price = formatMoney(row.price);
  const sellerName = row.business_name?.trim() || "BuyMesho seller";
  const sourceDescription = row.description?.trim() || "";
  const rawDescription = sourceDescription
    ? sourceDescription + " " + name + " is listed for " + price + " in Malawi on BuyMesho."
    : "Discover " + name + " for " + price + " in Malawi on BuyMesho.";
  const description = truncateSeoDescription(rawDescription);
  const photo = parsePhotos(row.photos)[0];
  const image = photo ? absoluteUrl(photo) : undefined;
  const sellerHref = row.seller_uid ? "/seller?uid=" + encodeURIComponent(row.seller_uid) : "";
  const canonicalAbsolute = SITE_URL + canonicalUrl;

  const jsonLd = buildProductJsonLd({
    name,
    description,
    url: canonicalAbsolute,
    image: image || DEFAULT_SEO.image,
    category: row.category,
    condition: row.condition,
    price: Number(row.price) || 0,
    currency: "MWK",
    availability: isListingOutOfStock({
      status: row.status,
      quantity: row.quantity,
      soldQuantity: row.sold_quantity,
    }) ? "OutOfStock" : "InStock",
    sellerName,
    sellerType: row.business_name?.trim() ? "Organization" : "Person",
    areaServed: row.university?.trim() ? `${row.university.trim()}, Malawi` : "Malawi",
  });

  const section = '<section style="margin-top:28px;padding:22px;border:1px solid #e4e4e7;border-radius:20px;background:#fff">' +
    '<h2 style="margin:0 0 12px;font-size:24px">' + esc(price) + "</h2>" +
    '<p style="margin:0;color:#52525b;line-height:1.7">' + esc(sourceDescription || "Public BuyMesho marketplace listing.") + "</p>" +
    '<p style="margin:14px 0 0;color:#52525b">' +
      (row.category ? "Category: <strong>" + esc(row.category) + "</strong><br>" : "") +
      (row.university ? "Location: <strong>" + esc(row.university) + "</strong>" : "Location: <strong>Malawi</strong>") +
    "</p>" +
    (sellerHref ? '<p style="margin:14px 0 0">' + link(sellerHref, "View " + sellerName + "'s seller profile") + "</p>" : "") +
    "</section>";

  return {
    title: name + " - " + price,
    description,
    canonicalUrl,
    noIndex: false,
    type: "product",
    image,
    imageAlt: name + " on BuyMesho",
    jsonLd,
    body: bodyFrame(
      name,
      "BuyMesho marketplace listing",
      name + " is listed for " + price + " on BuyMesho, " + (row.university?.trim() ? row.university.trim() + ", Malawi." : "Malawi."),
      [
        { href: "/explore", label: "Explore marketplace" },
        ...(sellerHref ? [{ href: sellerHref, label: "View seller profile" }] : []),
        { href: "/buy-online-malawi", label: "How to buy online in Malawi" },
        { href: "/sell-online-malawi", label: "Sell online in Malawi" },
      ],
      [section],
    ),
  };
}

function buildSellerResult(db: any, uid: string): SeoRenderResult {
  const normalizedUid = uid.trim();
  const canonicalUrl = "/seller?uid=" + encodeURIComponent(normalizedUid);
  const profile = db.prepare(
    "SELECT uid,business_name,business_logo,university,bio FROM sellers WHERE uid=? AND is_seller=1 LIMIT 1"
  ).get(normalizedUid) as SellerRow | undefined;

  if (!profile) {
    return {
      title: "Seller Profile Unavailable",
      description: "This BuyMesho seller profile is unavailable or could not be loaded.",
      canonicalUrl,
      noIndex: true,
      body: bodyFrame("Seller profile unavailable", "BuyMesho sellers", "This seller profile is unavailable or could not be loaded.", [
        { href: "/explore/sellers", label: "Browse sellers" },
        { href: "/explore", label: "Explore marketplace" },
      ]),
    };
  }

  const sellerName = profile.business_name?.trim() || "Seller Profile";
  const listings = db.prepare(
    "SELECT l.id,l.name FROM listings l JOIN sellers s ON l.seller_uid=s.uid WHERE l.seller_uid=? AND l.is_hidden=0 AND l.deleted_at IS NULL AND s.is_seller=1 ORDER BY l.created_at DESC,l.id DESC LIMIT ?"
  ).all(normalizedUid, MAX_SEO_LISTINGS) as Array<{ id: number; name?: string | null }>;

  const description = profile.bio?.trim().slice(0, 155) ||
    "Browse " + listings.length + " marketplace listing" + (listings.length === 1 ? "" : "s") + " from " + sellerName + " on BuyMesho.";
  const logo = profile.business_logo?.trim() || undefined;
  const listingLinks = listings.map((item) =>
    '<li style="margin:0 0 8px">' + link("/listing?listing=" + encodeURIComponent(String(item.id)), item.name || "Listing " + item.id) + "</li>"
  ).join("");

  return {
    title: sellerName + " | BuyMesho Seller",
    description,
    canonicalUrl,
    noIndex: true,
    image: logo,
    imageAlt: sellerName + " on BuyMesho",
    body: bodyFrame(
      sellerName,
      "BuyMesho seller profile",
      description,
      [
        { href: "/explore/sellers", label: "Browse all sellers" },
        { href: "/explore", label: "Explore marketplace" },
        { href: "/buy-online-malawi", label: "Buy online in Malawi" },
        { href: "/sell-online-malawi", label: "Sell online in Malawi" },
      ],
      [
        '<section style="margin-top:28px;padding:22px;border:1px solid #e4e4e7;border-radius:20px;background:#fff">' +
          '<p style="margin:0;color:#52525b;line-height:1.7">' + esc(profile.bio || "Public BuyMesho seller profile.") + "</p>" +
          (profile.university ? '<p style="margin:14px 0 0;color:#52525b">Location: <strong>' + esc(profile.university) + "</strong></p>" : "") +
          '<h2 style="margin:22px 0 10px;font-size:24px">Public listings</h2>' +
          (listings.length ? '<ul style="padding-left:20px">' + listingLinks + "</ul>" : "<p>No public listings are available right now.</p>") +
        "</section>",
      ],
    ),
  };
}

function buildEventResult(db: any, eventId: string): SeoRenderResult {
  const id = Number(eventId);
  const canonicalUrl = "/explore/events?event=" + encodeURIComponent(eventId);

  if (!Number.isInteger(id) || id <= 0) {
    return {
      title: "Event unavailable | BuyMesho Events",
      description: "This BuyMesho event is unavailable or could not be loaded.",
      canonicalUrl,
      noIndex: true,
      body: bodyFrame("Event unavailable", "BuyMesho events", "This event is unavailable or could not be loaded.", [
        { href: "/explore/events", label: "Browse events" },
        { href: "/buy-online-malawi", label: "Buy online in Malawi" },
      ]),
    };
  }

  const event = db.prepare(
    "SELECT id,event_title,event_type,organizer_name,event_date,start_time,venue,location,ticket_price,status,description,poster_alt,spec_values " +
    "FROM events WHERE id=? AND deleted_at IS NULL AND publication_status='published' AND " +
    "(publication_mode='immediate' OR (publication_mode='scheduled' AND publication_at IS NOT NULL AND publication_at<=CURRENT_TIMESTAMP)) LIMIT 1"
  ).get(id) as EventRow | undefined;

  if (!event) {
    return {
      title: "Event unavailable | BuyMesho Events",
      description: "This BuyMesho event is unavailable or could not be loaded.",
      canonicalUrl,
      noIndex: true,
      body: bodyFrame("Event unavailable", "BuyMesho events", "This event is unavailable or could not be loaded.", [
        { href: "/explore/events", label: "Browse events" },
        { href: "/buy-online-malawi", label: "Buy online in Malawi" },
      ]),
    };
  }

  const spec = parseSpecValues(event.spec_values);
  const eventAttendanceMode = getEventAttendanceMode(spec);
  const posterValue = spec.poster_image_url || spec.poster_url || spec.poster;
  const poster = typeof posterValue === "string" && posterValue.trim() ? absoluteUrl(posterValue.trim()) : undefined;
  const description = truncateSeoDescription(
    event.description?.trim() ||
      event.event_title + " by " + event.organizer_name + " in " + event.location + " on BuyMesho."
  );
  const free = event.ticket_price == null || Number(event.ticket_price) <= 0;
  const time = (event.start_time || "").trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  const startDate = time
    ? event.event_date + "T" + String(Number(time[1])).padStart(2, "0") + ":" + time[2] + ":" + (time[3] || "00") + "+02:00"
    : event.event_date;
  const canonicalAbsolute = SITE_URL + canonicalUrl;

  return {
    title: event.event_title + " | BuyMesho Events",
    description,
    canonicalUrl,
    noIndex: false,
    image: poster,
    imageAlt: event.poster_alt?.trim() || event.event_title + " event poster",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Event",
      "@id": canonicalAbsolute + "#event",
      name: event.event_title,
      description: event.description?.trim() || undefined,
      ...(startDate ? { startDate } : {}),
      ...(poster ? { image: [poster] } : {}),
      eventStatus: event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
      ...(eventAttendanceMode ? { eventAttendanceMode } : {}),
      location: {
        "@type": "Place",
        name: event.venue,
        address: {
          "@type": "PostalAddress",
          addressLocality: event.location,
          addressCountry: "MW",
        },
      },
      ...(event.organizer_name?.trim() ? { organizer: { "@type": "Organization", name: event.organizer_name.trim() } } : {}),
      offers: {
        "@type": "Offer",
        url: canonicalAbsolute,
        price: free ? 0 : Number(event.ticket_price),
        priceCurrency: "MWK",
        availability:
          event.status === "cancelled"
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
      },
      ...(free ? { isAccessibleForFree: true } : {}),
    },
    body: bodyFrame(
      event.event_title,
      "BuyMesho event",
      description,
      [
        { href: "/explore/events", label: "Browse events" },
        { href: "/buy-online-malawi", label: "Buy online in Malawi" },
        { href: "/explore", label: "Explore marketplace" },
      ],
      [
        '<section style="margin-top:28px;padding:22px;border:1px solid #e4e4e7;border-radius:20px;background:#fff">' +
          '<p style="margin:0 0 8px;color:#52525b">' + esc(event.event_date) + " · " + esc(event.start_time) + "</p>" +
          '<p style="margin:0;color:#52525b">Venue: <strong>' + esc(event.venue) + "</strong>" +
            (event.location ? " · <strong>" + esc(event.location) + "</strong>" : "") +
          "</p>" +
          '<p style="margin:14px 0 0;color:#52525b;line-height:1.7">' + esc(event.description || "Public BuyMesho event listing.") + "</p>" +
          '<p style="margin:14px 0 0;font-weight:800">' + esc(formatMoney(event.ticket_price)) + "</p>" +
        "</section>",
      ],
    ),
  };
}

export function renderSeoDocument(request: Request, db: any): SeoRenderResult {
  const pathname = (request.path || "/").replace(/\/+$/, "") || "/";
  const search = request.originalUrl.includes("?")
    ? request.originalUrl.slice(request.originalUrl.indexOf("?"))
    : "";

  try {
    const params = new URLSearchParams(search);

    if (pathname === "/listing" && params.has("listing")) {
      return buildListingResult(db, params.get("listing") || "");
    }

    if (pathname === "/seller" && params.has("uid")) {
      return buildSellerResult(db, params.get("uid") || "");
    }

    if (pathname === "/explore/events" && params.has("event")) {
      return buildEventResult(db, params.get("event") || "");
    }

    const publicPaths = new Set([
      "/",
      "/home",
      "/install",
      "/signup",
      "/about",
      "/explore",
      "/buy-online-malawi",
      "/sell-online-malawi",
      "/buy-event-tickets-malawi",
      "/create-event-malawi",
      "/explore/deals",
      "/explore/events",
      "/explore/wholesale",
      "/explore/sellers",
      "/privacy",
      "/terms",
      "/safety",
      "/category",
    ]);

    if (publicPaths.has(pathname)) {
      return staticSeoResult(pathname, search, db);
    }

    return {
      title: "BuyMesho",
      description: "BuyMesho marketplace.",
      canonicalUrl: pathname,
      noIndex: true,
      body: bodyFrame("BuyMesho", "BuyMesho", "BuyMesho marketplace.", [
        { href: "/explore", label: "Explore marketplace" },
      ]),
    };
  } catch (error) {
    console.error("[SEO] Failed to render server SEO document:", error);
    return {
      title: "BuyMesho",
      description: "BuyMesho marketplace.",
      canonicalUrl: pathname,
      noIndex: true,
      body: bodyFrame("BuyMesho", "BuyMesho", "BuyMesho marketplace.", [
        { href: "/explore", label: "Explore marketplace" },
      ]),
    };
  }
}

export function injectSeoDocument(template: string, rendered: SeoRenderResult): string {
  const head = buildHead(rendered);
  let documentHtml = template
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta[^>]+name=["']description["'][^>]*>/i, "")
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/i, "")
    .replace(/<meta[^>]+name=["']application-name["'][^>]*>/i, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, "")
    .replace(/<meta[^>]+property=["']og:(site_name|title|description|type|url|image|image:alt|locale)["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']twitter:(card|title|description|image|image:alt)["'][^>]*>/gi, "")
    .replace("</head>", head + "\n  </head>");

  documentHtml = documentHtml.replace(
    '<div id="root"></div>',
    '<div id="seo-prerender">' + rendered.body + '</div><div id="root"></div>',
  );

  return documentHtml;
}

export function isSeoDocumentPath(pathname: string): boolean {
  return (
    !pathname.startsWith("/api/")
    && pathname !== "/robots.txt"
    && pathname !== "/sitemap.xml"
    && !/^\/sitemap-\d+\.xml$/.test(pathname)
    && !/\.[^/]+$/.test(pathname)
  );
}
