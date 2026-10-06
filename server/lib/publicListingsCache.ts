import { MemoryCache } from "@xhovile/platform/cache";

const PUBLIC_LISTINGS_CACHE_PREFIX = "public:listings:";
export const PUBLIC_LISTINGS_CACHE_TTL_MS = 60_000;

const publicListingsCache = new MemoryCache({
  maxEntries: 500,
});

export function getPublicListingsCacheKey(url: string): string {
  return PUBLIC_LISTINGS_CACHE_PREFIX + url;
}

export function getCachedPublicListings<T>(
  url: string,
  loader: () => Promise<T>,
): Promise<T> {
  return publicListingsCache.getOrSet(
    getPublicListingsCacheKey(url),
    loader,
    { ttlMs: PUBLIC_LISTINGS_CACHE_TTL_MS },
  );
}

export function invalidatePublicListingsCache(): void {
  void publicListingsCache.invalidate(PUBLIC_LISTINGS_CACHE_PREFIX);
}
