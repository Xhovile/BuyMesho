import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { apiFetch } from "./lib/api";
import { useAuthUser } from "./hooks/useAuthUser";
import { useIsAdmin } from "./hooks/useIsAdmin";
import { getSellerPayoutStatusLabel, getVisibleAdminActions } from "./modules/payouts/uiModel";
import ActionModal from "./components/ActionModal";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";
import { navigateToAdminPayoutDestinations } from "./lib/appNavigation";
import FormDropdown from "./components/FormDropdown";
import PayoutQueueCard from "./PayoutQueueCard";
import PayoutDetailDrawer from "./AdminPayoutDetailDrawer";

export type PayoutDiagnostics = Record<string, unknown>;

export type PayoutRow = {
  id: string;
  sellerId: string;
  sellerBusinessName?: string | null;
  sellerEmail?: string | null;
  orderId: string | null;
  escrowId: string | null;
  escrowState?: string | null;
  releaseEntryId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string | null;
  providerChargeId: string | null;
  providerReference: string | null;
  providerTransactionId?: string | null;
  providerStatus: string | null;
  destinationAccountId: string | null;
  destinationMaskedAccount: string | null;
  destinationType: string | null;
  destinationVerificationStatus: string | null;
  destinationStatus?: string | null;
  destinationActive?: boolean;
  destinationLastError?: string | null;
  sellerSuspended?: boolean;
  verificationBlockers?: string[];
  failureReason: string | null;
  manualReviewReason: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  sentAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
  latestAttemptNo: number | null;
  latestAttemptStatus: string | null;
  latestAttemptAt: string | null;
  latestAttemptFailureReason?: string | null;
  latestWebhookEventType?: string | null;
  latestWebhookEventAt?: string | null;
  latestAuditEventType?: string | null;
  latestAuditEventAt?: string | null;
  attemptCount?: number;
  currentState?: string;
  lastError?: string | null;
  holdReason?: string | null;
  retryEligible?: boolean;
  retryAllowed?: boolean;
  manualReviewPending?: boolean;
  retryBlockedReason?: string | null;
  auditSummary?: {
    totalEvents?: number;
    latestEventType?: string | null;
    latestEventAt?: string | null;
  };
  grossAmount?: number;
  platformFeeAmount?: number;
  legacyProcessingFeeAmount?: number;
  reserveAmount?: number;
  reserveCapAmount?: number;
  manualAdjustmentAmount?: number;
  netAmount?: number;
  diagnostics?: PayoutDiagnostics;
  latestAttemptProviderChargeId?: string | null;
  latestAttemptProviderReference?: string | null;
  latestAttemptProviderTransactionId?: string | null;
  latestAttemptProviderResponse?: unknown;
};

type PayoutSummary = {
  summary?: {
    totalPayouts?: number;
    pendingPayouts?: number;
    paidPayouts?: number;
    failedPayouts?: number;
    cancelledPayouts?: number;
  };
  attempts?: {
    totalAttempts?: number;
    successfulAttempts?: number;
    failedAttempts?: number;
  };
};

export type PayoutAdjustment = {
  id: string;
  payoutId: string;
  sellerId: string;
  adjustmentType: "processing_fee" | "manual_adjustment";
  amount: number;
  currency: string;
  reason: string;
  actorType: string;
  actorId: string | null;
  providerReference: string | null;
  createdAt: string;
};

type Notice = {
  type: "success" | "error";
  message: string;
};

export type OverrideAction = "hold" | "mark_paid" | "mark_failed" | "cancel";
export type RowAction = "retry" | OverrideAction;

type StatusFilter = "all" | "pending" | "failed" | "held" | "paid" | "cancelled";

const PENDING_STATES = ["eligible", "queued", "processing", "pending", "held"];
const PAGE_SIZE = 50;
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending states" },
  { value: "failed", label: "Failed" },
  { value: "held", label: "Held" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
] as const;
const DESTINATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "verified", label: "Verified" },
  { value: "failed", label: "Failed" },
  { value: "disabled", label: "Disabled" },
] as const;
const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "manual_adjustment", label: "Manual payout adjustment" },
  { value: "processing_fee", label: "Legacy compatibility amount (hidden)" },
] as const;

type PayoutsListResponse = {
  rows?: PayoutRow[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
    hasMore?: boolean;
  };
};

type PendingDialog =
  | { kind: "retry"; row: PayoutRow; title: string; message: string; confirmLabel: string; danger?: boolean }
  | { kind: "reconcile"; row: PayoutRow; title: string; message: string; confirmLabel: string; danger?: boolean }
  | { kind: "refund_escrow"; row: PayoutRow; title: string; message: string; confirmLabel: string; danger?: boolean }
  | { kind: "override"; row: PayoutRow; action: OverrideAction; title: string; message: string; confirmLabel: string; danger?: boolean };

function toDate(value: string | null | undefined) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusTone(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["failed", "cancelled"].includes(normalized)) return "border-rose-200 bg-rose-50 text-rose-700";
  if (PENDING_STATES.includes(normalized)) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-zinc-200 bg-zinc-100 text-zinc-700";
}

function formatStatus(value: string | null | undefined) {
  if (!value) return "—";
  const normalized = String(value || "").toLowerCase();
  if (["eligible", "queued", "processing", "pending", "held", "paid", "failed", "cancelled"].includes(normalized)) {
    return getSellerPayoutStatusLabel(normalized);
  }
  return String(value).replace(/_/g, " ");
}

// Remaining implementation intentionally preserved from main.
