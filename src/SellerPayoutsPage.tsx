import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import BrandMark from "./components/BrandMark";
import ConfirmModal from "./components/ConfirmModal";
import PayoutDestinationCard from "./components/payouts/PayoutDestinationCard";
import PayoutDestinationForm from "./components/payouts/PayoutDestinationForm";
import PayoutStatusBadge from "./components/payouts/PayoutStatusBadge";
import SellerEarningsSummary from "./components/payouts/SellerEarningsSummary";
import PayoutTimeline from "./components/payouts/PayoutTimeline";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { EXPLORE_PATH, navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import {
  createPayoutDestination,
  deletePayoutDestination,
  getPayoutDestinations,
  getPayoutHistory,
  getPayoutPermissions,
  getPayoutProviderMetadata,
  replacePayoutDestination,
  updatePayoutDestination,
} from "./modules/payouts/api";
import {
  buildSellerEarningsSummary,
  type EscrowSummaryRecord,
} from "./modules/payouts/summary";
import { fetchSellerEscrows } from "./lib/orderApi";
import type {
  PayoutDestination,
  PayoutDestinationFormState,
  PayoutPermissions,
  PayoutProviderMetadata,
  PayoutRecord,
  PayoutSummary,
} from "./modules/payouts/types";
import {
  getSellerPayoutStatusDetail,
  getSellerPayoutStatusLabel,
  sellerOperationalSignals,
} from "./modules/payouts/uiModel";

const INITIAL_FORM: PayoutDestinationFormState = {
  destinationType: "mobile_money",
  providerName: "",
  providerRefId: "",
  currency: "MWK",
  accountName: "",
  accountNumber: "",
  mobile: "",
  isDefault: true,
};

const REFRESH_INTERVAL_MS = 30_000;
const REMOVE_COUNTDOWN_SECONDS = 3;
const DEFAULT_CURRENCY = "MWK";
const DEFAULT_CONNECT_SCOPE = "payments:write payments:read";

function money(amount: number, currency = DEFAULT_CURRENCY) {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function payoutFeeNote(payout: PayoutRecord) {
  const fee = Number(payout.payoutFeeAmount ?? 0);
  if (fee > 0) {
    return `Estimated PayChangu transfer fee: -${money(fee, payout.currency)}`;
  }
  return "A PayChangu payout transaction fee may also be deducted when funds are transferred to your account.";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toEscrowSummaryRecord(value: unknown): EscrowSummaryRecord | null {
  if (!value || typeof value !== "object") return null;

  const escrow = value as Record<string, unknown>;

  const normalizeAmount = (input: unknown): number | string | null => {
    if (input === null || input === undefined) return null;
    if (typeof input === "number" || typeof input === "string") return input;
    return null;
  };

  const readAmountField = (...keys: string[]) => {
    for (const key of keys) {
      const candidate = normalizeAmount(escrow[key]);
      if (candidate !== null) return candidate;
    }
    return null;
  };

  return {
    amount: readAmountField(
      "amount",
      "balanceAmount",
      "balance_amount",
      "totalAmount",
      "total_amount",
    ),
    grossAmount: readAmountField(
      "grossAmount",
      "gross_amount",
      "totalAmount",
      "total_amount",
      "balanceAmount",
      "balance_amount",
    ),
    netAmount: readAmountField(
      "netAmount",
      "net_amount",
      "balanceAmount",
      "balance_amount",
    ),
    sellerAmount: readAmountField(
      "sellerAmount",
      "seller_amount",
      "balanceAmount",
      "balance_amount",
    ),
    status: typeof escrow.status === "string" ? escrow.status : undefined,
    state: typeof escrow.state === "string" ? escrow.state : undefined,
  };
}

type SellerConnectStatus = "pending" | "connected" | "revoked" | "error";

interface SellerConnectAccount {
  sellerUid: string;
  providerName?: string;
  status: SellerConnectStatus;
  mode: "live" | "test";
  scope?: string | null;
  authorizationUrl?: string | null;
  connectUserId?: string | null;
  connectUserEmail?: string | null;
  connectUserName?: string | null;
  connectedAt?: string | null;
  revokedAt?: string | null;
  lastError?: string | null;
}

const CONNECT_DEFAULT_MODE: "live" | "test" =
  (import.meta.env.VITE_PAYCHANGU_CONNECT_MODE as string | undefined)?.trim() === "test"
    ? "test"
    : "live";

const CONNECT_CLIENT_ID =
  (import.meta.env.VITE_PAYCHANGU_CONNECT_CLIENT_ID as string | undefined)?.trim() ?? "";
const CONNECT_SCOPE =
  (import.meta.env.VITE_PAYCHANGU_CONNECT_SCOPE as string | undefined)?.trim() ||
  DEFAULT_CONNECT_SCOPE;
const CONNECT_WEBHOOK_URL =
  (import.meta.env.VITE_PAYCHANGU_CONNECT_WEBHOOK_URL as string | undefined)?.trim() || "";
const CONNECT_WEBHOOK_SECRET =
  (import.meta.env.VITE_PAYCHANGU_CONNECT_WEBHOOK_SECRET as string | undefined)?.trim() || "";

async function fetchSellerConnectAccount(sellerUid: string): Promise<SellerConnectAccount | null> {
  try {
    const response = await apiFetch(`/api/connect/status/${encodeURIComponent(sellerUid)}`);
    return (response?.account ?? response ?? null) as SellerConnectAccount | null;
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) return null;
    throw error;
  }
}

async function requestSellerConnectAuthorizationLink(input: {
  sellerUid: string;
  clientId: string;
  redirectUri: string;
  mode: "live" | "test";
  scope?: string;
  whUrl?: string;
  whSecret?: string;
}): Promise<string> {
  const response = await apiFetch("/api/connect/authorize-link", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return String(response?.authorizationUrl ?? response?.url ?? "");
}

async function disconnectSellerConnectAccount(sellerUid: string): Promise<SellerConnectAccount | null> {
  const response = await apiFetch(`/api/connect/disconnect/${encodeURIComponent(sellerUid)}`, {
    method: "POST",
    body: JSON.stringify({ reason: "Disconnected from payout page" }),
  });

  return (response?.account ?? response ?? null) as SellerConnectAccount | null;
}

function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      </div>
      {action ? action : null}
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
      {children}
    </div>
  );
}

function ConnectStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-2 text-lg font-black text-zinc-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{detail}</p>
    </div>
  );
}

function getConnectStatusLabel(status?: SellerConnectStatus | null) {
  switch (status) {
    case "connected":
      return "Connected";
    case "revoked":
      return "Disconnected";
    case "error":
      return "Error";
    case "pending":
      return "Pending";
    default:
      return "Not connected";
  }
}

function getConnectStatusDetail(status?: SellerConnectStatus | null) {
  if (status === "connected") {
    return "PayChangu Connect is ready for direct seller settlement.";
  }
  return "Set up Connect to enable direct settlement for connect-route orders.";
}

function validateDestinationForm(form: PayoutDestinationFormState) {
  const providerName = form.providerName.trim();
  const accountName = form.accountName.trim();
  const providerRefId = form.providerRefId.trim();
  const accountNumber = form.accountNumber.trim();
  const mobile = form.mobile.trim();

  if (!providerName || !accountName) {
    return "Provider and account name are required.";
  }

  if (!providerRefId) {
    return "Please select a supported payout provider from the list.";
  }

  if (form.destinationType === "bank" && !accountNumber) {
    return "Bank account number is required.";
  }

  if (form.destinationType === "mobile_money" && !mobile) {
    return "Mobile number is required.";
  }

  return null;
}

function buildDestinationPayload(
  sellerUid: string,
  form: PayoutDestinationFormState,
) {
  return {
    sellerUid,
    destinationType: form.destinationType,
    providerName: form.providerName.trim(),
    providerRefId: form.providerRefId.trim() || undefined,
    currency: form.currency.trim() || DEFAULT_CURRENCY,
    accountName: form.accountName.trim(),
    accountNumber: form.destinationType === "bank" ? form.accountNumber.trim() : undefined,
    mobile: form.destinationType === "mobile_money" ? form.mobile.trim() : undefined,
    isDefault: form.isDefault,
  };
}

export default function SellerPayoutsPage() {
  const { firebaseUser, profile, profileLoading } = useAccountProfile();

  const [permissions, setPermissions] = useState<PayoutPermissions | null>(null);
  const [destinations, setDestinations] = useState<PayoutDestination[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowSummaryRecord[]>([]);
  const [providerMetadata, setProviderMetadata] = useState<PayoutProviderMetadata>({
    mobileMoneyOperators: [],
    banks: [],
    currencies: [DEFAULT_CURRENCY],
  });

  const [connectAccount, setConnectAccount] = useState<SellerConnectAccount | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [form, setForm] = useState<PayoutDestinationFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingDestination, setSavingDestination] = useState(false);
  const [destinationFormError, setDestinationFormError] = useState<string | null>(null);

  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const [removeTarget, setRemoveTarget] = useState<PayoutDestination | null>(null);
  const [removeCountdown, setRemoveCountdown] = useState(REMOVE_COUNTDOWN_SECONDS);

  const sellerId = firebaseUser?.uid || profile?.uid || "";
  const isSeller = Boolean(profile?.is_seller);

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!sellerId) return;
      if (!options?.silent) setLoading(true);

      try {
        const [
          permissionsRes,
          destinationsRes,
          payoutsRes,
          escrowsRes,
          providerMetadataRes,
          connectRes,
        ] = await Promise.allSettled([
          getPayoutPermissions(sellerId),
          getPayoutDestinations(sellerId),
          getPayoutHistory(sellerId),
          fetchSellerEscrows(),
          getPayoutProviderMetadata(),
          fetchSellerConnectAccount(sellerId),
        ]);

        setPermissions(permissionsRes.status === "fulfilled" ? permissionsRes.value : null);
        setDestinations(destinationsRes.status === "fulfilled" ? destinationsRes.value : []);
        setPayouts(payoutsRes.status === "fulfilled" ? payoutsRes.value : []);

        if (providerMetadataRes.status === "fulfilled") {
          setProviderMetadata(providerMetadataRes.value);
        }

        setConnectAccount(connectRes.status === "fulfilled" ? connectRes.value : null);

        if (escrowsRes.status === "fulfilled") {
          const escrowRecords = escrowsRes.value
            .map((entry) => toEscrowSummaryRecord(entry))
            .filter((entry): entry is EscrowSummaryRecord => entry !== null);
          setEscrows(escrowRecords);
        } else {
          setEscrows([]);
        }
      } catch (error) {
        setNotice({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load payout data",
        });
      } finally {
        if (!options?.silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [sellerId],
  );

  useEffect(() => {
    if (!sellerId) return;
    void loadData();
  }, [sellerId, loadData]);

  useEffect(() => {
    if (!sellerId) return;

    const refreshData = () => {
      if (document.visibilityState !== "visible") return;
      void loadData({ silent: true });
    };

    window.addEventListener("focus", refreshData);
    document.addEventListener("visibilitychange", refreshData);
    const interval = window.setInterval(refreshData, REFRESH_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", refreshData);
      document.removeEventListener("visibilitychange", refreshData);
      window.clearInterval(interval);
    };
  }, [sellerId, loadData]);

  useEffect(() => {
    if (!removeTarget) return;

    setRemoveCountdown(REMOVE_COUNTDOWN_SECONDS);

    const interval = window.setInterval(() => {
      setRemoveCountdown((prev) => {
        if (prev <= 0) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [removeTarget]);

  const earningsSummary = useMemo(
    () => buildSellerEarningsSummary({ payouts, escrows, destinations }),
    [payouts, escrows, destinations],
  );

  const activeDestinations = useMemo(
    () => destinations.filter((item) => item.isActive),
    [destinations],
  );

  const summary = useMemo<PayoutSummary>(
    () => ({
      activeDestinations: activeDestinations.length,
      defaultDestination: activeDestinations.find((item) => item.isDefault) || null,
      total: earningsSummary.lifetimeSales,
      paid: earningsSummary.paidOut,
      pending: earningsSummary.availableForPayout + earningsSummary.pendingPayout,
      failed: earningsSummary.failedActionRequired,
    }),
    [activeDestinations, earningsSummary],
  );

  const canEditSettings = permissions?.editPayoutSettings !== false;
  const canViewHistory = permissions?.viewPayoutHistory !== false;

  const startEdit = (destination: PayoutDestination) => {
    setDestinationFormError(null);
    setSelectedDestinationId(destination.id);
    setForm({
      destinationType: destination.destinationType,
      providerName: destination.providerName,
      providerRefId: destination.providerRefId || "",
      currency: destination.currency || DEFAULT_CURRENCY,
      accountName: destination.accountName,
      accountNumber: "",
      mobile: "",
      isDefault: destination.isDefault,
    });
  };

  const resetForm = () => {
    setSelectedDestinationId(null);
    setDestinationFormError(null);
    setForm(INITIAL_FORM);
  };

  const handleConnectRefresh = async () => {
    setConnectBusy(true);
    setConnectError(null);

    try {
      await loadData({ silent: true });
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Failed to refresh Connect status.");
    } finally {
      setConnectBusy(false);
    }
  };

  const handleConnectSetup = async () => {
    if (!sellerId) return;

    if (!CONNECT_CLIENT_ID) {
      setConnectError("Missing VITE_PAYCHANGU_CONNECT_CLIENT_ID in the app environment.");
      return;
    }

    setConnectBusy(true);
    setConnectError(null);

    try {
      const authorizationUrl = await requestSellerConnectAuthorizationLink({
        sellerUid: sellerId,
        clientId: CONNECT_CLIENT_ID,
        redirectUri: `${window.location.origin}${window.location.pathname}`,
        mode: CONNECT_DEFAULT_MODE,
        scope: CONNECT_SCOPE,
        whUrl: CONNECT_WEBHOOK_URL || undefined,
        whSecret: CONNECT_WEBHOOK_SECRET || undefined,
      });

      if (!authorizationUrl) {
        throw new Error("PayChangu did not return an authorization link.");
      }

      window.location.href = authorizationUrl;
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Failed to open PayChangu Connect.");
    } finally {
      setConnectBusy(false);
    }
  };

  const handleConnectDisconnect = async () => {
    if (!sellerId) return;

    setConnectBusy(true);
    setConnectError(null);

    try {
      await disconnectSellerConnectAccount(sellerId);
      await loadData({ silent: true });
      setNotice({
        type: "success",
        message: "PayChangu Connect disconnected for this seller account.",
      });
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Failed to disconnect PayChangu Connect.");
    } finally {
      setConnectBusy(false);
    }
  };

  const handleSaveDestination = async () => {
    if (!sellerId) return;

    const validationMessage = validateDestinationForm(form);
    if (validationMessage) {
      setDestinationFormError(validationMessage);
      setNotice({ type: "info", message: validationMessage });
      return;
    }

    setDestinationFormError(null);
    setSavingDestination(true);

    try {
      const payload = buildDestinationPayload(sellerId, form);

      if (selectedDestinationId) {
        await replacePayoutDestination(selectedDestinationId, payload);
      } else {
        await createPayoutDestination(payload);
      }

      setNotice({
        type: "success",
        message: selectedDestinationId
          ? "Payout destination replaced safely."
          : "Payout destination saved.",
      });

      resetForm();
      await loadData({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save destination";
      setDestinationFormError(message);
      setNotice({ type: "error", message });
    } finally {
      setSavingDestination(false);
    }
  };

  const handleMakeDefault = async (destination: PayoutDestination) => {
    if (!destination.isActive || destination.isDefault) return;

    setSavingDestination(true);
    try {
      await updatePayoutDestination(destination.id, { isDefault: true });
      setNotice({
        type: "success",
        message: `${destination.providerName} is now your default payout destination.`,
      });
      await loadData({ silent: true });
    } catch (error) {
      setNotice({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update default destination",
      });
    } finally {
      setSavingDestination(false);
    }
  };

  const handleRemoveDestination = (destination: PayoutDestination) => {
    if (destination.isDefault) {
      startEdit(destination);
      setNotice({
        type: "info",
        message: "Default payout destination cannot be removed. Replace it in Payout Setup.",
      });
      return;
    }

    setRemoveTarget(destination);
    setDestinationFormError(null);
    setNotice(null);
  };

  const handleConfirmRemoveDestination = async () => {
    if (!removeTarget || removeCountdown > 0) return;

    setSavingDestination(true);
    try {
      await deletePayoutDestination(removeTarget.id);
      setNotice({
        type: "success",
        message: `${removeTarget.providerName} payout destination removed.`,
      });

      if (selectedDestinationId === removeTarget.id) resetForm();
      setRemoveTarget(null);
      await loadData({ silent: true });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to remove destination",
      });
    } finally {
      setSavingDestination(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData({ silent: true });
  };

  const connectStatus = connectAccount?.status ?? null;

  const payoutHistoryContent = !canViewHistory ? (
    <tr>
      <td colSpan={5} className="px-4 py-6 text-zinc-500">
        You do not have permission to view payout history.
      </td>
    </tr>
  ) : payouts.length === 0 ? (
    <tr>
      <td colSpan={5} className="px-4 py-6 text-zinc-500">
        No payout activity yet.
      </td>
    </tr>
  ) : (
    payouts.map((payout) => {
      const operationalSignals = sellerOperationalSignals({
        status: payout.status,
        destinationStatus: payout.destinationStatus,
        retryAllowed: payout.retryAllowed,
        manualReviewPending: payout.manualReviewPending,
        verificationBlockers: payout.verificationBlockers,
      });

      return (
        <tr key={payout.id} className="align-top">
          <td className="px-4 py-4">
            <div className="space-y-2">
              <PayoutStatusBadge status={payout.status} />
              <div className="text-xs font-semibold text-zinc-600">
                {getSellerPayoutStatusLabel(payout.status)}
              </div>
              {payout.status === "held" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  <div>Payout paused for review</div>
                  <div>Seller is waiting on the next action</div>
                </div>
              ) : null}
            </div>
          </td>

          <td className="px-4 py-4 text-zinc-700">
            <div className="font-bold text-zinc-900">
              {money(Number(payout.netAmount ?? payout.amount ?? 0), payout.currency)}
            </div>

            {payout.grossAmount !== null && payout.grossAmount !== undefined ? (
              <div className="mt-2 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] font-semibold text-zinc-500">
                <div className="flex justify-between gap-3">
                  <span>Gross</span>
                  <span>{money(Number(payout.grossAmount || 0), payout.currency)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Platform commission</span>
                  <span>-{money(Number(payout.platformFeeAmount || 0), payout.currency)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span>Reserve</span>
                  <span>-{money(Number(payout.reserveAmount || 0), payout.currency)}</span>
                </div>
                <div className="flex justify-between gap-3 border-t border-zinc-200 pt-1 font-bold text-zinc-700">
                  <span>Net sent for payout</span>
                  <span>{money(Number(payout.netAmount || payout.amount || 0), payout.currency)}</span>
                </div>
                <div className="rounded-lg bg-white px-2 py-1 text-[10px] leading-4 text-zinc-600">
                  {payoutFeeNote(payout)}
                </div>
                {Number(payout.sellerReceivesAmount ?? 0) > 0 &&
                Number(payout.payoutFeeAmount ?? 0) > 0 ? (
                  <div className="flex justify-between gap-3 font-bold text-zinc-700">
                    <span>Estimated after payout fee</span>
                    <span>{money(Number(payout.sellerReceivesAmount), payout.currency)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </td>

          <td className="px-4 py-4 text-zinc-600">{payout.orderId || payout.escrowId || "—"}</td>

          <td className="px-4 py-4 text-zinc-600">
            <div className="space-y-1">
              {operationalSignals.length === 0 ? (
                <span>—</span>
              ) : (
                operationalSignals.map((message) => (
                  <div
                    key={`${payout.id}-${message}`}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold"
                  >
                    {message}
                  </div>
                ))
              )}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold">
                {getSellerPayoutStatusDetail(payout.status)}
              </div>
            </div>
          </td>

          <td className="px-4 py-4 text-zinc-500">{formatDate(payout.updatedAt)}</td>
        </tr>
      );
    })
  );

  if (profileLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7]">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
          <span className="font-semibold text-zinc-700">Loading seller payouts...</span>
        </div>
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] text-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="mt-6 rounded-[28px] border border-zinc-200/80 bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <h1 className="text-3xl font-black tracking-tight">Seller payouts</h1>
            <p className="mt-3 text-sm text-zinc-600">
              You are not marked as a seller yet. Seller payout tools appear here after the
              account is approved as a seller.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:flex-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 sm:flex-none"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <section className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Seller payouts
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Payout control center.
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">
                Set up your payout destination, track payout status, and keep a clean view of what
                is pending, paid, or failed.
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-zinc-600">
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                  Active destinations: {summary.activeDestinations}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                  Default: {summary.defaultDestination ? summary.defaultDestination.maskedAccount : "Not set"}
                </span>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                  Permissions: {canEditSettings ? "Edit enabled" : "View only"}
                </span>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-3 shadow-sm lg:min-w-[520px]">
              <SellerEarningsSummary summary={earningsSummary} compact />
            </div>
          </div>

          <div className="mt-5">
            <PayoutTimeline payouts={payouts} />
          </div>
        </section>

        {notice ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <SectionTitle
                eyebrow="PayChangu Connect"
                title="Direct settlement setup."
                action={<Building2 className="h-5 w-5 text-zinc-400" />}
              />
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Connect your PayChangu account here so connect settlement orders can pay directly
                to your linked PayChangu account. Your payout destinations below still handle the
                standard seller payout flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleConnectRefresh()}
                disabled={connectBusy}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh status
              </button>

              <button
                type="button"
                onClick={() => void handleConnectSetup()}
                disabled={connectBusy}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {connectAccount?.status === "connected" ? "Reconnect PayChangu" : "Connect PayChangu"}
              </button>

              {connectAccount?.status === "connected" ? (
                <button
                  type="button"
                  onClick={() => void handleConnectDisconnect()}
                  disabled={connectBusy}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Disconnect
                </button>
              ) : null}
            </div>
          </div>

          {connectError ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {connectError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <ConnectStatCard
              label="Connection status"
              value={getConnectStatusLabel(connectStatus)}
              detail={getConnectStatusDetail(connectStatus)}
            />
            <ConnectStatCard
              label="Connected user"
              value={connectAccount?.connectUserName || connectAccount?.connectUserEmail || "—"}
              detail={connectAccount?.connectUserEmail || "No PayChangu profile linked yet."}
            />
            <ConnectStatCard
              label="Mode"
              value={connectAccount?.mode || CONNECT_DEFAULT_MODE}
              detail={connectAccount?.scope || CONNECT_SCOPE}
            />
            <ConnectStatCard
              label="Last update"
              value={formatDate(connectAccount?.connectedAt || connectAccount?.revokedAt || null)}
              detail={connectAccount?.lastError || "Connection details are stored on the seller account."}
            />
          </div>
        </section>

        <section
          id="payout-destination-settings"
          className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <PayoutDestinationForm
            value={form}
            onChange={setForm}
            onSave={handleSaveDestination}
            onCancel={resetForm}
            loading={savingDestination}
            error={destinationFormError}
            disabled={!canEditSettings}
            isEditing={Boolean(selectedDestinationId)}
            activeDestinationCount={activeDestinations.length}
            providerOptions={[
              ...providerMetadata.mobileMoneyOperators,
              ...providerMetadata.banks,
            ]}
          />

          <div className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <SectionTitle
              eyebrow="Saved destinations"
              title="Active payout routes."
              action={<Building2 className="h-5 w-5 text-zinc-400" />}
            />

            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max gap-3 pb-2">
                {activeDestinations.length === 0 ? (
                  <EmptyState>No payout destination yet.</EmptyState>
                ) : (
                  activeDestinations.map((destination) => (
                    <PayoutDestinationCard
                      key={destination.id}
                      destination={destination}
                      onReplace={startEdit}
                      onRemove={handleRemoveDestination}
                      onMakeDefault={handleMakeDefault}
                      formatDate={formatDate}
                      actionsDisabled={!canEditSettings || savingDestination}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
          <SectionTitle
            eyebrow="Payout history"
            title="Release, paid, failed."
            action={<Wallet className="h-5 w-5 text-zinc-400" />}
          />

          <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
            <div className="max-h-[520px] min-w-[760px] overflow-auto">
              <table className="w-full divide-y divide-zinc-200 text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Order
                    </th>
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Operational view
                    </th>
                    <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">{payoutHistoryContent}</tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <ConfirmModal
        open={Boolean(removeTarget)}
        title="Remove payout destination"
        message={
          removeTarget
            ? `Are you sure you want to remove ${removeTarget.providerName} from your payout destinations?`
            : "Are you sure you want to remove this payout destination?"
        }
        cancelText="Cancel"
        confirmText={removeCountdown > 0 ? `Confirm (${removeCountdown}s)` : "Confirm"}
        confirmDisabled={savingDestination || removeCountdown > 0}
        danger
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => void handleConfirmRemoveDestination()}
      />
    </div>
  );
 }
