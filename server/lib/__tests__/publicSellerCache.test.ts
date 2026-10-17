import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPublicSellerCache,
  getCachedPublicSellerDirectory,
  getCachedPublicSellerListings,
  getCachedPublicSellerProfile,
  getCachedPublicSellerRatingSummary,
  getPublicSellerDirectoryCacheKey,
  getPublicSellerListingsCacheKey,
  getPublicSellerProfileCacheKey,
  getPublicSellerRatingSummaryCacheKey,
  invalidatePublicSellerDirectory,
  invalidatePublicSellerListings,
  invalidatePublicSellerProfile,
  invalidatePublicSellerRatingSummary,
} from "../publicSellerCache.js";

test("seller cache keys are separated by resource and seller", () => {
  assert.equal(
    getPublicSellerDirectoryCacheKey(),
    "buymesho:seller:directory",
  );
  assert.notEqual(
    getPublicSellerProfileCacheKey("seller-a"),
    getPublicSellerProfileCacheKey("seller-b"),
  );
  assert.notEqual(
    getPublicSellerListingsCacheKey("seller-a"),
    getPublicSellerRatingSummaryCacheKey("seller-a"),
  );
});

test("seller directory cache coalesces concurrent loads", async () => {
  await clearPublicSellerCache();
  let loads = 0;

  const loader = async () => {
    loads += 1;
    return { items: [{ uid: "seller-a" }] };
  };

  const [first, second] = await Promise.all([
    getCachedPublicSellerDirectory(loader),
    getCachedPublicSellerDirectory(loader),
  ]);

  assert.equal(loads, 1);
  assert.deepEqual(first, { items: [{ uid: "seller-a" }] });
  assert.deepEqual(second, { items: [{ uid: "seller-a" }] });
});

test("seller profile cache is isolated per seller", async () => {
  await clearPublicSellerCache();
  let loads = 0;

  const load = (uid: string) => getCachedPublicSellerProfile(uid, async () => {
    loads += 1;
    return { uid, business_name: `Business ${uid}` };
  });

  const first = await load("seller-a");
  const second = await load("seller-a");
  const third = await load("seller-b");

  assert.equal(loads, 2);
  assert.deepEqual(first, { uid: "seller-a", business_name: "Business seller-a" });
  assert.deepEqual(second, first);
  assert.deepEqual(third, { uid: "seller-b", business_name: "Business seller-b" });
});

test("seller listings and rating summary use independent keys", async () => {
  await clearPublicSellerCache();
  let listingLoads = 0;
  let ratingLoads = 0;

  const listingsLoader = async () => {
    listingLoads += 1;
    return [{ id: 1 }];
  };
  const ratingLoader = async () => {
    ratingLoads += 1;
    return { averageRating: 4.5, ratingCount: 2 };
  };

  await getCachedPublicSellerListings("seller-a", listingsLoader);
  await getCachedPublicSellerListings("seller-a", listingsLoader);
  await getCachedPublicSellerRatingSummary("seller-a", ratingLoader);
  await getCachedPublicSellerRatingSummary("seller-a", ratingLoader);

  assert.equal(listingLoads, 1);
  assert.equal(ratingLoads, 1);
});

test("targeted invalidation only forces the selected seller resource to reload", async () => {
  await clearPublicSellerCache();
  let sellerALoads = 0;
  let sellerBLoads = 0;

  const loadA = () => getCachedPublicSellerProfile("seller-a", async () => {
    sellerALoads += 1;
    return { uid: "seller-a", revision: sellerALoads };
  });
  const loadB = () => getCachedPublicSellerProfile("seller-b", async () => {
    sellerBLoads += 1;
    return { uid: "seller-b", revision: sellerBLoads };
  });

  await loadA();
  await loadB();
  await invalidatePublicSellerProfile("seller-a");
  const refreshedA = await loadA();
  const cachedB = await loadB();

  assert.equal(sellerALoads, 2);
  assert.equal(sellerBLoads, 1);
  assert.equal((refreshedA as any).revision, 2);
  assert.equal((cachedB as any).revision, 1);
});

test("directory, listings, and rating invalidation force reloads", async () => {
  await clearPublicSellerCache();
  let directoryLoads = 0;
  let listingLoads = 0;
  let ratingLoads = 0;

  const directoryLoader = async () => {
    directoryLoads += 1;
    return { revision: directoryLoads };
  };
  const listingsLoader = async () => {
    listingLoads += 1;
    return { revision: listingLoads };
  };
  const ratingLoader = async () => {
    ratingLoads += 1;
    return { revision: ratingLoads };
  };

  await getCachedPublicSellerDirectory(directoryLoader);
  await getCachedPublicSellerListings("seller-a", listingsLoader);
  await getCachedPublicSellerRatingSummary("seller-a", ratingLoader);

  await invalidatePublicSellerDirectory();
  await invalidatePublicSellerListings("seller-a");
  await invalidatePublicSellerRatingSummary("seller-a");

  await getCachedPublicSellerDirectory(directoryLoader);
  await getCachedPublicSellerListings("seller-a", listingsLoader);
  await getCachedPublicSellerRatingSummary("seller-a", ratingLoader);

  assert.equal(directoryLoads, 2);
  assert.equal(listingLoads, 2);
  assert.equal(ratingLoads, 2);
});

test("seller cache loader failures are not cached", async () => {
  await clearPublicSellerCache();
  let loads = 0;

  await assert.rejects(
    getCachedPublicSellerProfile("seller-a", async () => {
      loads += 1;
      throw new Error("database unavailable");
    }),
    /database unavailable/,
  );

  const value = await getCachedPublicSellerProfile("seller-a", async () => {
    loads += 1;
    return { uid: "seller-a" };
  });

  assert.equal(loads, 2);
  assert.deepEqual(value, { uid: "seller-a" });
});
