import { buildSpecsFromProfile, type DisplayFieldProfile, type ListingCardData, type ListingCardSpec } from "../listingCardDisplayShared";

const PROFILES: Record<string, DisplayFieldProfile> = {
  Clothes: [
    { key: "item_type", label: "Type", valueKeys: ["item_type"] },
    { key: "size", label: "Size" },
    { key: "color", label: "Color" },
  ],
  Shoes: [
    { key: "shoe_type", label: "Type", valueKeys: ["shoe_type", "item_type"] },
    { key: "shoe_size", label: "Size", valueKeys: ["shoe_size", "size"] },
    { key: "color", label: "Color" },
  ],
  Bags: [
    { key: "bag_type", label: "Type", valueKeys: ["bag_type", "item_type"] },
    { key: "size_capacity", label: "Size", valueKeys: ["size_capacity", "capacity"] },
    { key: "color", label: "Color" },
  ],
  "Watches & Accessories": [
    { key: "item_type", label: "Type", valueKeys: ["item_type"] },
    { key: "brand", label: "Brand" },
    { key: "material", label: "Material", valueKeys: ["material", "condition"] },
  ],
};

export function getFashionCardSpecs(listing: ListingCardData): ListingCardSpec[] | null {
  const profile = listing.subcategory ? PROFILES[listing.subcategory] : null;
  return profile ? buildSpecsFromProfile(listing, profile) : null;
}
