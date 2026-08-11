const SAVED_LISTINGS_EVENT = "buymesho:saved-listings-updated";

export function getSavedStorageKey(userUid?: string | null) {
  return userUid ? `savedListingIds:${userUid}` : "savedListingIds:guest";
}

export function readSavedListingIds(userUid?: string | null): number[] {
  try {
    const storageKey = getSavedStorageKey(userUid);
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => Number.isInteger(value))
      : [];
  } catch {
    return [];
  }
}

export function readAllSavedListingIds(): number[] {
  try {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith("savedListingIds:"));
    const saved = new Set<number>();
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        parsed.forEach((value) => {
          if (Number.isInteger(value)) saved.add(value);
        });
      }
    });
    return Array.from(saved);
  } catch {
    return [];
  }
}

function writeSavedListingIds(storageKey: string, ids: number[]) {
  localStorage.setItem(storageKey, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(SAVED_LISTINGS_EVENT));
}

export function isListingSaved(listingId: string | number, userUid?: string | null) {
  const ids = readSavedListingIds(userUid);
  return ids.includes(Number(listingId));
}

export function toggleSavedListingId(listingId: string | number, userUid?: string | null) {
  const id = Number(listingId);
  const storageKey = getSavedStorageKey(userUid);
  const current = readSavedListingIds(userUid);
  const next = current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id];

  writeSavedListingIds(storageKey, next);
  return next.includes(id);
}

export function subscribeToSavedListingChanges(callback: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith("savedListingIds:")) {
      callback();
    }
  };

  const handleCustom = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(SAVED_LISTINGS_EVENT, handleCustom as EventListener);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(SAVED_LISTINGS_EVENT, handleCustom as EventListener);
  };
}
