import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { getRouteSEO, getListingCanonicalUrl } from "../seo";
import { getAppRouteFromLocation } from "../../lib/appNavigation.query";
import type { AppRoute } from "../../lib/appNavigation.paths";
import { buildSitemapIndexXml, buildUrlsetXml } from "../../../server/routes/sitemap.routes";
import { injectSeoDocument, isSeoDocumentPath, renderSeoDocument } from "../../../server/seo/publicSeoShell.js";

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

test("page-managed public pages are not overwritten by root SEO", () => {
  const listingSeo = getRouteSEO("/listing", "listing_details");
  assert.equal(listingSeo.noIndex, false);
  assert.equal(listingSeo.managedByPage, true);

  const categorySeo = getRouteSEO("/category", "category");
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
test("server SEO shell classifies document routes separately from assets", () => {
  assert.equal(isSeoDocumentPath("/"), true);
  assert.equal(isSeoDocumentPath("/listing"), true);
  assert.equal(isSeoDocumentPath("/assets/app.js"), false);
  assert.equal(isSeoDocumentPath("/robots.txt"), false);
  assert.equal(isSeoDocumentPath("/sitemap.xml"), false);
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
  assert.match(routerSeo, /!seo\.noIndex/);
  assert.match(guide, /sitemap\.xml/);
  assert.match(guide, /VITE_GOOGLE_SITE_VERIFICATION/);
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
