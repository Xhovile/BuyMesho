export type ListingPricingInput = {
  price?: number | string | null;
  original_price?: number | string | null;
  discount_percent?: number | string | null;
  deal_label?: string | null;
  is_wholesale?: boolean | number | string | null;
  pack_size?: number | string | null;
  bulk_units?: string | null;
  quantity?: number | string | null;
  sold_quantity?: number | string | null;
};

export type ListingPricingSummary = {
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
  hasDeal: boolean;
  dealLabel: string | null;
  isWholesale: boolean;
  packSize: number | null;
  bulkUnits: string | null;
  wholesalePackLabel: string | null;
  wholesaleQuantityLabel: string | null;
  availableQuantity: number | null;
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

export function formatMoney(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return `MK ${safeValue.toLocaleString()}`;
}

export function getListingPricing(input: ListingPricingInput): ListingPricingSummary {
  const price = Math.max(0, toFiniteNumber(input.price) ?? 0);
  const explicitOriginalPrice = toFiniteNumber(input.original_price);
  const explicitDiscountPercent = toFiniteNumber(input.discount_percent);
  const isWholesale = toBoolean(input.is_wholesale);
  const packSize = toFiniteNumber(input.pack_size);
  const bulkUnits = normalizeText(input.bulk_units);
  const quantity = toFiniteNumber(input.quantity);
  const soldQuantity = Math.max(0, toFiniteNumber(input.sold_quantity) ?? 0);
  const availableQuantity = quantity === null ? null : Math.max(0, quantity - soldQuantity);

  const computedOriginalPrice =
    explicitDiscountPercent !== null &&
    explicitDiscountPercent > 0 &&
    explicitDiscountPercent < 100 &&
    price > 0
      ? price / (1 - explicitDiscountPercent / 100)
      : null;

  const originalPrice =
    explicitOriginalPrice !== null && explicitOriginalPrice > price
      ? explicitOriginalPrice
      : computedOriginalPrice !== null && computedOriginalPrice > price
        ? computedOriginalPrice
        : null;

  const discountPercent =
    explicitDiscountPercent !== null && explicitDiscountPercent > 0
      ? roundPercent(explicitDiscountPercent)
      : originalPrice !== null
        ? roundPercent(((originalPrice - price) / originalPrice) * 100)
        : null;

  const hasDeal =
    discountPercent !== null && discountPercent > 0 && originalPrice !== null && originalPrice > price;

  const dealLabel =
    normalizeText(input.deal_label) || (hasDeal && discountPercent !== null ? `${discountPercent}% off` : null);

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
    dealLabel,
    isWholesale,
    packSize,
    bulkUnits,
    wholesalePackLabel,
    wholesaleQuantityLabel,
    availableQuantity,
  };
}
