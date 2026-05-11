import { auth } from "../firebase";

const BUYER_CART_KEY = "__buymesho_buyer_cart";
const BUYER_PAYMENTS_KEY = "__buymesho_buyer_payments";

export type BuyerCartItem = {
  listingId: string;
  listingTitle: string;
  listingImage?: string | null;
  university?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  addedAt: string;
};

export type BuyerPaymentStatus = "pending" | "captured" | "failed" | "refunded" | "cancelled";

export type BuyerPaymentRecord = {
  reference: string;
  orderId: string | null;
  paymentId: string | null;
  listingId: string;
  listingIds?: string[];
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

const getScopedStorageKey = (baseKey: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return `${baseKey}_${uid}`;
};

const getBuyerCartKey = () => getScopedStorageKey(BUYER_CART_KEY);
const getBuyerPaymentsKey = () => getScopedStorageKey(BUYER_PAYMENTS_KEY);

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

export const setBuyerCartItem = (item: BuyerCartItem) => {
  const cartKey = getBuyerCartKey();
  if (!cartKey) return;

  const current = readBuyerCart();
  const index = current.findIndex((entry) => String(entry.listingId) === String(item.listingId));

  if (index >= 0) {
    current[index] = { ...current[index], ...item, addedAt: item.addedAt };
  } else {
    current.unshift(item);
  }

  writeJson(cartKey, current.slice(0, 20));
};

export const removeBuyerCartItem = (listingId: string) => {
  const cartKey = getBuyerCartKey();
  if (!cartKey) return;

  const current = readBuyerCart();
  writeJson(
    cartKey,
    current.filter((item) => String(item.listingId) !== String(listingId)),
  );
};

export const clearBuyerCart = () => {
  const key = getBuyerCartKey();
  if (!key) return;
  localStorage.removeItem(key);
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

  writeJson(paymentsKey, current.slice(0, 20));
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

  writeJson(paymentsKey, next);
};
