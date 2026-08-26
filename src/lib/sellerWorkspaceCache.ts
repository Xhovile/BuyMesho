import { auth } from "../firebase";

type CacheEntry<T> = {
  value: T;
  storedAt: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const CACHE_PREFIX = "buymesho:seller-workspace:";

function normalizeKey(key: string): string {
  const uid = auth.currentUser?.uid ?? "";
  if (key === "orders") return "api:orders";
  if (key === "listings" && uid) return `api:seller:${uid}:listings`;
  if (key === "profile" && uid) return `api:seller:${uid}:profile`;
  return key;
}

function scopedKey(key: string) {
  const uid = auth.currentUser?.uid ?? "anonymous";
  return `${CACHE_PREFIX}${uid}:${normalizeKey(key)}`;
}

export function getSellerCache<T>(key: string): T | null {
  const entry = memoryCache.get(scopedKey(key)) as CacheEntry<T> | undefined;
  return entry?.value ?? null;
}

export function setSellerCache<T>(key: string, value: T): void {
  memoryCache.set(scopedKey(key), { value, storedAt: Date.now() });
}

export function invalidateSellerCache(key: string): void {
  memoryCache.delete(scopedKey(key));
}
