import { apiFetch } from "./api";

export type OrderBundle = {
  order: {
    id: string;
    status: string;
    paymentReference?: string | null;
    total?: { amount?: number; currency?: string };
    items?: Array<{
      listingId?: string;
      title?: string;
      quantity?: number;
      unitPrice?: { amount?: number; currency?: string };
      reference?: string;
    }>;
    [key: string]: unknown;
  };
  payment: Record<string, unknown> | null;
  escrow: Record<string, unknown> | null;
  dispute: Record<string, unknown> | null;
};

export async function fetchOrderByReference(reference: string): Promise<OrderBundle> {
  return apiFetch(`/api/payments/orders/by-reference/${encodeURIComponent(reference)}`) as Promise<OrderBundle>;
}

export async function fetchOrderById(idOrReference: string): Promise<OrderBundle> {
  return apiFetch(`/api/payments/orders/${encodeURIComponent(idOrReference)}`) as Promise<OrderBundle>;
}

export async function fetchMyOrders(): Promise<OrderBundle[]> {
  return apiFetch("/api/payments/orders/me") as Promise<OrderBundle[]>;
}

export async function openOrderDispute(orderId: string, reason: string): Promise<Record<string, unknown>> {
  return apiFetch("/api/disputes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, reason }),
  }) as Promise<Record<string, unknown>>;
}

export async function releaseOrderEscrow(orderId: string): Promise<Record<string, unknown>> {
  return apiFetch(`/api/escrow/${encodeURIComponent(orderId)}/release`, {
    method: "POST",
  }) as Promise<Record<string, unknown>>;
}
