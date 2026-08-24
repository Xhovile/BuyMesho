import assert from "node:assert/strict";
import test from "node:test";
import { loadMarketplaceCandidates } from "../shopping-assistant.js";

test("shopping assistant candidates come only from the canonical marketplace query", () => {
  let receivedSql = "";
  let receivedParams: unknown[] = [];
  const db = {
    prepare(sql: string) {
      receivedSql = sql;
      return {
        all(...params: unknown[]) {
          receivedParams = params;
          return [
            {
              id: 101,
              name: "Canonical Laptop",
              category: "Electronics",
              price: 250000,
              description: "Canonical database listing",
              condition: "Used",
              university: "LUANAR",
              location: "Bunda",
            },
          ];
        },
      };
    },
  };

  const result = loadMarketplaceCandidates(db, {
    query: "laptop under 300k",
    university: "LUANAR",
    category: "Electronics",
    maxPrice: 300000,
    db,
  });

  assert.deepEqual(result, [
    {
      id: "101",
      name: "Canonical Laptop",
      category: "Electronics",
      price: 250000,
      description: "Canonical database listing",
      condition: "Used",
      university: "LUANAR",
      location: "Bunda",
    },
  ]);
  assert.match(receivedSql, /FROM listings l/);
  assert.match(receivedSql, /l\.is_hidden = 0/);
  assert.match(receivedSql, /l\.deleted_at IS NULL/);
  assert.ok(receivedParams.includes("LUANAR"));
  assert.ok(receivedParams.includes("Electronics"));
  assert.ok(receivedParams.includes(300000));
});

test("shopping assistant candidate loader returns no marketplace records without a server database", () => {
  assert.deepEqual(
    loadMarketplaceCandidates(undefined, { query: "laptop" }),
    [],
  );
});
