import type { ListingMode } from "../types";

export type ListingPricingInput = {
  listing_mode?: ListingMode | null;
  price?: number | string | null;
  original_price?: number | string | null;
  discount_percent?: number | string | null;
  deal_label?: string | null;
  deal_expires_at?: string | null;
  is_wholesale?: boolean | number | string | null;
  can_sell_individually?: boolean | number | string | null;
  pack_size?: number | string | null;
  bulk_units?: string | null;
  single_item_price?: number | string | null;
  quantity?: number | string | null;
  sold_quantity?: number | string | null;
};

export type ListingPricingSummary = {
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  hasDeal: boolean;
  dealStatus: "none" | "active" | "expired";
  dealLabel: string | null;
  dealExpiresAt: string | null;
  dealExpiryLabel: string | null;
  isWholesale: boolean;
  canSellIndividually: boolean | null;
  packSize: number | null;
  bulkUnits: string | null;
  singleItemPrice: number | null;
  wholesalePackLabel: string | null;
  wholesaleQuantityLabel: string | null;
  availableQuantity: number | null;
  listingMode: ListingMode;
};

const booleanLikeStrings = new Set(["true", "1", "yes", "y", "on"]);

function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    return booleanLikeStrings.has(value.trim().toLowerCase());
  }
  return false;
}

function roundPercent(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

function formatDateLabel(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function formatMoney(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return `MK ${safeValue.toLocaleString()}`;
}

export function getListingPricing(input: ListingPricingInput): ListingPricingSummary {
  const listingMode: ListingMode =
    input.listing_mode === "deal" || input.listing_mode === "wholesale"
      ? input.listing_mode
      : "normal";

  const price = Math.max(0, toFiniteNumber(input.price) ?? 0);
  const explicitOriginalPrice = toFiniteNumber(input.original_price);
  const explicitDiscountPercent = toFiniteNumber(input.discount_percent);

  const inferredWholesale = toBoolean(input.is_wholesale);
  const isWholesale =
    listingMode === "wholesale" ? true : listingMode === "deal" ? false : inferredWholesale;

  const canSellIndividually =
    input.can_sell_individually === null || input.can_sell_individually === undefined
      ? null
      : toBoolean(input.can_sell_individually);

  const packSize = toFiniteNumber(input.pack_size);
  const bulkUnits = normalizeText(input.bulk_units);
  const singleItemPrice = toFiniteNumber(input.single_item_price);

  const quantity = toFiniteNumber(input.quantity);
  const soldQuantity = Math.max(0, toFiniteNumber(input.sold_quantity) ?? 0);
  const availableQuantity = quantity === null ? null : Math.max(0, quantity - soldQuantity);

  const dealExpiresAt = normalizeText(input.deal_expires_at);
  const parsedDealExpiresAt = dealExpiresAt ? new Date(dealExpiresAt) : null;
  const hasValidExpiry = !!parsedDealExpiresAt && !Number.isNaN(parsedDealExpiresAt.getTime());
  const isDealExpired = hasValidExpiry ? parsedDealExpiresAt!.getTime() < Date.now() : false;

  const originalPrice =
    listingMode === "deal"
      ? explicitOriginalPrice !== null && explicitOriginalPrice > price
        ? explicitOriginalPrice
        : null
      : explicitOriginalPrice !== null && explicitOriginalPrice > price
        ? explicitOriginalPrice
        : null;

  const discountPercent =
    listingMode === "deal"
      ? originalPrice !== null
        ? roundPercent(((originalPrice - price) / originalPrice) * 100)
        : explicitDiscountPercent !== null && explicitDiscountPercent > 0
          ? roundPercent(explicitDiscountPercent)
          : null
      : null;

  const dealStatus =
    listingMode === "deal" && discountPercent !== null && originalPrice !== null && originalPrice > price
      ? isDealExpired
        ? "expired"
        : "active"
      : "none";

  const hasDeal = dealStatus === "active";

  const dealLabel =
    listingMode === "deal"
      ? normalizeText(input.deal_label) ||
        (discountPercent !== null && discountPercent > 0 ? `${discountPercent}% off` : null)
      : null;

  const wholesalePackLabel =
    isWholesale && (packSize !== null || bulkUnits !== null)
      ? [
          packSize !== null ? `${packSize.toLocaleString()}` : null,
          bulkUnits,
        ]
          .filter(Boolean)
          .join(" ")
          .concat(" / pack")
      : null;

  const wholesaleQuantityLabel =
    isWholesale && availableQuantity !== null
      ? `${availableQuantity.toLocaleString()} ${availableQuantity === 1 ? "pack" : "packs"}`
      : null;

  return {
    price,
    originalPrice,
    discountPercent,
    hasDeal,
    dealStatus,
    dealLabel,
    dealExpiresAt,
    dealExpiryLabel: formatDateLabel(dealExpiresAt),
    isWholesale,
    canSellIndividually,
    packSize,
    bulkUnits,
    singleItemPrice,
    wholesalePackLabel,
    wholesaleQuantityLabel,
    availableQuantity,
    listingMode,
  };
}
