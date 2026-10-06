import assert from "node:assert/strict";
import test from "node:test";
import {
  getCachedPublicListings,
  getPublicListingsCacheKey,
  invalidatePublicListingsCache,
} from "../publicListingsCache.js";

test("coalesces public listing loads for the same URL", async () => {
  invalidatePublicListingsCache();
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return { items: [{ id: 1 }] };
  };
  const [first, second] = await Promise.all([
    getCachedPublicListings("/api/listings?category=Food", loader),
    getCachedPublicListings("/api/listings?category=Food", loader),
  ]);
  assert.equal(loads, 1);
  assert.deepEqual(first, { items: [{ id: 1 }] });
  assert.deepEqual(second, { items: [{ id: 1 }] });
});

test("uses distinct cache keys for distinct listing queries", () => {
  assert.notEqual(
    getPublicListingsCacheKey("/api/listings?page=1"),
    getPublicListingsCacheKey("/api/listings?page=2"),
  );
});

test("invalidation forces the next listing query to reload", async () => {
  invalidatePublicListingsCache();
  let loads = 0;
  const loader = async () => {
    loads += 1;
    return { items: [] };
  };
  await getCachedPublicListings("/api/listings?sortBy=newest", loader);
  await getCachedPublicListings("/api/listings?sortBy=newest", loader);
  assert.equal(loads, 1);
  invalidatePublicListingsCache();
  await getCachedPublicListings("/api/listings?sortBy=newest", loader);
  assert.equal(loads, 2);
});
