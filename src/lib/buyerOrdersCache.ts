import type { OrderBundle } from "./orderApi";

let cachedOrders: OrderBundle[] | null = null;

export function getCachedBuyerOrders(): OrderBundle[] | null {
  return cachedOrders ? cachedOrders.map((order) => ({ ...order })) : null;
}

export function setCachedBuyerOrders(orders: OrderBundle[]) {
  cachedOrders = Array.isArray(orders) ? orders.map((order) => ({ ...order })) : [];
}

export function hasCachedBuyerOrders() {
  return cachedOrders !== null;
}
