export type CartItemKind = "listing" | "event_ticket";

export type CartItemViewModel = {
  kind: CartItemKind;
  cartKey: string;
  itemId: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableQuantity?: number | null;
  addedAt: string;
};

export type CartCheckoutItem = {
  listingId?: string;
  eventId?: string;
  quantity: number;
};

export const getCartItemKey = (kind: CartItemKind, itemId: string) => `${kind}:${itemId}`;
