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

export const readBuyerCart = (): BuyerCartItem[] => readJson(BUYER_CART_KEY, []);
export const readBuyerPayments = (): BuyerPaymentRecord[] => readJson(BUYER_PAYMENTS_KEY, []);

export const setBuyerCartItem = (item: BuyerCartItem) => {
  writeJson(BUYER_CART_KEY, [item]);
};

export const clearBuyerCart = () => {
  localStorage.removeItem(BUYER_CART_KEY);
};

export const upsertBuyerPayment = (record: BuyerPaymentRecord) => {
  const current = readBuyerPayments();
  const index = current.findIndex((item) => item.reference === record.reference || (record.txRef && item.txRef === record.txRef));
  if (index >= 0) {
    current[index] = { ...current[index], ...record };
  } else {
    current.unshift(record);
  }
  writeJson(BUYER_PAYMENTS_KEY, current.slice(0, 20));
};

export const clearBuyerPaymentRecords = () => {
  localStorage.removeItem(BUYER_PAYMENTS_KEY);
};

export const touchBuyerPaymentFromCheckout = (record: Omit<BuyerPaymentRecord, "status" | "createdAt" | "updatedAt">) => {
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
  patch: Partial<BuyerPaymentRecord> & { status?: BuyerPaymentStatus }
) => {
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
  writeJson(BUYER_PAYMENTS_KEY, next);
};
