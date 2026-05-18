import type { PayoutRecord, PayoutStatus } from "./types";

export type SellerEarningsBucketKey =
  | "lifetimeSales"
  | "inEscrow"
  | "availableForPayout"
  | "pendingPayout"
  | "paidOut"
  | "failedActionRequired";

export type SellerEarningsBuckets = Record<SellerEarningsBucketKey, number>;

export type EscrowSummaryRecord = {
  amount?: number | string | null;
  grossAmount?: number | string | null;
  netAmount?: number | string | null;
  sellerAmount?: number | string | null;
  status?: string | null;
  state?: string | null;
};

export type SellerEarningsSummaryTotals = Partial<
  Record<SellerEarningsBucketKey, number | string | null>
> & {
  total?: number | string | null;
  totalSales?: number | string | null;
  totalPayoutVolume?: number | string | null;
  currency?: string | null;
};

export type SellerEarningsDestination = {
  isActive?: boolean | null;
  verificationStatus?: string | null;
  currency?: string | null;
};

export type SellerEarningsSummaryInput = SellerEarningsSummaryTotals & {
  payouts?: PayoutRecord[] | null;
  escrows?: EscrowSummaryRecord[] | null;
  destinations?: SellerEarningsDestination[] | null;
};

export type SellerEarningsSummary = SellerEarningsBuckets & {
  currency: string;
  hasFailedPayout: boolean;
  hasHeldPayout: boolean;
  hasMissingDestination: boolean;
  hasUnverifiedDestination: boolean;
};

const EMPTY_BUCKETS: SellerEarningsBuckets = {
  lifetimeSales: 0,
  inEscrow: 0,
  availableForPayout: 0,
  pendingPayout: 0,
  paidOut: 0,
  failedActionRequired: 0,
};

const AVAILABLE_STATUSES: PayoutStatus[] = ["eligible"];
const PENDING_STATUSES: PayoutStatus[] = [
  "queued",
  "processing",
  "pending",
  "held",
];
const PAID_STATUSES: PayoutStatus[] = ["paid"];
const FAILED_STATUSES: PayoutStatus[] = ["failed"];
const ACTIVE_ESCROW_STATES = new Set([
  "created",
  "held",
  "in_escrow",
  "funded",
  "pending_release",
  "disputed",
]);

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function payoutAmount(payout: PayoutRecord): number {
  return amount(payout.netAmount ?? payout.amount);
}

function escrowAmount(escrow: EscrowSummaryRecord): number {
  return amount(
    escrow.sellerAmount ??
      escrow.netAmount ??
      escrow.grossAmount ??
      escrow.amount,
  );
}

function addPayoutBuckets(
  summary: SellerEarningsBuckets,
  payouts: PayoutRecord[],
) {
  for (const payout of payouts) {
    const value = payoutAmount(payout);

    if (AVAILABLE_STATUSES.includes(payout.status)) {
      summary.availableForPayout += value;
      summary.lifetimeSales += value;
    } else if (PENDING_STATUSES.includes(payout.status)) {
      summary.pendingPayout += value;
      summary.lifetimeSales += value;
    } else if (PAID_STATUSES.includes(payout.status)) {
      summary.paidOut += value;
      summary.lifetimeSales += value;
    } else if (FAILED_STATUSES.includes(payout.status)) {
      summary.failedActionRequired += value;
      summary.lifetimeSales += value;
    }
  }
}

function addEscrowBuckets(
  summary: SellerEarningsBuckets,
  escrows: EscrowSummaryRecord[],
) {
  for (const escrow of escrows) {
    const state = String(escrow.state ?? escrow.status ?? "").toLowerCase();
    if (ACTIVE_ESCROW_STATES.has(state)) {
      const value = escrowAmount(escrow);
      summary.inEscrow += value;
      summary.lifetimeSales += value;
    }
  }
}

function applyExplicitTotals(
  summary: SellerEarningsBuckets,
  input: SellerEarningsSummaryTotals,
) {
  for (const key of Object.keys(EMPTY_BUCKETS) as SellerEarningsBucketKey[]) {
    if (input[key] !== undefined && input[key] !== null) {
      summary[key] = amount(input[key]);
    }
  }

  if (input.lifetimeSales === undefined || input.lifetimeSales === null) {
    const total = input.totalSales ?? input.total ?? input.totalPayoutVolume;
    if (total !== undefined && total !== null) {
      summary.lifetimeSales = amount(total);
    }
  }
}

export function buildSellerEarningsSummary(
  input: SellerEarningsSummaryInput = {},
): SellerEarningsSummary {
  const summary: SellerEarningsBuckets = { ...EMPTY_BUCKETS };
  const payouts = Array.isArray(input.payouts) ? input.payouts : [];
  const escrows = Array.isArray(input.escrows) ? input.escrows : [];
  const destinations = Array.isArray(input.destinations)
    ? input.destinations
    : [];

  addPayoutBuckets(summary, payouts);
  addEscrowBuckets(summary, escrows);
  applyExplicitTotals(summary, input);

  const activeDestinations = destinations.filter(
    (destination) => destination.isActive !== false,
  );
  const hasMissingDestination =
    destinations.length > 0 ? activeDestinations.length === 0 : false;
  const hasUnverifiedDestination =
    activeDestinations.length > 0 &&
    !activeDestinations.some(
      (destination) =>
        String(destination.verificationStatus ?? "").toLowerCase() ===
        "verified",
    );

  return {
    ...summary,
    currency:
      input.currency ||
      payouts[0]?.currency ||
      destinations[0]?.currency ||
      "MWK",
    hasFailedPayout:
      summary.failedActionRequired > 0 ||
      payouts.some((payout) => payout.status === "failed"),
    hasHeldPayout: payouts.some((payout) => payout.status === "held"),
    hasMissingDestination,
    hasUnverifiedDestination,
  };
}

export function formatSellerEarningsAmount(
  amountValue: number,
  currency = "MWK",
) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountValue || 0);
}
