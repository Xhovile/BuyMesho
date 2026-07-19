import { buildSpecsFromProfile, type DisplayFieldProfile, type ListingCardData, type ListingCardSpec } from "../listingCardDisplayShared";

const PROFILES: Record<string, DisplayFieldProfile> = {
  "Phones & Mobile Devices": [
    { key: "brand", label: "Brand" },
    { key: "ram_storage", label: "RAM / Storage", valueKeys: ["ram", "storage"], joinWith: "/" },
    { key: "sim_type", label: "SIM Type" },
  ],
  Computers: [
    { key: "brand", label: "Brand" },
    { key: "ram_storage", label: "RAM / Storage", valueKeys: ["ram", "storage_capacity", "storage"], joinWith: "/" },
    { key: "resolution", label: "Screen Resolution", valueKeys: ["resolution", "panel_type"] },
  ],
  Audio: [
    { key: "audio_product_type", label: "Type", valueKeys: ["audio_product_type", "item_type"] },
    { key: "connectivity_type", label: "Connectivity", valueKeys: ["connectivity_type", "connectivity"] },
    { key: "brand", label: "Brand" },
  ],
  "Power & Internet": [
    { key: "brand", label: "Brand" },
    { key: "capacity", label: "Capacity" },
    { key: "input_port_type", label: "Port Type" },
  ],
  "Power & Internet::Power Bank": [
    { key: "brand", label: "Brand" },
    { key: "capacity", label: "Capacity" },
    { key: "input_port_type", label: "Port Type" },
  ],
  "Power & Internet::Charger / Charging Adapter": [
    { key: "brand", label: "Brand" },
    { key: "charger_type", label: "Charger Type" },
    { key: "compatible_with", label: "Compatible With" },
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

function getPowerProfile(listing: ListingCardData): DisplayFieldProfile | null {
  if (listing.subcategory !== "Power & Internet") return null;

  if (listing.item_type === "Power Bank") {
    return PROFILES["Power & Internet::Power Bank"];
  }

  if (listing.item_type === "Charger / Charging Adapter") {
    return PROFILES["Power & Internet::Charger / Charging Adapter"];
  }

  return PROFILES["Power & Internet"];
}

export function getElectronicsCardSpecs(listing: ListingCardData): ListingCardSpec[] | null {
  const profile = getPowerProfile(listing) ?? (listing.subcategory ? PROFILES[listing.subcategory] : null);
  return profile ? buildSpecsFromProfile(listing, profile) : null;
}
