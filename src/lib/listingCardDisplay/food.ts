import { buildSpecsFromProfile, type DisplayFieldProfile, type ListingCardData, type ListingCardSpec } from "../listingCardDisplayShared";

const PROFILES: Record<string, DisplayFieldProfile> = {
  "Cooked Meals": [
    { key: "portion_size", label: "Portion" },
    { key: "main_base", label: "Base" },
    { key: "protein_type", label: "Protein" },
  ],
  Snacks: [
    { key: "snack_type", label: "Type", valueKeys: ["snack_type", "item_type"] },
    { key: "flavor", label: "Flavor" },
    { key: "quantity_weight", label: "Qty", valueKeys: ["quantity_weight", "quantity"] },
  ],
  Bakery: [
    { key: "bakery_product_type", label: "Type", valueKeys: ["bakery_product_type", "item_type"] },
    { key: "quantity_size", label: "Size", valueKeys: ["quantity_size", "quantity_weight"] },
    { key: "freshness_status", label: "Freshness" },
  ],
  Drinks: [
    { key: "drink_type", label: "Type", valueKeys: ["drink_type", "item_type"] },
    { key: "size_volume", label: "Size", valueKeys: ["size_volume", "quantity_weight"] },
    { key: "serving_state", label: "Serving", valueKeys: ["serving_state", "temperature_serving_state", "temperature"] },
  ],
  "Groceries & Pantry": [
    { key: "product_type", label: "Type", valueKeys: ["product_type", "pantry_type", "item_type"] },
    { key: "quantity_weight", label: "Qty" },
    { key: "expiry_best_before", label: "Best Before", valueKeys: ["expiry_best_before", "expiry_pack_date"] },
  ],
  "Fresh Produce & Protein": [
    { key: "produce_protein_type", label: "Type", valueKeys: ["produce_protein_type", "produce_type", "protein_type", "item_type"] },
    { key: "quantity_weight", label: "Qty" },
    { key: "freshness_grade", label: "Freshness", valueKeys: ["freshness_grade", "freshness_status"] },
  ],
};

export function getFoodCardSpecs(listing: ListingCardData): ListingCardSpec[] | null {
  const profile = listing.subcategory ? PROFILES[listing.subcategory] : null;
  return profile ? buildSpecsFromProfile(listing, profile) : null;
}
