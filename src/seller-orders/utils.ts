import type { DisputedFilter, FilterKey, OrderBundle } from "./types";

export const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "action_required", label: "Action Required" },
  { key: "escrow", label: "In Escrow" },
  { key: "delivered", label: "Delivered" },
  { key: "pending_delivery", label: "Pending Delivery" },
  { key: "disputed", label: "Disputed" },
];

export function money(order: OrderBundle["order"]): string {
  return `${order.currency} ${Number(order.total.amount).toLocaleString()}`;
}

export function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isSellerOrder(bundle: OrderBundle): boolean {
  return !["draft", "pending_payment"].includes(normalize(bundle.order.status));
}

export function isDelivered(bundle: OrderBundle): boolean {
  return (
    bundle.order.deliveryStatus === "delivered" ||
    ["fulfilled", "closed"].includes(normalize(bundle.order.status))
  );
}

export function isPendingDelivery(bundle: OrderBundle): boolean {
  return bundle.order.deliveryStatus === "pending_delivery" && !isDelivered(bundle);
}

export function isSettledDispute(bundle: OrderBundle): boolean {
  const status = normalize(bundle.dispute?.status ?? bundle.dispute?.state);
  const outcome = normalize(bundle.dispute?.outcome);
  const refundStatus = normalize(bundle.refundRequest?.status);
  const orderStatus = normalize(bundle.order.status);
  const escrowState = normalize(bundle.escrow?.state);

  return (
    ["resolved", "closed"].includes(status) ||
    [
      "refunded",
      "returned",
      "seller_refund_confirmed",
      "seller_refund_accepted",
      "return",
      "return_and_refund",
      "seller_replacement_confirmed",
      "seller_replacement_committed",
      "seller_rejected",
      "seller_dispute_rejected",
    ].includes(outcome) ||
    ["refunded", "returned", "settled"].includes(refundStatus) ||
    ["refunded", "returned"].includes(orderStatus) ||
    ["refunded", "returned"].includes(escrowState)
  );
}

export function hasDispute(bundle: OrderBundle): boolean {
  return Boolean(bundle.dispute?.id || bundle.dispute?.caseId || bundle.refundRequest?.id);
}

export function isPendingDispute(bundle: OrderBundle): boolean {
  if (!hasDispute(bundle) || isSettledDispute(bundle)) return false;

  const disputeStatus = normalize(bundle.dispute?.status ?? bundle.dispute?.state);
  const refundStatus = normalize(bundle.refundRequest?.status);

  return (
    ["open", "under_review", "awaiting_response"].includes(disputeStatus) ||
    ["requested", "under_review", "processing", "approved"].includes(refundStatus)
  );
}

export function isActionRequired(bundle: OrderBundle): boolean {
  if (
    !isSellerOrder(bundle) ||
    isDelivered(bundle) ||
    isPendingDelivery(bundle) ||
    isSettledDispute(bundle)
  ) {
    return false;
  }

  return bundle.order.deliveryStatus !== "delivered";
}

export function isEscrow(bundle: OrderBundle): boolean {
  if (isSettledDispute(bundle)) return false;

  const escrowState = normalize(bundle.escrow?.state);
  return (
    ["in_escrow", "funded", "held", "disputed"].includes(escrowState) ||
    normalize(bundle.order.status) === "in_escrow"
  );
}

export function settlementLabel(
  bundle: OrderBundle,
): "Refunded" | "Returned" | "Replacement" | "Rejected" | "Resolved" {
  const values = [
    normalize(bundle.dispute?.outcome),
    normalize(bundle.refundRequest?.status),
    normalize(bundle.order.status),
    normalize(bundle.escrow?.state),
  ];

  if (
    values.some((value) =>
      ["seller_replacement_confirmed", "seller_replacement_committed"].includes(value),
    )
  ) {
    return "Replacement";
  }
  if (values.some((value) => ["seller_rejected", "seller_dispute_rejected"].includes(value))) {
    return "Rejected";
  }
  if (values.some((value) => ["returned", "return"].includes(value))) return "Returned";
  if (
    values.some((value) =>
      [
        "refunded",
        "seller_refund_confirmed",
        "seller_refund_accepted",
        "refund",
        "return_and_refund",
        "settled",
      ].includes(value),
    )
  ) {
    return "Refunded";
  }

  return "Resolved";
}

export function matchesFilter(
  bundle: OrderBundle,
  filter: FilterKey,
  disputedFilter: DisputedFilter,
): boolean {
  if (!isSellerOrder(bundle)) return false;
  if (filter === "all") return true;
  if (filter === "action_required") return isActionRequired(bundle);
  if (filter === "escrow") return isEscrow(bundle);
  if (filter === "delivered") return isDelivered(bundle);
  if (filter === "pending_delivery") return isPendingDelivery(bundle);
  if (!hasDispute(bundle)) return false;
  if (disputedFilter === "pending") return isPendingDispute(bundle);
  if (disputedFilter === "settled") return isSettledDispute(bundle);
  return true;
}

export function getFilterCount(
  orders: OrderBundle[],
  filter: FilterKey,
  disputedFilter: DisputedFilter,
): number {
  return orders.filter((bundle) => matchesFilter(bundle, filter, disputedFilter)).length;
}

export function orderStatusLabel(bundle: OrderBundle): string {
  if (isSettledDispute(bundle)) return `Dispute — ${settlementLabel(bundle)}`;
  if (isPendingDispute(bundle)) return "Dispute Pending";
  if (bundle.order.deliveryStatus === "pending_delivery") return "Pending Delivery";
  if (isDelivered(bundle)) return "Delivered";
  if (isEscrow(bundle)) return "In Escrow";
  if (normalize(bundle.order.status) === "paid") return "Action Required";
  return bundle.order.status.replaceAll("_", " ");
}

export function requestedResolutionLabel(value: unknown): string {
  const normalized = normalize(value);
  if (normalized === "refund") return "Refund";
  if (normalized === "return") return "Return";
  if (normalized === "return_and_refund") return "Return + refund";
  return "BuyMesho review";
}
