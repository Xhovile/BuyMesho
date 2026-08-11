import type { Listing } from "../types";
import { apiFetch } from "./api";

const LISTING_DETAILS_FALLBACK_KEY = "__buymesho_listing_details_fallback";

export function saveListingDetailsFallback(listing: Listing) {
  if (typeof window === "undefined" || !listing?.id) return;

  try {
    sessionStorage.setItem(LISTING_DETAILS_FALLBACK_KEY, JSON.stringify(listing));
  } catch {
    // Ignore storage failures.
  }
}

function readListingDetailsFallback(listingId: string | number): Listing | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(LISTING_DETAILS_FALLBACK_KEY);
    if (!raw) return null;

    const listing = JSON.parse(raw) as Listing | null;
    return listing && String(listing.id) === String(listingId) ? listing : null;
  } catch {
    return null;
  }
}

function normalizeListingResponse(payload: any): Listing | null {
  if (!payload) return null;
  if (payload?.id) return payload as Listing;
  return null;
}

export async function fetchListingById(listingId: string | number): Promise<Listing | null> {
  try {
    const direct = await apiFetch(`/api/listings/${listingId}`);
    return normalizeListingResponse(direct);
  } catch (error) {
    console.error("Listing fetch failed", error);
    return readListingDetailsFallback(listingId);
  }
}

export async function fetchListingsByIds(listingIds: Array<string | number>): Promise<Listing[]> {
  const uniqueIds = Array.from(new Set(listingIds.map((value) => String(value))));
  const results = await Promise.allSettled(uniqueIds.map((id) => fetchListingById(id)));

  const listingMap = new Map<string, Listing>();
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      listingMap.set(String(uniqueIds[index]), result.value);
    }
  });

  return uniqueIds
    .map((id) => listingMap.get(String(id)) || null)
    .filter((item): item is Listing => Boolean(item));
}
