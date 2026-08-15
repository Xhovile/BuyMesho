type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function getSellerCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const now = Date.now();
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (now - entry.storedAt >= ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setSellerCache<T>(key: string, value: T): void {
  memoryCache.set(key, { value, storedAt: Date.now() });
}

export function invalidateSellerCache(key: string): void {
  memoryCache.delete(key);
}
