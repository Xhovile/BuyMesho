import { apiFetch } from "./api";
import type { SellerOrderPayoutMetadata, SellerOrderPayoutStatus } from "../shared/types/payment";

export type OrderBundle = {
  order: {
    id: string;
    status: string;
    buyerId?: string;
    buyer_id?: string;
    sellerId?: string;
    seller_id?: string;
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
  payout?: Record<string, unknown> | null;
  dispute: Record<string, unknown> | null;
};

const PAYOUT_STATUSES: SellerOrderPayoutStatus[] = [
  "eligible",
  "queued",
  "processing",
  "pending",
  "held",
  "paid",
  "failed",
  "cancelled",
];

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function toLower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizePayoutStatus(bundle: OrderBundle): SellerOrderPayoutStatus {
  const payoutStatus = toLower(
    bundle.payout?.status ?? bundle.order?.payoutStatus ?? bundle.order?.payout_status,
  );
  if (PAYOUT_STATUSES.includes(payoutStatus as SellerOrderPayoutStatus)) {
    return payoutStatus as SellerOrderPayoutStatus;
  }

  const escrowState = toLower(bundle.escrow?.state ?? bundle.escrow?.status);
  if (escrowState === "released") return "eligible";
  if (escrowState === "refunded" || escrowState === "closed") return "cancelled";
  if (escrowState === "held") return "held";
  if (escrowState === "disputed") return "pending";
  if (escrowState) return "pending";
  return "unknown";
}

function normalizeDestinationMask(bundle: OrderBundle): string | null {
  const raw = pickString(
    bundle.payout?.destinationMask,
    bundle.payout?.destination_mask,
    bundle.payout?.payoutDestinationMask,
    bundle.payout?.payout_destination_mask,
    bundle.payout?.maskedDestination,
    bundle.payout?.masked_destination,
    (bundle.payout?.destination as Record<string, unknown> | undefined)
      ?.maskedAccount,
  );
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return null;
  return `•••• ${digits.slice(-4)}`;
}

export function getOrderPayoutMetadata(bundle: OrderBundle): SellerOrderPayoutMetadata {
  const paymentStatus = toLower(bundle.payment?.status ?? bundle.order?.status);
  const paymentCaptured = ["captured", "paid", "in_escrow", "fulfilled", "closed"].includes(paymentStatus);
  const escrowState = toLower(bundle.escrow?.state ?? bundle.escrow?.status) || "initiated";
  const payoutStatus = normalizePayoutStatus(bundle);

  const releaseEligibility =
    escrowState === "released"
      ? "eligible"
      : escrowState === "disputed" || escrowState === "held"
        ? "blocked"
        : paymentCaptured
          ? "awaiting_release"
          : "not_applicable";

  return {
    paymentCaptured,
    escrowState,
    releaseEligibility,
    payoutStatus,
    estimatedPayoutDate: pickString(
      bundle.payout?.estimatedPayoutDate,
      bundle.payout?.estimated_payout_date,
      bundle.order?.estimatedPayoutDate,
      bundle.order?.estimated_payout_date,
    ),
    payoutDestinationMask: normalizeDestinationMask(bundle),
    destinationStatus: pickString(
      bundle.payout?.destinationStatus,
      bundle.payout?.destination_status,
    ),
    manualReviewPending:
      bundle.payout?.manualReviewPending === true ||
      bundle.payout?.manual_review_pending === true,
    retryAllowed:
      typeof bundle.payout?.retryAllowed === "boolean"
        ? bundle.payout.retryAllowed
        : typeof bundle.payout?.retry_allowed === "boolean"
          ? bundle.payout.retry_allowed
          : null,
    verificationBlockers: Array.isArray(bundle.payout?.verificationBlockers)
      ? (bundle.payout?.verificationBlockers as string[])
      : Array.isArray(bundle.payout?.verification_blockers)
        ? (bundle.payout?.verification_blockers as string[])
        : null,
  };
}

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
