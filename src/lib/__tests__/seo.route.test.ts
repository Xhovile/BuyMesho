import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { getRouteSEO, getListingCanonicalUrl } from "../seo";
import type { AppRoute } from "../../lib/appNavigation.paths";

test("public routes are explicitly indexable", () => {
  const publicRoutes: Array<[string, AppRoute]> = [
    ["/", "home"],
    ["/about", "about"],
    ["/explore", "explore"],
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

test("index.html contains the static BuyMesho brand entity schema", () => {
  const indexHtml = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
  const match = indexHtml.match(
    /<script type="application\/ld\+json" id="buymesho-entity-schema">([\s\S]*?)<\/script>/,
  );

  assert.ok(match, "BuyMesho entity JSON-LD should be present in index.html");

  const schemaJson = match[1];
  assert.ok(schemaJson, "BuyMesho entity JSON-LD should contain JSON content");

  const graph = JSON.parse(schemaJson) as {
    "@graph"?: Array<Record<string, unknown>>;
  }["graph"];

  assert.ok(Array.isArray(graph));

  const organization = graph.find((entry) => entry["@type"] === "OnlineMarketplace");
  assert.ok(organization);
  assert.equal(organization.name, "BuyMesho");
  assert.equal(organization.alternateName, "Buy Mesho");

  const website = graph.find((entry) => entry["@type"] === "WebSite");
  assert.ok(website);
  assert.equal(website.name, "BuyMesho");
});
