export type HeaderCapabilities = {
  isSeller: boolean;
  isAdmin: boolean;
  updatedAt: number;
};

const CACHE_KEY_PREFIX = "bm:header-capabilities:";
const SELLER_CACHE_KEY_PREFIX = "bm:isSeller:";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function cacheKey(uid: string): string {
  return `${CACHE_KEY_PREFIX}${uid}`;
}

function getLegacySellerCache(uid: string): boolean {
  try {
    return window.localStorage.getItem(`${SELLER_CACHE_KEY_PREFIX}${uid}`) === "1";
  } catch {
    return false;
  }
}

export function getCachedHeaderCapabilities(uid: string): HeaderCapabilities | null {
  if (typeof window === "undefined" || !uid) return null;

  try {
    const raw = window.localStorage.getItem(cacheKey(uid));
    if (!raw) {
      const legacyIsSeller = getLegacySellerCache(uid);
      return legacyIsSeller ? { isSeller: true, isAdmin: false, updatedAt: 0 } : null;
    }

    const parsed = JSON.parse(raw) as Partial<HeaderCapabilities> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.isSeller !== "boolean" || typeof parsed.isAdmin !== "boolean" || typeof parsed.updatedAt !== "number") return null;
    if (parsed.updatedAt !== 0 && Date.now() - parsed.updatedAt > CACHE_MAX_AGE_MS) return null;

    return {
      isSeller: parsed.isSeller || getLegacySellerCache(uid),
      isAdmin: parsed.isAdmin,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export function setCachedHeaderCapabilities(uid: string, capabilities: Omit<HeaderCapabilities, "updatedAt">): void {
  if (typeof window === "undefined" || !uid) return;

  try {
    window.localStorage.setItem(cacheKey(uid), JSON.stringify({ ...capabilities, updatedAt: Date.now() } satisfies HeaderCapabilities));
  } catch {
    // Ignore storage errors; authorization never relies on this cache.
  }
}

export function clearCachedHeaderCapabilities(uid: string): void {
  if (typeof window === "undefined" || !uid) return;

  try {
    window.localStorage.removeItem(cacheKey(uid));
  } catch {
    // Ignore storage errors.
  }
}
