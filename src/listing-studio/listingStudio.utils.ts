import type { Listing, ListingDraft, ListingMode, UserProfile } from "../types";
import { CATEGORIES } from "../constants";
import { resolveUniversity } from "../lib/university";

export function createInitialListingDraft(userProfile?: UserProfile | null): ListingDraft {
  return {
    name: "",
    price: "",
    description: "",
    category: CATEGORIES[0],
    subcategory: "",
    item_type: "",
    spec_values: {},
    university: resolveUniversity(userProfile?.university),
    photos: [],
    video_url: "",
    status: "available",
    condition: "used",
    quantity: "1",
    sold_quantity: "0",
    listing_mode: "normal",
    original_price: "",
    discount_percent: "",
    deal_label: "",
    is_wholesale: false,
    pack_size: "",
    bulk_units: "",
  };
}

export function deriveListingMode(listing: Listing): ListingMode {
  if (listing.is_wholesale) return "wholesale";
  if (listing.original_price || listing.discount_percent) return "deal";
  return "normal";
}

export function listingToDraft(listing: Listing, fallbackUniversity?: string): ListingDraft {
  return {
    name: listing.name || "",
    price: String(listing.price ?? ""),
    description: listing.description || "",
    category: listing.category,
    subcategory: listing.subcategory || "",
    item_type: listing.item_type || "",
    spec_values: listing.spec_values || {},
    university: resolveUniversity(listing.university || fallbackUniversity),
    photos: Array.isArray(listing.photos) ? listing.photos : [],
    video_url: listing.video_url || "",
    status: listing.status || "available",
    condition: listing.condition || "used",
    quantity: String(listing.quantity ?? 1),
    sold_quantity: String(listing.sold_quantity ?? 0),
    listing_mode: listing.listing_mode || deriveListingMode(listing),
    original_price: listing.original_price ? String(listing.original_price) : "",
    discount_percent: listing.discount_percent ? String(listing.discount_percent) : "",
    deal_label: listing.deal_label || "",
    deal_expires_at: listing.deal_expires_at || "",
    is_wholesale: !!listing.is_wholesale,
    can_sell_individually: listing.can_sell_individually ?? undefined,
    pack_size: listing.pack_size ? String(listing.pack_size) : "",
    bulk_units: listing.bulk_units || "",
    single_item_price: listing.single_item_price ? String(listing.single_item_price) : "",
  };
}
