import { auth } from "../firebase";
import { apiFetch } from "./api";

const BUYER_CART_KEY = "__buymesho_buyer_cart";
const BUYER_PAYMENTS_KEY = "__buymesho_buyer_payments";
const BUYER_CART_UPDATED_EVENT = "buymesho:buyer-cart-updated";

export type BuyerCartItem = {
  listingId: string;
  listingTitle: string;
  listingImage?: string | null;
  listingDescription?: string | null;
  university?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableQuantity?: number | null;
  addedAt: string;
};

export type BuyerPaymentStatus = "pending" | "captured" | "failed" | "refunded" | "cancelled";

export type BuyerPaymentRecord = {
  reference: string;
  orderId: string | null;
  paymentId: string | null;
  listingId: string;
  listingIds?: string[];
  checkoutItems?: Array<{ listingId: string; quantity: number }>;
  listingTitle: string;
  quantity: number;
  totalPrice: number;
  status: BuyerPaymentStatus;
  checkoutUrl: string | null;
  txRef: string | null;
  deliveryConfirmed?: boolean;
  createdAt: string;
  updatedAt: string;
};

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const emitBuyerCartUpdated = () => {
  window.dispatchEvent(new CustomEvent(BUYER_CART_UPDATED_EVENT));
};

const getScopedStorageKey = (baseKey: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return `${baseKey}_${uid}`;
};

const getBuyerCartKey = () => getScopedStorageKey(BUYER_CART_KEY);
const getBuyerPaymentsKey = () => getScopedStorageKey(BUYER_PAYMENTS_KEY);

const cacheBuyerCart = (items: BuyerCartItem[]) => {
  const key = getBuyerCartKey();
  if (!key) return;
  writeJson(key, items.slice(0, 20));
  emitBuyerCartUpdated();
};

const cacheBuyerPayments = (records: BuyerPaymentRecord[]) => {
  const key = getBuyerPaymentsKey();
  if (!key) return;
  writeJson(key, records.slice(0, 20));
};

const upsertCartItemLocally = (item: BuyerCartItem) => {
  const current = readBuyerCart();
  const index = current.findIndex((entry) => String(entry.listingId) === String(item.listingId));

  if (index >= 0) {
    current[index] = { ...current[index], ...item };
  } else {
    current.unshift(item);
  }

  cacheBuyerCart(current);
};

const removeCartItemLocally = (listingId: string) => {
  const current = readBuyerCart();
  cacheBuyerCart(current.filter((item) => String(item.listingId) !== String(listingId)));
};

export const readBuyerCart = (): BuyerCartItem[] => {
  const key = getBuyerCartKey();
  if (!key) return [];
  return readJson(key, []);
};

export const readBuyerPayments = (): BuyerPaymentRecord[] => {
  const key = getBuyerPaymentsKey();
  if (!key) return [];
  return readJson(key, []);
};

export const refreshBuyerCartFromServer = async () => {
  const key = getBuyerCartKey();
  if (!key) return [];

  const localItems = readBuyerCart();
  const result = await apiFetch("/api/cart");
  const serverItems = Array.isArray(result?.items) ? (result.items as BuyerCartItem[]) : [];

  if (serverItems.length > 0) {
    cacheBuyerCart(serverItems);
    return serverItems;
  }

  if (localItems.length > 0) {
    return localItems;
  }

  cacheBuyerCart([]);
  return [];
};

export const setBuyerCartItem = async (item: BuyerCartItem) => {
  const key = getBuyerCartKey();
  if (!key) {
    throw new Error("Please log in again before using your cart.");
  }

  upsertCartItemLocally(item);

  try {
    await apiFetch("/api/cart/items", {
      method: "POST",
      body: JSON.stringify({
        listingId: item.listingId,
        quantity: item.quantity,
      }),
    });

    await refreshBuyerCartFromServer();
  } catch (error) {
    console.warn("Cart sync failed, keeping local cart state:", error);
  }
};

export const updateBuyerCartItemQuantity = async (listingId: string, quantity: number) => {
  const key = getBuyerCartKey();
  if (!key) {
    throw new Error("Please log in again before updating your cart.");
  }

  const current = readBuyerCart();
  const index = current.findIndex((entry) => String(entry.listingId) === String(listingId));
  if (index >= 0) {
    current[index] = {
      ...current[index],
      quantity,
      totalPrice: quantity * Number(current[index].unitPrice),
    };
    cacheBuyerCart(current);
  }

  try {
    await apiFetch(`/api/cart/items/${encodeURIComponent(listingId)}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });

    await refreshBuyerCartFromServer();
  } catch (error) {
    console.warn("Cart quantity sync failed, keeping local cart state:", error);
  }
};

export const removeBuyerCartItem = async (listingId: string) => {
  const key = getBuyerCartKey();
  if (!key) {
    throw new Error("Please log in again before updating your cart.");
  }

  removeCartItemLocally(listingId);

  try {
    await apiFetch(`/api/cart/items/${encodeURIComponent(listingId)}`, {
      method: "DELETE",
    });

    await refreshBuyerCartFromServer();
  } catch (error) {
    console.warn("Cart removal sync failed, keeping local cart state:", error);
  }
};

export const removeBuyerCartItems = async (listingIds: string[]) => {
  for (const listingId of listingIds) {
    await removeBuyerCartItem(listingId);
  }
};

export const subtractBuyerCartItemQuantities = async (
  purchases: Array<{ listingId: string; quantity: number }>,
) => {
  for (const purchase of purchases) {
    const current = readBuyerCart();
    const item = current.find((entry) => String(entry.listingId) === String(purchase.listingId));
    if (!item) continue;

    const remaining = Math.max(0, Math.floor(item.quantity) - Math.floor(purchase.quantity));
    if (remaining <= 0) {
      await removeBuyerCartItem(purchase.listingId);
      continue;
    }

    await updateBuyerCartItemQuantity(purchase.listingId, remaining);
  }
};

export const clearBuyerCart = async () => {
  const key = getBuyerCartKey();
  if (!key) {
    throw new Error("Please log in again before clearing your cart.");
  }

  localStorage.removeItem(key);
  emitBuyerCartUpdated();

  try {
    await apiFetch("/api/cart", { method: "DELETE" });
  } catch (error) {
    console.warn("Cart clear sync failed, keeping local cart cleared:", error);
  }
};

export const subscribeToBuyerCartChanges = (listener: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(BUYER_CART_KEY)) {
      listener();
    }
  };

  window.addEventListener(BUYER_CART_UPDATED_EVENT, listener as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(BUYER_CART_UPDATED_EVENT, listener as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
};

export const upsertBuyerPayment = (record: BuyerPaymentRecord) => {
  const paymentsKey = getBuyerPaymentsKey();
  if (!paymentsKey) return;

  const current = readBuyerPayments();
  const index = current.findIndex(
    (item) => item.reference === record.reference || (record.txRef && item.txRef === record.txRef),
  );

  if (index >= 0) {
    current[index] = { ...current[index], ...record };
  } else {
    current.unshift(record);
  }

  cacheBuyerPayments(current);
};

export const clearBuyerPaymentRecords = () => {
  const key = getBuyerPaymentsKey();
  if (!key) return;
  localStorage.removeItem(key);
};

export const touchBuyerPaymentFromCheckout = (
  record: Omit<BuyerPaymentRecord, "status" | "createdAt" | "updatedAt">,
) => {
  const now = new Date().toISOString();
  upsertBuyerPayment({
    ...record,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
};

export const updateBuyerPaymentStatus = (
  reference: string,
  patch: Partial<BuyerPaymentRecord> & { status?: BuyerPaymentStatus },
) => {
  const paymentsKey = getBuyerPaymentsKey();
  if (!paymentsKey) return;

  const current = readBuyerPayments();
  const next = current.map((item) =>
    item.reference === reference || (patch.txRef && item.txRef === patch.txRef)
      ? {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
        }
      : item,
  );

  cacheBuyerPayments(next);
};
