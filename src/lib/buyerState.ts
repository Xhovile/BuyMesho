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

const readCartFromKey = (key: string | null) => {
  if (!key) return [] as BuyerCartItem[];
  return readJson<BuyerCartItem[]>(key, []);
};

const readPaymentsFromKey = (key: string | null) => {
  if (!key) return [] as BuyerPaymentRecord[];
  return readJson<BuyerPaymentRecord[]>(key, []);
};

const cacheBuyerCart = (items: BuyerCartItem[]) => {
  const scopedKey = getBuyerCartKey();
  if (!scopedKey) return;
  writeJson(scopedKey, items.slice(0, 20));
  emitBuyerCartUpdated();
};

const cacheBuyerPayments = (records: BuyerPaymentRecord[]) => {
  const scopedKey = getBuyerPaymentsKey();
  if (!scopedKey) return;
  writeJson(scopedKey, records.slice(0, 20));
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
  return readCartFromKey(getBuyerCartKey());
};

export const readBuyerPayments = (): BuyerPaymentRecord[] => {
  return readPaymentsFromKey(getBuyerPaymentsKey());
};

export const refreshBuyerCartFromServer = async () => {
  const scopedKey = getBuyerCartKey();
  if (!scopedKey) return [] as BuyerCartItem[];

  const localItems = readBuyerCart();

  try {
    const result = await apiFetch("/api/cart");
    const serverItems = Array.isArray(result?.items) ? (result.items as BuyerCartItem[]) : [];
    cacheBuyerCart(serverItems);
    return serverItems;
  } catch (error) {
    console.warn("Cart refresh failed, using local snapshot:", error);
    return localItems;
  }
};

export const setBuyerCartItem = async (item: BuyerCartItem) => {
  const scopedKey = getBuyerCartKey();
  if (!scopedKey) {
    throw new Error("Please log in again before using your cart.");
  }

  await apiFetch("/api/cart/items", {
    method: "POST",
    body: JSON.stringify({
      listingId: item.listingId,
      quantity: item.quantity,
    }),
  });

  await refreshBuyerCartFromServer();
};

export const updateBuyerCartItemQuantity = async (listingId: string, quantity: number) => {
  const scopedKey = getBuyerCartKey();
  if (!scopedKey) {
    throw new Error("Please log in again before updating your cart.");
  }

  await apiFetch(`/api/cart/items/${encodeURIComponent(listingId)}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });

  await refreshBuyerCartFromServer();
};

export const removeBuyerCartItem = async (listingId: string) => {
  const scopedKey = getBuyerCartKey();
  if (!scopedKey) {
    throw new Error("Please log in again before updating your cart.");
  }

  await apiFetch(`/api/cart/items/${encodeURIComponent(listingId)}`, {
    method: "DELETE",
  });

  await refreshBuyerCartFromServer();
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
  const scopedKey = getBuyerCartKey();
  if (!scopedKey) {
    throw new Error("Please log in again before clearing your cart.");
  }

  localStorage.removeItem(scopedKey);
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
  const scopedKey = getBuyerPaymentsKey();
  if (!scopedKey) return;

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
  const scopedKey = getBuyerPaymentsKey();
  if (!scopedKey) return;
  localStorage.removeItem(scopedKey);
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
  const scopedKey = getBuyerPaymentsKey();
  if (!scopedKey) return;

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
