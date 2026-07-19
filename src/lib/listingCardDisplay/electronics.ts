import { buildSpecsFromProfile, type DisplayFieldProfile, type ListingCardData, type ListingCardSpec } from "../listingCardDisplayShared";

const PROFILES: Record<string, DisplayFieldProfile> = {
  "Phones & Mobile Devices": [
    { key: "ram", label: "RAM" },
    { key: "sim_type", label: "SIM" },
    { key: "brand", label: "Brand" },
  ],
  Computers: [
    { key: "brand", label: "Brand" },
    { key: "ram", label: "RAM" },
    { key: "operating_system", label: "OS" },
  ],
  Audio: [
    { key: "audio_product_type", label: "Type", valueKeys: ["audio_product_type", "item_type"] },
    { key: "connectivity_type", label: "Connectivity", valueKeys: ["connectivity_type", "connectivity"] },
    { key: "brand", label: "Brand" },
  ],
  "Power & Internet": [
    { key: "power_output", label: "Power", valueKeys: ["power_output", "capacity"] },
    { key: "network_support", label: "Network", valueKeys: ["network_support", "compatible_with"] },
    { key: "charger_type", label: "Charger", valueKeys: ["charger_type", "input_port_type"] },
  ],
  "Storage & Accessories": [
    { key: "storage_type", label: "Type", valueKeys: ["storage_type", "item_type"] },
    { key: "storage_capacity", label: "Capacity", valueKeys: ["storage_capacity", "capacity"] },
    { key: "compatibility", label: "Compatibility", valueKeys: ["compatibility", "compatible_with"] },
  ],
  "Practical Student Tools": [
    { key: "item_type", label: "Type", valueKeys: ["item_type"] },
    { key: "brand", label: "Brand" },
    { key: "power_battery_type", label: "Power", valueKeys: ["power_battery_type", "power_type", "battery_type"] },
  ],
};

export function getElectronicsCardSpecs(listing: ListingCardData): ListingCardSpec[] | null {
  const profile = listing.subcategory ? PROFILES[listing.subcategory] : null;
  return profile ? buildSpecsFromProfile(listing, profile) : null;
}
