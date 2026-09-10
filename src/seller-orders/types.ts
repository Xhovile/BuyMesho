export type BuyerDetails = {
  fullName: string;
  phone: string;
  addressLine: string;
  area: string;
  townOrDistrict: string;
  landmark: string;
} | null;

export type DeliveryStatus = "action_required" | "pending_delivery" | "delivered";

export type DisputeResolutionOwner = "admin" | "seller";

export type DisputeSummary = {
  id?: string | null;
  caseId?: string | null;
  status?: string | null;
  state?: string | null;
  reason?: string | null;
  requestedResolution?: string | null;
  outcome?: string | null;
  resolutionOwner?: DisputeResolutionOwner | null;
  payoutStatusAtSubmission?: string | null;
  windowEndsAt?: string | null;
  openedAt?: string | null;
  latestAttempt?: {
    id?: string | null;
    status?: string | null;
    reason?: string | null;
    resolution?: string | null;
    requestedResolution?: string | null;
  } | null;
};

export type RefundRequestSummary = {
  id?: string | null;
  status?: string | null;
  requestType?: string | null;
  amountRequested?: number;
  requestedResolution?: string | null;
  windowEndsAt?: string | null;
};

export type OrderBundle = {
  order: {
    id: string;
    status: string;
    deliveryStatus?: DeliveryStatus;
    currency: string;
    subtotal: { amount: number; currency: string };
    total: { amount: number; currency: string };
    paymentReference?: string | null;
    settlementRoute?: string | null;
    items: Array<{
      title: string;
      quantity: number;
      unitPrice: { amount: number; currency: string };
    }>;
    buyerDetails?: BuyerDetails;
    placedAt?: string | null;
    paidAt?: string | null;
    fulfilledAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  payment: {
    status?: string | null;
    verified?: boolean;
    reference?: string;
  } | null;
  escrow: { state?: string | null } | null;
  payoutStatus?: string | null;
  dispute: DisputeSummary | null;
  refundRequest?: RefundRequestSummary | null;
};

export type FilterKey =
  | "all"
  | "action_required"
  | "escrow"
  | "delivered"
  | "pending_delivery"
  | "disputed";

export type DisputedFilter = "all" | "pending" | "settled";
export type SellerResolution = "refund" | "replacement" | "rejected" | null;
