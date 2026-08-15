type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function storageKey(key: string): string {
  return `bm:seller-cache:${key}`;
}

export function getSellerCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const now = Date.now();
  const memoryEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memoryEntry && now - memoryEntry.storedAt < ttlMs) {
    return memoryEntry.value;
  }
  if (memoryEntry) memoryCache.delete(key);

  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || now - Number(parsed.storedAt) >= ttlMs) {
      sessionStorage.removeItem(storageKey(key));
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
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Ignore storage errors; in-memory caching still works for the session.
  }
}

export function invalidateSellerCache(key: string): void {
  memoryCache.delete(key);
  try {
    sessionStorage.removeItem(storageKey(key));
  } catch {
    // Ignore storage errors.
  }
}
