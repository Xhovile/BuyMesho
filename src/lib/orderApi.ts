import { apiFetch } from "./api";
import { readBuyerPayments } from "./buyerState";
import { buildBuyerTickets } from "./buyerTickets";
import type { SellerOrderPayoutMetadata, SellerOrderPayoutStatus } from "../shared/types/payment";
import { maskAccountLast4 } from "../modules/payouts/masking";

type MaybeRecord = Record<string, unknown> | null | undefined;

export type SellerEscrowRecord = {
  id: string;
  orderId: string;
  state?: string;
  status?: string;
  balanceAmount?: number;
  totalAmount?: number;
  currency?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderBundle = {
  order: {
    id: string;
    status: string;
    buyerId?: string;
    buyer_id?: string;
    sellerId?: string;
    seller_id?: string;
    paymentReference?: string | null;
    paidAt?: string | null;
    fulfilledAt?: string | null;
    deliveryPeriodDays?: number | null;
    deliveryDeadline?: string | null;
    total?: { amount?: number; currency?: string };
    items?: Array<{
      kind?: "listing" | "event_ticket";
      listingId?: string;
      eventId?: string;
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
  "eligible", "queued", "processing", "pending", "held", "paid", "failed", "cancelled",
];

function pickString(...values: unknown[]): string | null {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}
function toLower(value: unknown): string { return String(value ?? "").trim().toLowerCase(); }
function normalizePayoutStatus(bundle: OrderBundle): SellerOrderPayoutStatus {
  const payoutStatus = toLower(bundle.payout?.status ?? bundle.order?.payoutStatus ?? bundle.order?.payout_status);
  if (PAYOUT_STATUSES.includes(payoutStatus as SellerOrderPayoutStatus)) return payoutStatus as SellerOrderPayoutStatus;
  const escrowState = toLower(bundle.escrow?.state ?? bundle.escrow?.status);
  if (escrowState === "released") return "eligible";
  if (escrowState === "refunded" || escrowState === "closed") return "cancelled";
  if (escrowState === "held") return "held";
  if (escrowState === "disputed") return "pending";
  if (escrowState) return "pending";
  return "unknown";
}
function normalizeTicketCode(value: string) { return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, ""); }
function normalizeShortTicketCode(value: string) { const match = value.match(/(?:^|[^a-z0-9])(?:order_|ord_)([a-z0-9]+)/i); return match?.[1] ? match[1].replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase() : normalizeTicketCode(value).slice(0, 6); }
function matchesTicketCode(candidate: string | null | undefined, normalizedInput: string) { if (!candidate) return false; const normalizedCandidate = normalizeTicketCode(candidate); const shortCandidate = normalizeShortTicketCode(candidate); return normalizedCandidate === normalizedInput || shortCandidate === normalizedInput || normalizedInput.endsWith(normalizedCandidate) || normalizedInput === shortCandidate; }
function normalizeDestinationMask(bundle: OrderBundle): string | null {
  const raw = pickString(bundle.payout?.destinationMask,bundle.payout?.destination_mask,bundle.payout?.payoutDestinationMask,bundle.payout?.payout_destination_mask,bundle.payout?.maskedDestination,bundle.payout?.masked_destination,(bundle.payout?.destination as MaybeRecord)?.maskedAccount);
  return raw ? maskAccountLast4(raw) : null;
}
export function getOrderPayoutMetadata(bundle: OrderBundle): SellerOrderPayoutMetadata {
  const paymentStatus = toLower(bundle.payment?.status ?? bundle.order?.status);
  const paymentCaptured = ["captured", "paid", "in_escrow", "fulfilled", "closed"].includes(paymentStatus);
  const escrowState = toLower(bundle.escrow?.state ?? bundle.escrow?.status) || "initiated";
  const payoutStatus = normalizePayoutStatus(bundle);
  return {
    paymentCaptured, escrowState,
    releaseEligibility: escrowState === "released" ? "eligible" : escrowState === "disputed" || escrowState === "held" ? "blocked" : paymentCaptured ? "awaiting_release" : "not_applicable",
    payoutStatus,
    estimatedPayoutDate: pickString(bundle.payout?.estimatedPayoutDate,bundle.payout?.estimated_payout_date,bundle.order?.estimatedPayoutDate,bundle.order?.estimated_payout_date),
    payoutDestinationMask: normalizeDestinationMask(bundle),
    destinationStatus: pickString(bundle.payout?.destinationStatus,bundle.payout?.destination_status),
    manualReviewPending: bundle.payout?.manualReviewPending === true || bundle.payout?.manual_review_pending === true,
    retryAllowed: typeof bundle.payout?.retryAllowed === "boolean" ? bundle.payout.retryAllowed : typeof bundle.payout?.retry_allowed === "boolean" ? bundle.payout.retry_allowed : null,
    verificationBlockers: Array.isArray(bundle.payout?.verificationBlockers) ? bundle.payout.verificationBlockers as string[] : Array.isArray(bundle.payout?.verification_blockers) ? bundle.payout.verification_blockers as string[] : null,
  };
}

export function getOrderDisputeEligibility(bundle: OrderBundle, now = new Date()): {
  eligible: boolean;
  phase: "delivery" | "escrow" | "post_delivery" | "expired" | "settled" | "active";
  eligibleAt: string | null;
  windowEndsAt: string | null;
  reason: string;
} {
  const disputeStatus = toLower(bundle.dispute?.status);
  if (bundle.dispute && !["resolved", "rejected", "closed"].includes(disputeStatus)) return { eligible: false, phase: "active", eligibleAt: null, windowEndsAt: null, reason: "This order already has an active dispute." };
  const orderStatus = toLower(bundle.order.status);
  const escrowState = toLower(bundle.escrow?.state ?? bundle.escrow?.status);
  const deliveryDeadlineRaw = bundle.order.deliveryDeadline;
  const deliveryDeadline = deliveryDeadlineRaw ? new Date(deliveryDeadlineRaw) : null;
  const fulfilledAtRaw = bundle.order.fulfilledAt ?? (typeof bundle.escrow?.updatedAt === "string" && escrowState === "released" ? bundle.escrow.updatedAt : null);
  const fulfilledAt = fulfilledAtRaw ? new Date(fulfilledAtRaw) : null;
  const released = escrowState === "released" || ["fulfilled", "closed"].includes(orderStatus);
  const settled = bundle.dispute && ["resolved", "closed"].includes(disputeStatus);
  if (settled) return { eligible: false, phase: "settled", eligibleAt: null, windowEndsAt: null, reason: "This order already has a settled dispute." };
  if (released) {
    if (!fulfilledAt || Number.isNaN(fulfilledAt.getTime())) return { eligible: false, phase: "expired", eligibleAt: null, windowEndsAt: null, reason: "Delivery confirmation date is unavailable." };
    const windowEndsAt = new Date(fulfilledAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (now.getTime() >= windowEndsAt.getTime()) return { eligible: false, phase: "expired", eligibleAt: fulfilledAt.toISOString(), windowEndsAt: windowEndsAt.toISOString(), reason: "The 30-day post-delivery dispute period has ended." };
    return { eligible: true, phase: "post_delivery", eligibleAt: fulfilledAt.toISOString(), windowEndsAt: windowEndsAt.toISOString(), reason: "You can report an issue within 30 days of confirmed delivery." };
  }
  if (deliveryDeadline && !Number.isNaN(deliveryDeadline.getTime()) && now.getTime() < deliveryDeadline.getTime()) return { eligible: false, phase: "delivery", eligibleAt: deliveryDeadline.toISOString(), windowEndsAt: null, reason: "The escrow dispute becomes available after the delivery period ends if delivery has not been confirmed." };
  return { eligible: true, phase: "escrow", eligibleAt: deliveryDeadline?.toISOString() ?? null, windowEndsAt: null, reason: "The delivery period has ended and escrow is still held. You may open a dispute." };
}

export async function fetchOrderByReference(reference: string): Promise<OrderBundle> {
  const trimmed = reference.trim();
  if (!trimmed) throw new Error("No order reference provided.");
  try { return await apiFetch(`/api/payments/orders/by-reference/${encodeURIComponent(trimmed)}`) as OrderBundle; }
  catch (firstError) { try { return await apiFetch(`/api/payments/orders/${encodeURIComponent(trimmed)}`) as OrderBundle; } catch { throw firstError; } }
}
export async function fetchOrderById(idOrReference: string): Promise<OrderBundle> { return apiFetch(`/api/payments/orders/${encodeURIComponent(idOrReference)}`) as Promise<OrderBundle>; }
export async function fetchMyOrders(): Promise<OrderBundle[]> { return apiFetch("/api/payments/orders/me") as Promise<OrderBundle[]>; }
export async function fetchSellerEscrows(): Promise<SellerEscrowRecord[]> { return apiFetch("/api/seller/escrows/me") as Promise<SellerEscrowRecord[]>; }
export async function openOrderDispute(orderId: string, reason: string): Promise<Record<string, unknown>> { return apiFetch("/api/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, reason }) }) as Promise<Record<string, unknown>>; }
export async function openTicketDispute(ticketId: string, reason: string): Promise<Record<string, unknown>> { return apiFetch("/api/disputes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId, reason }) }) as Promise<Record<string, unknown>>; }
export async function releaseOrderEscrow(orderId: string): Promise<Record<string, unknown>> { return apiFetch(`/api/escrow/${encodeURIComponent(orderId)}/release`, { method: "POST", timeoutMs: 40000 }) as Promise<Record<string, unknown>>; }
