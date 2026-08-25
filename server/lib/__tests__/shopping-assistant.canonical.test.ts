import assert from "node:assert/strict";
import test from "node:test";
import { loadMarketplaceCandidates, shoppingAssistant } from "../shopping-assistant.js";

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
