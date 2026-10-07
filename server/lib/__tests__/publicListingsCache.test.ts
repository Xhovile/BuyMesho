import assert from "node:assert/strict";
import test from "node:test";
import {
  getCachedPublicListings,
  getPublicListingsCacheKey,
  invalidatePublicListingsCache,
} from "../publicListingsCache.js";

test("coalesces concurrent loads for the same public listing URL", async () => {
  invalidatePublicListingsCache();
  let loads = 0;

  const loader = async () => {
    loads += 1;
    return { items: [{ id: 1 }] };
  };

  const [first, second] = await Promise.all([
    getCachedPublicListings("/api/listings?category=Food%20%26%20Snacks", loader),
    getCachedPublicListings("/api/listings?category=Food%20%26%20Snacks", loader),
  ]);

  assert.equal(loads, 1);
  assert.deepEqual(first, { items: [{ id: 1 }] });
  assert.deepEqual(second, { items: [{ id: 1 }] });
});

test("distinct URLs receive distinct cache keys", () => {
  assert.notEqual(
    getPublicListingsCacheKey("/api/listings?page=1"),
    getPublicListingsCacheKey("/api/listings?page=2"),
  );
});

test("invalidation forces the next load to execute again", async () => {
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

test("loader failures are not cached", async () => {
  invalidatePublicListingsCache();
  let loads = 0;

  await assert.rejects(
    getCachedPublicListings(
      "/api/listings?category=Food%20%26%20Snacks",
      async () => {
        loads += 1;
        throw new Error("database unavailable");
      },
    ),
    /database unavailable/,
  );

  const value = await getCachedPublicListings(
    "/api/listings?category=Food%20%26%20Snacks",
    async () => {
      loads += 1;
      return { items: [{ id: 2 }] };
    },
  );

  assert.equal(loads, 2);
  assert.deepEqual(value, { items: [{ id: 2 }] });
});
