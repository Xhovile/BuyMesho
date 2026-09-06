import type { ListingDraft } from "../types";

const STORAGE_PREFIX = "buymesho:listing-draft:";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadListingDraft(key: string, fallback: ListingDraft): ListingDraft {
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const raw = storage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<ListingDraft>;
    if (!parsed || typeof parsed !== "object") return fallback;

    return {
      ...fallback,
      ...parsed,
      spec_values:
        parsed.spec_values && typeof parsed.spec_values === "object"
          ? parsed.spec_values
          : fallback.spec_values,
      photos: Array.isArray(parsed.photos) ? parsed.photos : fallback.photos,
    };
  } catch {
    return fallback;
  }
}

export function saveListingDraft(key: string, draft: ListingDraft): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(draft));
  } catch {
    // Local persistence is best-effort and must never interrupt listing submission.
  }
}

export function clearListingDraft(key: string): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(`${STORAGE_PREFIX}${key}`);
  } catch {
    // Local persistence is best-effort and must never interrupt listing submission.
  }
}
