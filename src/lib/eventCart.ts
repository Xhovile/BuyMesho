import { auth } from "../firebase";

const EVENT_CART_KEY = "__buymesho_event_cart";
const EVENT_CART_UPDATED_EVENT = "buymesho:event-cart-updated";

export type EventCartItem = {
  itemType: "event_ticket";
  eventId: string;
  eventTitle: string;
  organizerName: string;
  organizerUid: string | null;
  eventDate: string;
  startTime: string;
  venue: string;
  location: string;
  ticketPrice: number | null;
  ticketLink: string | null;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  addedAt: string;
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

const emitEventCartUpdated = () => {
  window.dispatchEvent(new CustomEvent(EVENT_CART_UPDATED_EVENT));
};

const getScopedStorageKey = (baseKey: string, userUid: string | null) => {
  if (!userUid) return null;
  return `${baseKey}_${userUid}`;
};

const getEventCartKey = (userUid: string | null) => getScopedStorageKey(EVENT_CART_KEY, userUid ?? auth.currentUser?.uid ?? null);

const readEventCartFromKey = (key: string | null) => {
  if (!key) return [] as EventCartItem[];
  return readJson<EventCartItem[]>(key, []);
};

const persistEventCart = (userUid: string, items: EventCartItem[]) => {
  const scopedKey = getEventCartKey(userUid);
  if (!scopedKey) return;
  writeJson(scopedKey, items.slice(0, 20));
  emitEventCartUpdated();
};

export const readEventCart = (userUid: string | null): EventCartItem[] => {
  return readEventCartFromKey(getEventCartKey(userUid));
};

export const subscribeToEventCartChanges = (listener: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key.startsWith(EVENT_CART_KEY)) {
      listener();
    }
  };

  window.addEventListener(EVENT_CART_UPDATED_EVENT, listener as EventListener);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(EVENT_CART_UPDATED_EVENT, listener as EventListener);
    window.removeEventListener("storage", handleStorage);
  };
};

export const upsertEventCartItem = (userUid: string, item: EventCartItem) => {
  const current = readEventCart(userUid);
  const next = current.filter((entry) => String(entry.eventId) !== String(item.eventId));
  next.unshift(item);
  persistEventCart(userUid, next);
};

export const removeEventCartItem = (userUid: string, eventId: string) => {
  const current = readEventCart(userUid);
  persistEventCart(userUid, current.filter((item) => String(item.eventId) !== String(eventId)));
};

export const subtractEventCartItemQuantities = async (
  userUid: string,
  purchases: Array<{ eventId: string; quantity: number }>,
) => {
  for (const purchase of purchases) {
    const current = readEventCart(userUid);
    const item = current.find((entry) => String(entry.eventId) === String(purchase.eventId));
    if (!item) continue;

    const remaining = Math.max(0, Math.floor(item.quantity) - Math.floor(purchase.quantity));
    if (remaining <= 0) {
      removeEventCartItem(userUid, purchase.eventId);
      continue;
    }

    upsertEventCartItem(userUid, {
      ...item,
      quantity: remaining,
      totalPrice: remaining * Number(item.unitPrice),
    });
  }
};

export const clearEventCart = (userUid: string) => {
  const scopedKey = getEventCartKey(userUid);
  if (!scopedKey) return;
  localStorage.removeItem(scopedKey);
  emitEventCartUpdated();
};
