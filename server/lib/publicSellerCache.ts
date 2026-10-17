import { MemoryCache } from "@xhovile/platform/cache";

const PUBLIC_SELLER_CACHE_PREFIX = "buymesho:seller:";
const DIRECTORY_KEY = `${PUBLIC_SELLER_CACHE_PREFIX}directory`;
const PROFILE_PREFIX = `${PUBLIC_SELLER_CACHE_PREFIX}profile:`;
const LISTINGS_PREFIX = `${PUBLIC_SELLER_CACHE_PREFIX}listings:`;
const RATING_PREFIX = `${PUBLIC_SELLER_CACHE_PREFIX}rating:`;

export const PUBLIC_SELLER_CACHE_TTL_MS = 60_000;

const publicSellerCache = new MemoryCache({
  maxEntries: 500,
});

export function getPublicSellerDirectoryCacheKey(): string {
  return DIRECTORY_KEY;
}

export function getPublicSellerProfileCacheKey(uid: string): string {
  return PROFILE_PREFIX + uid;
}

export function getPublicSellerListingsCacheKey(uid: string): string {
  return LISTINGS_PREFIX + uid;
}

export function getPublicSellerRatingSummaryCacheKey(uid: string): string {
  return RATING_PREFIX + uid;
}

export function getCachedPublicSellerDirectory<T>(loader: () => Promise<T>): Promise<T> {
  return publicSellerCache.getOrSet(
    DIRECTORY_KEY,
    loader,
    { ttlMs: PUBLIC_SELLER_CACHE_TTL_MS },
  );
}

export function getCachedPublicSellerProfile<T>(
  uid: string,
  loader: () => Promise<T>,
): Promise<T> {
  return publicSellerCache.getOrSet(
    getPublicSellerProfileCacheKey(uid),
    loader,
    { ttlMs: PUBLIC_SELLER_CACHE_TTL_MS },
  );
}

export function getCachedPublicSellerListings<T>(
  uid: string,
  loader: () => Promise<T>,
): Promise<T> {
  return publicSellerCache.getOrSet(
    getPublicSellerListingsCacheKey(uid),
    loader,
    { ttlMs: PUBLIC_SELLER_CACHE_TTL_MS },
  );
}

export function getCachedPublicSellerRatingSummary<T>(
  uid: string,
  loader: () => Promise<T>,
): Promise<T> {
  return publicSellerCache.getOrSet(
    getPublicSellerRatingSummaryCacheKey(uid),
    loader,
    { ttlMs: PUBLIC_SELLER_CACHE_TTL_MS },
  );
}

export async function invalidatePublicSellerDirectory(): Promise<void> {
  await publicSellerCache.delete(DIRECTORY_KEY);
}

export async function invalidatePublicSellerProfile(uid: string): Promise<void> {
  await publicSellerCache.delete(getPublicSellerProfileCacheKey(uid));
}

export async function invalidatePublicSellerListings(uid: string): Promise<void> {
  await publicSellerCache.delete(getPublicSellerListingsCacheKey(uid));
}

export async function invalidatePublicSellerRatingSummary(uid: string): Promise<void> {
  await publicSellerCache.delete(getPublicSellerRatingSummaryCacheKey(uid));
}

export async function invalidatePublicSellerListingData(uid: string): Promise<void> {
  await Promise.all([
    invalidatePublicSellerDirectory(),
    invalidatePublicSellerListings(uid),
  ]);
}

export async function invalidatePublicSellerRatingData(uid: string): Promise<void> {
  await Promise.all([
    invalidatePublicSellerDirectory(),
    invalidatePublicSellerRatingSummary(uid),
  ]);
}

export async function invalidatePublicSeller(uid: string): Promise<void> {
  await Promise.all([
    invalidatePublicSellerDirectory(),
    invalidatePublicSellerProfile(uid),
    invalidatePublicSellerListings(uid),
    invalidatePublicSellerRatingSummary(uid),
  ]);
}

export async function clearPublicSellerCache(): Promise<void> {
  await publicSellerCache.clear();
}
