import { buildSpecsFromProfile, type DisplayFieldProfile, type ListingCardData, type ListingCardSpec } from "../listingCardDisplayShared";

const PROFILES: Record<string, DisplayFieldProfile> = {
  Skincare: [
    { key: "product_type", label: "Type", valueKeys: ["product_type", "item_type"] },
    { key: "skin_type", label: "Skin" },
    { key: "size_volume", label: "Size", valueKeys: ["size_volume", "size"] },
  ],
  Haircare: [
    { key: "product_type", label: "Type", valueKeys: ["product_type", "item_type"] },
    { key: "hair_type", label: "Hair" },
    { key: "size_volume", label: "Size", valueKeys: ["size_volume", "size"] },
  ],
  Makeup: [
    { key: "product_type", label: "Type", valueKeys: ["product_type", "item_type"] },
    { key: "shade_color", label: "Shade", valueKeys: ["shade_color", "shade_name", "color"] },
    { key: "size_volume", label: "Size", valueKeys: ["size_volume", "size"] },
  ],
  Fragrance: [
    { key: "fragrance_type", label: "Type", valueKeys: ["fragrance_type", "item_type"] },
    { key: "size_volume", label: "Size", valueKeys: ["size_volume", "size"] },
    { key: "scent_family", label: "Scent" },
  ],
  "Salon & Barber Services": [
    { key: "service_type", label: "Service", valueKeys: ["service_type", "item_type"] },
    { key: "service_duration", label: "Duration", valueKeys: ["service_duration", "duration_estimate"] },
    { key: "location_availability", label: "Location", valueKeys: ["location_availability", "availability"] },
  ],
};

export function getBeautyCardSpecs(listing: ListingCardData): ListingCardSpec[] | null {
  const profile = listing.subcategory ? PROFILES[listing.subcategory] : null;
  return profile ? buildSpecsFromProfile(listing, profile) : null;
}
