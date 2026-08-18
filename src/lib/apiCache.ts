const API_CACHE_PREFIX = "__buymesho_api_cache_v2:";

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
