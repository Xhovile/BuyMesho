const PERSISTENT_CACHE_PREFIX = "__buymesho_persistent_page_cache_v1:";
const DEFAULT_TTL_MS = 60 * 60 * 1000;

type CacheEnvelope<T> = {
  value: T;
  timestamp: number;
};

const memoryCache = new Map<string, CacheEnvelope<unknown>>();

function getCacheKey(key: string) {
  return `${PERSISTENT_CACHE_PREFIX}${key}`;
}

function isFresh(timestamp: number, ttlMs: number) {
  return Number.isFinite(timestamp) && Date.now() - timestamp <= ttlMs;
}

export function readPersistentPageCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  const memoryEntry = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  if (memoryEntry) {
    if (isFresh(memoryEntry.timestamp, ttlMs)) {
      return memoryEntry.value;
    }
    memoryCache.delete(key);
  }

  try {
    const raw = window.localStorage.getItem(getCacheKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T> | null;
    if (!parsed || typeof parsed.timestamp !== "number" || !isFresh(parsed.timestamp, ttlMs)) {
      window.localStorage.removeItem(getCacheKey(key));
      return null;
    }

    memoryCache.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

export function writePersistentPageCache<T>(key: string, value: T): void {
  const payload: CacheEnvelope<T> = {
    value,
    timestamp: Date.now(),
  };

  memoryCache.set(key, payload);

  try {
    window.localStorage.setItem(getCacheKey(key), JSON.stringify(payload));
  } catch {
    // Ignore storage failures; the in-memory cache still helps within the session.
  }
}

export function clearPersistentPageCache(key: string): void {
  memoryCache.delete(key);

  try {
    window.localStorage.removeItem(getCacheKey(key));
  } catch {
    // Ignore storage failures.
  }
}
