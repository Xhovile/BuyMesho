import assert from "node:assert/strict";
import test from "node:test";
import { buildPayoutOrderTitle } from "./order-title.js";

test("buildPayoutOrderTitle formats a single item", () => {
  assert.equal(buildPayoutOrderTitle([{ title: "Samsung Galaxy A15", quantity: 1 }]), "Samsung Galaxy A15");
});

test("buildPayoutOrderTitle combines repeated items into quantity buckets", () => {
  assert.equal(
    buildPayoutOrderTitle([
      { title: "Samsung Galaxy A15", quantity: 1 },
      { title: "Samsung Galaxy A15", quantity: 2 },
    ]),
    "Samsung Galaxy A15 ×3",
  );
});

test("buildPayoutOrderTitle preserves mixed-checkout display behavior", () => {
  assert.equal(
    buildPayoutOrderTitle([
      { title: "Samsung Galaxy A15", quantity: 1 },
      { title: "Air Max", quantity: 1 },
      { title: "T-shirt", quantity: 1 },
      { title: "Cap", quantity: 1 },
    ]),
    "Samsung Galaxy A15, Air Max +2 more",
  );
});

test("buildPayoutOrderTitle parses serialized order items", () => {
  assert.equal(
    buildPayoutOrderTitle(JSON.stringify([{ title: "Samsung Galaxy A15", quantity: 1 }])),
    "Samsung Galaxy A15",
  );
});
