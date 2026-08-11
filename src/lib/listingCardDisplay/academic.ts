import { buildSpecsFromProfile, type DisplayFieldProfile, type ListingCardData, type ListingCardSpec } from "../listingCardDisplayShared";

const PROFILES: Record<string, DisplayFieldProfile> = {
  "Tutoring & Revision": [
    { key: "subject", label: "Subject", valueKeys: ["subject", "subject_areas"] },
    { key: "study_level", label: "Level" },
    { key: "delivery_mode", label: "Delivery" },
  ],
  "Notes & Study Materials": [
    { key: "subject", label: "Subject", valueKeys: ["subject", "subject_areas"] },
    { key: "material_type", label: "Type", valueKeys: ["material_type", "item_type"] },
    { key: "study_level", label: "Level" },
  ],
  "Printing & Document Services": [
    { key: "service_type", label: "Service", valueKeys: ["service_type", "item_type"] },
    { key: "page_count_quantity", label: "Pages", valueKeys: ["page_count_quantity", "page_count", "quantity"] },
    { key: "delivery_pickup_mode", label: "Delivery", valueKeys: ["delivery_pickup_mode", "delivery_mode"] },
  ],
  "Typing & Formatting": [
    { key: "service_type", label: "Service", valueKeys: ["service_type", "item_type"] },
    { key: "page_word_count", label: "Count", valueKeys: ["page_word_count", "page_count", "word_count"] },
    { key: "delivery_mode", label: "Delivery" },
  ],
  "Design & Presentation Support": [
    { key: "service_type", label: "Service", valueKeys: ["service_type", "design_type", "item_type"] },
    { key: "output_type", label: "Output", valueKeys: ["output_type", "file_type"] },
    { key: "delivery_mode", label: "Delivery" },
  ],
};

export function getAcademicCardSpecs(listing: ListingCardData): ListingCardSpec[] | null {
  const profile = listing.subcategory ? PROFILES[listing.subcategory] : null;
  return profile ? buildSpecsFromProfile(listing, profile) : null;
}
