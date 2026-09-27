import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { getRouteSEO, getListingCanonicalUrl, getSEOForListing } from "../seo";
import { buildProductJsonLd, getProductSchemaCondition, isListingOutOfStock } from "../seoProduct";
import { getEventAttendanceMode } from "../seoEvent";
import { getAppRouteFromLocation } from "../../lib/appNavigation.query";
import type { AppRoute } from "../../lib/appNavigation.paths";
import { buildSitemapIndexXml, buildUrlsetXml } from "../../../server/routes/sitemap.routes";
import { injectSeoDocument, isSeoDocumentPath, renderSeoDocument } from "../../../server/seo/publicSeoShell.js";

const emptySeoDb = {
  prepare() {
    return {
      get: () => undefined,
      all: () => [],
    };
  },
};


test("public routes are explicitly indexable", () => {
  const publicRoutes: Array<[string, AppRoute]> = [
    ["/", "home"],
    ["/about", "about"],
    ["/explore", "explore"],
    ["/buy-online-malawi", "buy_online_malawi"],
    ["/sell-online-malawi", "sell_online_malawi"],
    ["/explore/events", "explore"],
    ["/explore/sellers", "explore"],
    ["/privacy", "privacy"],
    ["/terms", "terms"],
    ["/safety", "safety"],
  ];

  for (const [pathname, route] of publicRoutes) {
    const seo = getRouteSEO(pathname, route);
    assert.equal(seo.noIndex, false, `${pathname} should be indexable`);
  }
});

test("category routes require a known category key", () => {
  const valid = getRouteSEO("/category", "category", "?category=phones");
  assert.equal(valid.noIndex, false);
  assert.equal(valid.managedByPage, true);
  assert.equal(valid.canonicalPath, "/category?category=phones");

  const bare = getRouteSEO("/category", "category", "");
  assert.equal(bare.noIndex, true);
  assert.equal(bare.canonicalPath, "/category");

  const invalid = getRouteSEO("/category", "category", "?category=banana");
  assert.equal(invalid.noIndex, true);
  assert.equal(invalid.canonicalPath, "/category");

  assert.equal(getAppRouteFromLocation({ pathname: "/category", search: "" }), "category");
  assert.equal(getAppRouteFromLocation({ pathname: "/category", search: "?category=banana" }), "category");
});

test("page-managed public pages are not overwritten by root SEO", () => {
  const listingSeo = getRouteSEO("/listing", "listing_details");
  assert.equal(listingSeo.noIndex, false);
  assert.equal(listingSeo.managedByPage, true);

  const categorySeo = getRouteSEO("/category", "category", "?category=phones");
  assert.equal(categorySeo.noIndex, false);
  assert.equal(categorySeo.managedByPage, true);
});

test("private and non-public routes default to noindex", () => {
  const privateRoutes: Array<[string, AppRoute]> = [
    ["/tickets", "tickets"],
    ["/admin", "admin"],
    ["/messages", "messages"],
    ["/profile", "profile"],
    ["/settings", "settings"],
    ["/cart", "home"],
    ["/transaction-json", "home"],
    ["/explore/lending", "explore"],
  ];

  for (const [pathname, route] of privateRoutes) {
    const seo = getRouteSEO(pathname, route);
    assert.equal(seo.noIndex, true, `${pathname} should be noindex`);
  }

  const unknown = getRouteSEO("/unknown-private-surface", "home");
  assert.equal(unknown.noIndex, true);
});

test("homepage keeps the canonical root URL and core keyword set", () => {
  const seo = getRouteSEO("/", "home");

  assert.equal(seo.canonicalPath, "/");
  assert.ok(Array.isArray(seo.keywords));
  assert.ok(seo.keywords.includes("BuyMesho"));
  assert.ok(seo.keywords.includes("Malawi marketplace"));
  assert.ok(seo.keywords.includes("event tickets Malawi"));
});

test("listing canonical removes the gallery image query parameter", () => {
  assert.equal(
    getListingCanonicalUrl(123, "https://buymesho.app/listing?listing=123&image=2"),
    "https://buymesho.app/listing?listing=123",
  );
});

test("homepage route metadata identifies BuyMesho as a Malawi marketplace", () => {
  const seo = getRouteSEO("/explore", "explore");

  assert.match(seo.title, /BuyMesho/i);
  assert.match(seo.title, /Malawi/i);
  assert.match(seo.description, /online marketplace/i);
  assert.match(seo.description, /Malawi/i);
  assert.equal(seo.noIndex, false);
});

test("marketplace intent pages have distinct indexable metadata", () => {
  const buy = getRouteSEO("/buy-online-malawi", "buy_online_malawi");
  assert.equal(buy.canonicalPath, "/buy-online-malawi");
  assert.equal(buy.noIndex, false);
  assert.match(buy.title, /buy online/i);
  assert.match(buy.title, /Malawi/i);
  assert.match(buy.description, /BuyMesho/i);

  const sell = getRouteSEO("/sell-online-malawi", "sell_online_malawi");
  assert.equal(sell.canonicalPath, "/sell-online-malawi");
  assert.equal(sell.noIndex, false);
  assert.match(sell.title, /sell online/i);
  assert.match(sell.title, /Malawi/i);
  assert.match(sell.description, /seller|selling/i);
});

test("marketplace intent paths resolve to their public app routes", () => {
  assert.equal(getAppRouteFromLocation({ pathname: "/buy-online-malawi", search: "" }), "buy_online_malawi");
  assert.equal(getAppRouteFromLocation({ pathname: "/sell-online-malawi", search: "" }), "sell_online_malawi");
});


test("seller profile and event detail routes are page-managed and indexable", () => {
  const seller = getRouteSEO("/seller", "seller", "?uid=seller-123");
  assert.equal(seller.noIndex, false);
  assert.equal(seller.managedByPage, true);
  assert.equal(seller.canonicalPath, "/seller?uid=seller-123");

  const missingSeller = getRouteSEO("/seller", "seller", "");
  assert.equal(missingSeller.noIndex, true);

  const event = getRouteSEO("/explore/events", "explore", "?event=42");
  assert.equal(event.noIndex, false);
  assert.equal(event.managedByPage, true);
  assert.equal(event.canonicalPath, "/explore/events?event=42");

  const eventDirectory = getRouteSEO("/explore/events", "explore", "");
  assert.equal(eventDirectory.managedByPage, undefined);
  assert.equal(eventDirectory.noIndex, false);
});

test("event details derive route state from live URL changes", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/eventDetails/EventDetailsView.tsx"),
    "utf8",
  );

  assert.match(source, /export function getEventRouteState\(search: string\)/);
  assert.match(source, /window\.addEventListener\("popstate", syncEventRouteState\)/);
  assert.match(source, /setEventRouteState\(getEventRouteState\(window\.location\.search\)\)/);
  assert.match(source, /setEvent\(null\)/);
  assert.match(source, /autoBuyHandledRef\.current = false/);
  assert.match(source, /event\.id !== eventId/);
  assert.match(source, /\[autoBuyRequested, authLoading, event, eventId, handleBuyTicket\]/);
});

test("public marketplace surfaces expose crawlable internal links", () => {
  const sources = [
    readFileSync(resolve(process.cwd(), "src/components/ListingCard.tsx"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/components/listingDetails/ListingDetailsShared.tsx"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/components/events/EventCard.tsx"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/components/home/EventsStrip.tsx"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/SellerProfilePage.tsx"), "utf8"),
    readFileSync(resolve(process.cwd(), "src/SellersDirectoryPage.tsx"), "utf8"),
  ].join("\n");

  assert.ok(sources.includes("href={`/listing?listing="));
  assert.ok(sources.includes("href={`/seller?uid="));
  assert.ok(sources.includes("EVENTS_PATH}?event=${encodeURIComponent"));
});
test("event attendance schema is explicit and shared between client and server", () => {
  const client = readFileSync(resolve(process.cwd(), "src/components/eventDetails/EventDetailsView.tsx"), "utf8");
  const server = readFileSync(resolve(process.cwd(), "server/seo/publicSeoShell.ts"), "utf8");
  const eventCore = readFileSync(resolve(process.cwd(), "src/eventSchemas/core.ts"), "utf8");

  assert.match(client, /getEventAttendanceMode\(event\.spec_values\)/);
  assert.match(server, /getEventAttendanceMode\(spec\)/);
  assert.ok(!client.includes('eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"'));
  assert.ok(!server.includes('eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode"'));
  assert.match(eventCore, /key: "delivery_mode"/);
  assert.match(eventCore, /EVENT_DELIVERY_MODE_OPTIONS/);

  assert.equal(
    getEventAttendanceMode({ delivery_mode: "In Person" }),
    "https://schema.org/OfflineEventAttendanceMode",
  );
  assert.equal(
    getEventAttendanceMode({ delivery_mode: "Online" }),
    "https://schema.org/OnlineEventAttendanceMode",
  );
  assert.equal(
    getEventAttendanceMode({ delivery_mode: "Hybrid" }),
    "https://schema.org/MixedEventAttendanceMode",
  );
  assert.equal(getEventAttendanceMode({}), undefined);
});

test("client and server listing SEO use the shared product schema", () => {
  const clientSeo = readFileSync(resolve(process.cwd(), "src/lib/seo.ts"), "utf8");
  const serverSeo = readFileSync(resolve(process.cwd(), "server/seo/publicSeoShell.ts"), "utf8");

  assert.match(clientSeo, /buildProductJsonLd\(/);
  assert.match(serverSeo, /buildProductJsonLd\(/);

  const listing = {
    id: 42,
    seller_uid: "seller-42",
    name: "Sample Phone",
    price: 250000,
    description: "A public phone listing.",
    category: "Electronics & Gadgets",
    university: "LUANAR",
    photos: [],
    status: "available",
    condition: "Used",
    created_at: "2026-09-27T00:00:00Z",
    is_verified: false,
    business_name: "Sample Seller",
  } as any;

  const seoConfig = getSEOForListing(listing);
  const schema = buildProductJsonLd({
    name: seoConfig.productName || "Sample Phone",
    description: "A public phone listing.",
    url: "https://buymesho.app/listing?listing=42",
    image: seoConfig.image,
    category: seoConfig.category,
    condition: seoConfig.condition,
    price: seoConfig.price || 0,
    currency: seoConfig.currency || "MWK",
    availability: seoConfig.availability || "InStock",
    sellerName: seoConfig.sellerName,
    sellerType: seoConfig.sellerType,
    areaServed: seoConfig.campus ? `${seoConfig.campus}, Malawi` : "Malawi",
  });

  assert.equal(schema.name, "Sample Phone");
  assert.equal(schema.mainEntityOfPage, "https://buymesho.app/listing?listing=42");
  assert.equal((schema.offers as Record<string, unknown>).seller && ((schema.offers as Record<string, unknown>).seller as Record<string, unknown>)["@type"], "Organization");
  assert.equal("brand" in schema, false);
  assert.equal((schema.offers as Record<string, unknown>).price, 250000);
  assert.equal((schema.offers as Record<string, unknown>).priceCurrency, "MWK");
});

test("product condition mapping is explicit", () => {
  assert.equal(getProductSchemaCondition("New"), "https://schema.org/NewCondition");
  assert.equal(getProductSchemaCondition("Like New"), "https://schema.org/LikeNewCondition");
  assert.equal(getProductSchemaCondition("Refurbished"), "https://schema.org/RefurbishedCondition");
  assert.equal(getProductSchemaCondition("Used"), "https://schema.org/UsedCondition");
  assert.equal(getProductSchemaCondition("Open Box"), "https://schema.org/UsedCondition");
  assert.equal(getProductSchemaCondition("Unknown condition"), undefined);
});

test("listing SEO availability follows marketplace quantity semantics", () => {
  assert.equal(isListingOutOfStock({ status: "available", quantity: 5, soldQuantity: 4 }), false);
  assert.equal(isListingOutOfStock({ status: "available", quantity: 5, soldQuantity: 5 }), true);
  assert.equal(isListingOutOfStock({ status: "sold", quantity: 5, soldQuantity: 0 }), true);

  const longListing = {
    id: 99,
    name: "Long Description Phone",
    price: 250000,
    description: "A".repeat(500),
    category: "Electronics & Gadgets",
    university: "LUANAR",
    photos: [],
    status: "available",
    quantity: 1,
    sold_quantity: 1,
    condition: "Used",
    business_name: "Sample Seller",
  } as any;

  const seo = getSEOForListing(longListing);
  assert.equal(seo.availability, "OutOfStock");
  assert.equal(seo.description.length <= 160, true);
});

test("seller directory is backed by the public seller endpoint", () => {
  const directory = readFileSync(resolve(process.cwd(), "src/SellersDirectoryPage.tsx"), "utf8");
  const sellerRoutes = readFileSync(resolve(process.cwd(), "server/routes/sellerProfile.routes.ts"), "utf8");

  assert.ok(
    directory.includes('apiFetch("/api/sellers?public=true")'),
    "seller directory should fetch sellers directly",
  );
  assert.ok(
    !directory.includes('apiFetch("/api/listings?sortBy=newest&pageSize=200")'),
    "seller directory should not derive sellers from the newest 200 listings",
  );
  assert.match(sellerRoutes, /app\.get\("\/api\/sellers"/);
  assert.match(sellerRoutes, /WHERE s\.is_seller = 1/);
  assert.match(sellerRoutes, /listing_count/);
  assert.match(sellerRoutes, /average_rating/);
  assert.match(sellerRoutes, /rating_count/);
});

test("public listing visibility uses the same seller eligibility rule", () => {
  const marketplace = readFileSync(resolve(process.cwd(), "server/routes/marketplace.routes.ts"), "utf8");
  const seoShell = readFileSync(resolve(process.cwd(), "server/seo/publicSeoShell.ts"), "utf8");
  const sitemap = readFileSync(resolve(process.cwd(), "server/routes/sitemap.routes.ts"), "utf8");

  assert.ok(
    marketplace.includes("AND s.is_seller = 1"),
    "marketplace listing queries should require an active seller",
  );
  assert.ok(
    (seoShell.match(/s\.is_seller=1/g) || []).length >= 3,
    "SSR listing queries should require an active seller",
  );
  assert.ok(sitemap.includes("AND s.is_seller = 1"));
});


test("server SEO shell classifies document routes separately from assets", () => {
  assert.equal(isSeoDocumentPath("/"), true);
  assert.equal(isSeoDocumentPath("/listing"), true);
  assert.equal(isSeoDocumentPath("/assets/app.js"), false);
  assert.equal(isSeoDocumentPath("/robots.txt"), false);
  assert.equal(isSeoDocumentPath("/sitemap.xml"), false);
});

test("server SEO shell noindexes bare and invalid category documents", () => {
  const bare = renderSeoDocument({ path: "/category", originalUrl: "/category" } as any, emptySeoDb);
  assert.equal(bare.noIndex, true);
  assert.equal(bare.canonicalUrl, "/category");

  const invalid = renderSeoDocument(
    { path: "/category", originalUrl: "/category?category=banana" } as any,
    emptySeoDb,
  );
  assert.equal(invalid.noIndex, true);
  assert.equal(invalid.canonicalUrl, "/category");

  const valid = renderSeoDocument(
    { path: "/category", originalUrl: "/category?category=phones" } as any,
    emptySeoDb,
  );
  assert.equal(valid.noIndex, false);
  assert.equal(valid.canonicalUrl, "/category?category=phones");
});

test("server SEO shell keeps every public static route indexable", () => {
  const publicStaticRoutes: Array<[string, AppRoute]> = [
    ["/", "home"],
    ["/home", "home"],
    ["/install", "home"],
    ["/signup", "home"],
    ["/about", "about"],
    ["/explore", "explore"],
    ["/buy-online-malawi", "buy_online_malawi"],
    ["/sell-online-malawi", "sell_online_malawi"],
    ["/explore/deals", "explore"],
    ["/explore/events", "explore"],
    ["/explore/wholesale", "explore"],
    ["/explore/sellers", "explore"],
    ["/privacy", "privacy"],
    ["/terms", "terms"],
    ["/safety", "safety"],
  ];

  for (const [pathname, route] of publicStaticRoutes) {
    const rendered = renderSeoDocument({ path: pathname, originalUrl: pathname } as any, emptySeoDb);
    assert.equal(rendered.noIndex, false, pathname + " should be indexable on the server");

    const clientSeo = getRouteSEO(pathname, route);
    assert.equal(clientSeo.noIndex, false, pathname + " should also be indexable on the client");
    assert.equal(rendered.canonicalUrl, clientSeo.canonicalPath);
  }
});

test("server SEO shell normalizes trailing slashes for public and dynamic routes", () => {
  const explore = renderSeoDocument(
    { path: "/explore/", originalUrl: "/explore/" } as any,
    emptySeoDb,
  );
  assert.equal(explore.noIndex, false);
  assert.equal(explore.canonicalUrl, "/explore");

  const category = renderSeoDocument(
    { path: "/category/", originalUrl: "/category/?category=phones" } as any,
    emptySeoDb,
  );
  assert.equal(category.noIndex, false);
  assert.equal(category.canonicalUrl, "/category?category=phones");

  const fakeListing = {
    id: 42,
    name: "Sample Phone",
    price: 250000,
    description: "A public phone listing.",
    category: "Electronics & Gadgets",
    university: "LUANAR",
    condition: "Used",
    status: "available",
    quantity: 1,
    sold_quantity: 0,
    photos: "[]",
    seller_uid: "seller-42",
    business_name: "Sample Seller",
  };
  const listingDb = {
    prepare() {
      return { get: () => fakeListing };
    },
  };
  const listing = renderSeoDocument(
    { path: "/listing/", originalUrl: "/listing/?listing=42" } as any,
    listingDb,
  );
  assert.equal(listing.noIndex, false);
  assert.equal(listing.canonicalUrl, "/listing?listing=42");
});

test("server SEO shell replaces index defaults with route-specific metadata", () => {
  const template =
    "<!DOCTYPE html><html><head><title>Old title</title>" +
    "<meta name=\"description\" content=\"Old description\">" +
    "<link rel=\"canonical\" href=\"https://buymesho.app/\"></head>" +
    "<body><div id=\"root\"></div></body></html>";
  const request = {
    path: "/buy-online-malawi",
    originalUrl: "/buy-online-malawi",
  } as any;
  const rendered = renderSeoDocument(request, {});
  const html = injectSeoDocument(template, rendered);

  assert.match(html, /<title>Buy Online in Malawi/);
  assert.match(html, /name="description"/);
  assert.match(html, /name="robots" content="index, follow"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/buymesho\.app\/buy-online-malawi">/);
  assert.match(html, /<div id="seo-prerender"><div/);
  assert.match(html, /href="\/explore"/);
  assert.equal((html.match(/<title>/g) || []).length, 1);
});

test("category page does not silently default invalid URLs to phones", () => {
  const source = readFileSync(resolve(process.cwd(), "src/CategoryPage.tsx"), "utf8");
  assert.match(source, /isMarketplaceCategoryKey/);
  assert.match(source, /Category not found/);
  assert.match(source, /noIndex: true/);
  assert.match(source, /requestedCategory/);
});

test("server SEO shell renders a public listing snapshot from the database", () => {
  const fakeListing = {
    id: 42,
    name: "Sample Phone",
    price: 250000,
    description: "A public phone listing.",
    category: "Electronics & Gadgets",
    university: "LUANAR",
    condition: "Used",
    status: "available",
    photos: "[]",
    seller_uid: "seller-42",
    business_name: "Sample Seller",
  };
  const db = {
    prepare() {
      return { get: () => fakeListing };
    },
  };
  const rendered = renderSeoDocument({ path: "/listing", originalUrl: "/listing?listing=42" } as any, db);

  assert.equal(rendered.noIndex, false);
  assert.match(rendered.title, /Sample Phone/);
  assert.equal(rendered.canonicalUrl, "/listing?listing=42");
  assert.match(rendered.body, /Sample Phone/);
  assert.match(rendered.body, /seller\?uid=seller-42/);
  assert.equal(rendered.jsonLd?.["@type"], "Product");
});
test("phase 8 Search Console verification and measurement hooks are wired", () => {
  const viteConfig = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf8");
  const analytics = readFileSync(resolve(process.cwd(), "src/lib/analytics.ts"), "utf8");
  const routerSeo = readFileSync(resolve(process.cwd(), "src/router/RootRouterSeo.ts"), "utf8");
  const guide = readFileSync(resolve(process.cwd(), "docs/seo-phase-8-search-console.md"), "utf8");

  assert.match(viteConfig, /VITE_GOOGLE_SITE_VERIFICATION/);
  assert.match(viteConfig, /google-site-verification/);
  assert.match(analytics, /logEvent\(analytics, "screen_view"/);
  assert.match(analytics, /firebase_screen/);
  assert.match(routerSeo, /trackPublicPageView/);
  assert.match(routerSeo, /!seo\.noIndex && !seo\.managedByPage/);
  assert.doesNotMatch(routerSeo, /if \(!seo\.noIndex\) \{/);
  assert.match(guide, /sitemap\.xml/);
  assert.match(guide, /VITE_GOOGLE_SITE_VERIFICATION/);
});

test("dynamic public page analytics wait for verified page content", () => {
  const listingSeoHook = readFileSync(resolve(process.cwd(), "src/hooks/useListingSEO.ts"), "utf8");
  const sellerPage = readFileSync(resolve(process.cwd(), "src/SellerProfilePage.tsx"), "utf8");
  const eventPage = readFileSync(resolve(process.cwd(), "src/components/eventDetails/EventDetailsView.tsx"), "utf8");

  assert.match(listingSeoHook, /trackPublicPageView/);
  assert.match(listingSeoHook, /new URLSearchParams\(window\.location\.search\)\.get\("listing"\)/);
  assert.match(listingSeoHook, /urlListingId === String\(listing\.id\)/);

  assert.match(sellerPage, /trackPublicPageView/);
  assert.match(sellerPage, /new URLSearchParams\(window\.location\.search\)\.get\("uid"\)/);
  assert.match(sellerPage, /profile\.uid/);

  assert.match(eventPage, /trackPublicPageView/);
  assert.match(eventPage, /event\.id === eventId/);
  assert.match(eventPage, /new URLSearchParams\(window\.location\.search\)\.get\("event"\)/);
  assert.match(eventPage, /liveEventId === String\(event\.id\)/);
});

test("dynamic analytics use canonical public route paths without volatile query parameters", () => {
  const listingSeoHook = readFileSync(resolve(process.cwd(), "src/hooks/useListingSEO.ts"), "utf8");
  const sellerPage = readFileSync(resolve(process.cwd(), "src/SellerProfilePage.tsx"), "utf8");
  const eventPage = readFileSync(resolve(process.cwd(), "src/components/eventDetails/EventDetailsView.tsx"), "utf8");

  assert.match(listingSeoHook, /const listingPath/);
  assert.match(listingSeoHook, /encodeURIComponent/);
  assert.match(sellerPage, /const sellerPath/);
  assert.match(sellerPage, /encodeURIComponent/);
  assert.match(eventPage, /const eventPath/);
  assert.match(eventPage, /encodeURIComponent/);
});

test("dynamic sitemap XML helpers produce valid escaped output", () => {
  const urlset = buildUrlsetXml([
    {
      loc: "https://buymesho.app/listing?listing=12&mode=deal",
      lastmod: "2026-09-27T00:00:00Z",
    },
  ]);
  assert.match(urlset, /<urlset[^>]*>/);
  assert.match(urlset, /listing\?listing=12&amp;mode=deal/);
  assert.match(urlset, /<lastmod>2026-09-27T00:00:00.000Z<\/lastmod>/);

  const index = buildSitemapIndexXml([
    "https://buymesho.app/sitemap-1.xml",
    "https://buymesho.app/sitemap-2.xml",
  ]);
  assert.match(index, /<sitemapindex[^>]*>/);
  assert.equal((index.match(/<loc>/g) || []).length, 2);
});

test("static sitemap is removed so dynamic sitemap data cannot drift", () => {
  assert.equal(existsSync(resolve(process.cwd(), "public/sitemap.xml")), false);
});

test("vercel keeps the frontend on Vercel and routes public SSR documents to Render", () => {
  const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
    routes: Array<{ src?: string; dest?: string; handle?: string }>;
  };

  const filesystemRoute = vercel.routes.find((route) => route.handle === "filesystem");
  const spaFallback = vercel.routes.find((route) => route.src === "/(.*)");

  assert.ok(filesystemRoute);
  assert.equal(spaFallback?.dest, "/index.html");

  for (const path of [
    "/",
    "/explore",
    "/buy-online-malawi",
    "/sell-online-malawi",
    "/category",
    "/listing",
    "/seller",
    "/explore/events",
  ]) {
    const route = vercel.routes.find((entry) => entry.src === path);
    assert.equal(
      route?.dest,
      "https://buymesho.onrender.com" + path,
      path + " should use Render only for its SSR document",
    );
  }
});

test("vercel keeps API and sitemap requests on Render", () => {
  const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
    routes: Array<{ src?: string; dest?: string }>;
  };

  assert.equal(
    vercel.routes.find((route) => route.src === "/api/(.*)")?.dest,
    "https://buymesho.onrender.com/api/$1",
  );
  assert.equal(
    vercel.routes.find((route) => route.src === "/sitemap\\.xml")?.dest,
    "https://buymesho.onrender.com/api/seo/sitemap.xml",
  );
});

test("vercel routes canonical sitemap requests to the dynamic backend", () => {
  const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8")) as {
    routes: Array<{ src?: string; dest?: string }>;
  };
  const sitemapRoute = vercel.routes.find((route) => route.src === "/sitemap\\.xml");
  const sitemapChunkRoute = vercel.routes.find((route) => route.src === "/sitemap-(.*)\\.xml");
  assert.equal(sitemapRoute?.dest, "https://buymesho.onrender.com/api/seo/sitemap.xml");
  assert.equal(sitemapChunkRoute?.dest, "https://buymesho.onrender.com/api/seo/sitemap-$1.xml");
});

test("index.html contains the static BuyMesho brand entity schema", () => {
  const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const match = indexHtml.match(
    /<script type="application\/ld\+json" id="buymesho-entity-schema">([\s\S]*?)<\/script>/,
  );

  assert.ok(match, "BuyMesho entity JSON-LD should be present in index.html");

  const schemaJson = match[1];
  assert.ok(schemaJson, "BuyMesho entity JSON-LD should contain JSON content");

  const graph = (JSON.parse(schemaJson) as {
    "@graph"?: Array<Record<string, unknown>>;
  })["@graph"];

  assert.ok(Array.isArray(graph));

  const organization = graph.find((entry) => entry["@type"] === "OnlineMarketplace");
  assert.ok(organization);
  assert.equal(organization.name, "BuyMesho");
  assert.equal(organization.alternateName, "Buy Mesho");

  const website = graph.find((entry) => entry["@type"] === "WebSite");
  assert.ok(website);
  assert.equal(website.name, "BuyMesho");
});
