const API_CACHE_PREFIX = "__buymesho_api_cache_v2:";
export const API_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedResponse = {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
  timestamp: number;
};

function isPublicApiCacheable(url: string): boolean {
  const pathname = url.split("?", 1)[0];
  return (
    pathname === "/api/events" ||
    pathname === "/api/listings" ||
    pathname.startsWith("/api/events/") ||
    pathname.startsWith("/api/listings/")
  );
}

function getCacheKey(url: string) {
  return `${API_CACHE_PREFIX}${url}`;
}

export function readCachedApiResponse(url: string): CachedResponse | null {
  if (typeof window === "undefined" || !isPublicApiCacheable(url)) return null;

  try {
    const raw = localStorage.getItem(getCacheKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResponse;
    if (!parsed || typeof parsed.timestamp !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readCachedApiJson<T>(url: string): T | null {
  const cached = readCachedApiResponse(url);
  if (!cached) return null;

  try {
    return JSON.parse(cached.body) as T;
  } catch {
    return null;
  }
}

export function isCachedApiResponseFresh(url: string, ttlMs: number = API_CACHE_TTL_MS): boolean {
  const cached = readCachedApiResponse(url);
  if (!cached) return false;
  return Date.now() - cached.timestamp < ttlMs;
}

/**
 * Legacy cache cleanup only.
 * Authenticated seller/order/payout/connect API responses are no longer
 * persisted in browser storage.
 */
export function clearSensitiveApiCache(): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(API_CACHE_PREFIX)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) window.localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}
