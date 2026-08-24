import assert from "node:assert/strict";
import test from "node:test";
import { loadPricingComparables } from "../listing-ai-studio.js";

test("pricing comparables require complete identity-token coverage", () => {
  const db = {
    prepare() {
      return {
        all() {
          return [
            { id: 1, name: "Dell XPS 13 Laptop", category: "Electronics", condition: "Used", price: 300000 },
            { id: 2, name: "Dell XPS 13", category: "Electronics", condition: "Used", price: 350000 },
            { id: 3, name: "Dell Inspiron", category: "Electronics", condition: "Used", price: 250000 },
            { id: 4, name: "Phone Samsung", category: "Electronics", condition: "Used", price: 200000 },
            { id: 5, name: "Dell XPS 15", category: "Electronics", condition: "Used", price: 450000 },
          ];
        },
      };
    },
  };

  const result = loadPricingComparables(db, {
    name: "Dell XPS 13",
    category: "Electronics",
    condition: "Used",
  });

  assert.deepEqual(result.map((listing) => listing.id), ["1", "2"]);
  assert.equal(result.length, 2);
});

test("pricing comparables reject empty or unusable product names", () => {
  const db = {
    prepare() {
      throw new Error("database should not be queried");
    },
  };

  assert.deepEqual(
    loadPricingComparables(db, { name: "new used item", category: "Electronics" }),
    [],
  );
});
