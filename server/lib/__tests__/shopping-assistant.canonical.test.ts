import assert from "node:assert/strict";
import test from "node:test";
import { loadMarketplaceCandidates, normalizeAiResponse, shoppingAssistant } from "../shopping-assistant.js";

test("shopping assistant candidates come only from the canonical marketplace query", () => {
  let receivedSql = "";
  let receivedParams: unknown[] = [];
  const db = {
    prepare(sql: string) {
      receivedSql = sql;
      return {
        all(...params: unknown[]) {
          receivedParams = params;
          return [{ id: 101, name: "Canonical Laptop", category: "Electronics", price: 250000, description: "Canonical database listing", condition: "Used", university: "LUANAR", location: "Bunda" }];
        },
      };
    },
  };

  const result = loadMarketplaceCandidates(db, { query: "used laptop under 300k", university: "LUANAR", category: "Electronics", maxPrice: 300000, db });
  assert.deepEqual(result, [{ id: "101", name: "Canonical Laptop", category: "Electronics", price: 250000, description: "Canonical database listing", condition: "Used", university: "LUANAR" }]);
  assert.match(receivedSql, /FROM listings l/);
  assert.match(receivedSql, /l\.is_hidden = 0/);
  assert.match(receivedSql, /l\.deleted_at IS NULL/);
  assert.match(receivedSql, /LOWER\(l\.condition\) = LOWER\(\?\)/);
  assert.doesNotMatch(receivedSql, /l\.location/);
  assert.ok(receivedParams.includes("LUANAR"));
  assert.ok(receivedParams.includes("Electronics"));
  assert.ok(receivedParams.includes(300000));
  assert.ok(receivedParams.includes("Used"));
});

test("shopping assistant candidate loader filters explicit condition against the listing condition field", () => {
  let receivedSql = "";
  let receivedParams: unknown[] = [];
  const db = {
    prepare(sql: string) {
      receivedSql = sql;
      return {
        all(...params: unknown[]) {
          receivedParams = params;
          return [{ id: 202, name: "Used ThinkPad", category: "Electronics", price: 180000, description: "Laptop", condition: "Used", university: "LUANAR" }];
        },
      };
    },
  };

  const result = loadMarketplaceCandidates(db, { query: "find used laptops", db });
  assert.equal(result[0]?.condition, "Used");
  assert.match(receivedSql, /LOWER\(l\.condition\) = LOWER\(\?\)/);
  assert.ok(receivedParams.includes("Used"));
});

test("shopping assistant candidate loader returns no marketplace records without a server database", () => {
  assert.deepEqual(loadMarketplaceCandidates(undefined, { query: "laptop" }), []);
});

test("shopping assistant rejects an invalid mode before invoking AI", async () => {
  await assert.rejects(
    () => shoppingAssistant({ mode: "invalid" as never, query: "How does BuyMesho work?" }),
    /mode is invalid/,
  );
});

test("structured response normalization rejects untrusted recommendation IDs and actions", () => {
  const result = normalizeAiResponse(
    {
      reply: "Here are the matches.",
      intent: { type: "product_discovery", confidence: 4 },
      recommended_listing_ids: ["101", "999", "DROP TABLE listings"],
      match_reasons: { "101": "Canonical match", "999": "Injected match" },
      suggestions: [
        { id: "safe", label: "Show cheaper options", intent: "price_filter", action: "open_listing" },
        { id: "send", label: "Compare these", intent: "listing_comparison", action: "send_message" },
      ],
      context: { max_price: 300000, condition: "Used" },
    },
    { mode: "shop", query: "Find used laptops under 300k" },
    [{ id: "101", name: "Canonical Laptop", price: 250000, condition: "Used" }],
  );

  assert.equal(result.intent.type, "product_discovery");
  assert.equal(result.intent.confidence, 1);
  assert.deepEqual(result.recommended_listing_ids, ["101"]);
  assert.deepEqual(result.recommended_listings.map((listing) => listing.id), ["101"]);
  assert.equal(result.suggestions.length, 2);
  assert.equal(result.suggestions[0].action, "send_message");
  assert.equal(result.suggestions[0].label, "Show cheaper options");
});

test("structured response normalization safely falls back on malformed AI fields", () => {
  const result = normalizeAiResponse(
    { reply: 42, intent: { type: "not-real", confidence: "high" }, recommendations: "not-an-array", suggestions: [null, 4, { label: "Valid follow-up", intent: "seller_help", action: "switch_mode" }] },
    { mode: "ask", query: "How do I sell?" },
    [],
  );

  assert.equal(result.reply, "I couldn't generate a response from the current BuyMesho information.");
  assert.equal(result.intent.type, "general_help");
  assert.equal(result.intent.confidence, undefined);
  assert.deepEqual(result.recommendations, []);
  assert.deepEqual(result.suggestions, [{ id: "suggestion-3", label: "Valid follow-up", intent: "seller_help", action: "send_message" }]);
  assert.deepEqual(result.recommended_listing_ids, []);
});
