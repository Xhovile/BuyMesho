type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const SESSION_CACHE_PREFIX = "__buymesho_seller_workspace_cache_v1:";

function storageKey(key: string) {
  return `${SESSION_CACHE_PREFIX}${key}`;
}

export function getSellerCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const now = Date.now();
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry) {
    if (now - memoryEntry.storedAt < ttlMs) return memoryEntry.value;
    memoryCache.delete(key);
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || typeof parsed.storedAt !== "number") return null;
    if (now - parsed.storedAt >= ttlMs) {
      window.sessionStorage.removeItem(storageKey(key));
      return null;
    }
    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

export function setSellerCache<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { value, storedAt: Date.now() };
  memoryCache.set(key, entry);
  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Ignore storage failures; memory cache still works.
  }
}

export function invalidateSellerCache(key: string): void {
  memoryCache.delete(key);
  try {
    window.sessionStorage.removeItem(storageKey(key));
  } catch {
    // Ignore storage failures.
  }
}
