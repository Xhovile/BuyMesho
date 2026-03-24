import type { Listing } from "../types";
import { apiFetch } from "./api";

function normalizeListingResponse(payload: any): Listing | null {
  if (!payload) return null;
  if (payload?.id) return payload as Listing;
  if (payload?.listing?.id) return payload.listing as Listing;
  if (payload?.item?.id) return payload.item as Listing;
  return null;
}

async function fetchListingByIdFromPages(listingId: string | number): Promise<Listing | null> {
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 20) {
    const data = await apiFetch(`/api/listings?page=${page}&pageSize=120`);
    const items = Array.isArray(data?.items) ? data.items : [];
    const found = items.find((item: Listing) => String(item.id) === String(listingId));
    if (found) return found;

    const nextTotalPages = Number(data?.totalPages || 0);
    if (nextTotalPages > 0) {
      totalPages = nextTotalPages;
    } else if (!items.length) {
      break;
    } else {
      totalPages = page + 1;
    }

    page += 1;
  }

  return null;
}

export async function fetchListingById(listingId: string | number): Promise<Listing | null> {
  try {
    const direct = await apiFetch(`/api/listings/${listingId}`);
    const normalized = normalizeListingResponse(direct);
    if (normalized) return normalized;
  } catch (error) {
    console.warn("Direct listing fetch failed, falling back to paginated search", error);
  }

  try {
    return await fetchListingByIdFromPages(listingId);
  } catch (error) {
    console.error("Fallback listing fetch failed", error);
    return null;
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
