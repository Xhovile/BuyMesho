const HIDDEN_COLLECTIONS_EVENT = "buymesho:hidden-collections-updated";

const HIDDEN_SELLERS_KEY = "hiddenSellerUids";
const HIDDEN_LISTINGS_KEY = "hiddenListingIds";

function readJsonArray<T>(storageKey: string, itemGuard: (value: unknown) => value is T): T[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(itemGuard) : [];
  } catch {
    return [];
  }
}

function writeJsonArray(storageKey: string, values: Array<string | number>) {
  localStorage.setItem(storageKey, JSON.stringify(values));
  window.dispatchEvent(new CustomEvent(HIDDEN_COLLECTIONS_EVENT));
}

export function readHiddenSellerUids(): string[] {
  return readJsonArray(HIDDEN_SELLERS_KEY, (value): value is string => typeof value === "string");
}

export function readHiddenListingIds(): number[] {
  return readJsonArray(HIDDEN_LISTINGS_KEY, (value): value is number => Number.isInteger(value));
}

export function hideSellerUid(uid: string) {
  if (!uid) return;
  const current = readHiddenSellerUids();
  if (current.includes(uid)) return;
  writeJsonArray(HIDDEN_SELLERS_KEY, [...current, uid]);
}

export function unhideSellerUid(uid: string) {
  const next = readHiddenSellerUids().filter((value) => value !== uid);
  writeJsonArray(HIDDEN_SELLERS_KEY, next);
}

export function hideListingId(listingId: string | number) {
  const id = Number(listingId);
  if (!Number.isInteger(id)) return;
  const current = readHiddenListingIds();
  if (current.includes(id)) return;
  writeJsonArray(HIDDEN_LISTINGS_KEY, [...current, id]);
}

export function unhideListingId(listingId: string | number) {
  const id = Number(listingId);
  if (!Number.isInteger(id)) return;
  const next = readHiddenListingIds().filter((value) => value !== id);
  writeJsonArray(HIDDEN_LISTINGS_KEY, next);
}

export function subscribeToHiddenCollectionsChanges(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key === HIDDEN_SELLERS_KEY || event.key === HIDDEN_LISTINGS_KEY) {
      callback();
    }
  };

  const handleCustom = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(HIDDEN_COLLECTIONS_EVENT, handleCustom as EventListener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(HIDDEN_COLLECTIONS_EVENT, handleCustom as EventListener);
  };
}
