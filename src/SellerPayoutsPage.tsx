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

function money(amount: number, currency = "MWK") {
  return new Intl.NumberFormat("en-MW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function payoutFeeNote(payout: PayoutRecord) {
  const fee = Number(payout.payoutFeeAmount ?? 0);
  if (fee > 0) return `Estimated PayChangu transfer fee: -${money(fee, payout.currency)}`;
  return "A PayChangu payout transaction fee may also be deducted when funds are transferred to your account.";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toEscrowSummaryRecord(value: unknown): EscrowSummaryRecord | null {
  if (value === null || value === undefined || typeof value !== "object") {
    return null;
  }

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

export default function SellerPayoutsPage() {
  const { firebaseUser, profile, profileLoading } = useAccountProfile();
  const [permissions, setPermissions] = useState<PayoutPermissions | null>(null);
  const [destinations, setDestinations] = useState<PayoutDestination[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowSummaryRecord[]>([]);
  const [providerMetadata, setProviderMetadata] = useState<PayoutProviderMetadata>({
    mobileMoneyOperators: [],
    banks: [],
    currencies: ["MWK"],
  });
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
  const [removeCountdown, setRemoveCountdown] = useState(3);

  const sellerId = firebaseUser?.uid || profile?.uid || "";
  const isSeller = Boolean(profile?.is_seller);

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!sellerId) return;
      if (!options?.silent) setLoading(true);

      try {
        const [permissionsRes, destinationsRes, payoutsRes, escrowsRes, providerMetadataRes] =
          await Promise.allSettled([
            getPayoutPermissions(sellerId),
            getPayoutDestinations(sellerId),
            getPayoutHistory(sellerId),
            fetchSellerEscrows(),
            getPayoutProviderMetadata(),
          ]);

        setPermissions(permissionsRes.status === "fulfilled" ? permissionsRes.value : null);
        setDestinations(destinationsRes.status === "fulfilled" ? destinationsRes.value : []);
        setPayouts(payoutsRes.status === "fulfilled" ? payoutsRes.value : []);
        if (providerMetadataRes.status === "fulfilled") {
          setProviderMetadata(providerMetadataRes.value);
        }

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
    const interval = window.setInterval(refreshData, 30000);

    return () => {
      window.removeEventListener("focus", refreshData);
      document.removeEventListener("visibilitychange", refreshData);
      window.clearInterval(interval);
    };
  }, [sellerId, loadData]);

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
      currency: destination.currency || "MWK",
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

  useEffect(() => {
    if (!removeTarget) return;
    setRemoveCountdown(3);

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

  const handleSaveDestination = async () => {
    if (!sellerId) return;
    if (!form.providerName.trim() || !form.accountName.trim()) {
      const message = "Provider and account name are required.";
      setDestinationFormError(message);
      setNotice({ type: "info", message });
      return;
    }

    if (!form.providerRefId.trim()) {
      const message = "Please select a supported payout provider from the list.";
      setDestinationFormError(message);
      setNotice({ type: "info", message });
      return;
    }

    if (form.destinationType === "bank" && !form.accountNumber.trim()) {
      const message = "Bank account number is required.";
      setDestinationFormError(message);
      setNotice({ type: "info", message });
      return;
    }

    if (form.destinationType === "mobile_money" && !form.mobile.trim()) {
      const message = "Mobile number is required.";
      setDestinationFormError(message);
      setNotice({ type: "info", message });
      return;
    }

    setDestinationFormError(null);
    setSavingDestination(true);

    try {
      const payload = {
        sellerUid: sellerId,
        destinationType: form.destinationType,
        providerName: form.providerName.trim(),
        providerRefId: form.providerRefId.trim() || undefined,
        currency: form.currency.trim() || "MWK",
        accountName: form.accountName.trim(),
        accountNumber:
          form.destinationType === "bank" ? form.accountNumber.trim() : undefined,
        mobile:
          form.destinationType === "mobile_money" ? form.mobile.trim() : undefined,
        isDefault: form.isDefault,
      };

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
          error instanceof Error
            ? error.message
            : "Failed to update default destination",
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
        message:
          "Default payout destination cannot be removed. Replace it in Payout Setup.",
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
      const message = error instanceof Error ? error.message : "Failed to remove destination";
      setNotice({ type: "error", message });
    } finally {
      setSavingDestination(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData({ silent: true });
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center">
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
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mt-6 rounded-[28px] border border-zinc-200/80 bg-white p-8 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <h1 className="text-3xl font-black tracking-tight">Seller payouts</h1>
            <p className="mt-3 text-sm text-zinc-600">
              You are not marked as a seller yet. Seller payout tools appear here after the account is approved as a seller.
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
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 sm:flex-none"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
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
                Set up your payout destination, track payout status, and keep a clean view of what is pending, paid, or failed.
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

        <section id="payout-destination-settings" className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
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
              action={<Building2 className="w-5 h-5 text-zinc-400" />}
            />

            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max gap-3 pb-2">
                {activeDestinations.length === 0 ? (
                  <div className="min-w-[320px] rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                    No payout destination yet.
                  </div>
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
            action={<Wallet className="w-5 h-5 text-zinc-400" />}
          />

          <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200">
            <div className="min-w-[760px] max-h-[520px] overflow-auto">
              <table className="w-full divide-y divide-zinc-200 text-left text-sm">
                <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Status</th>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Amount</th>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Order</th>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Operational view</th>
                    <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {!canViewHistory ? (
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
                                {Number(payout.sellerReceivesAmount ?? 0) > 0 && Number(payout.payoutFeeAmount ?? 0) > 0 ? (
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
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <ConfirmModal
        open={Boolean(removeTarget)}
        title="Remove payout destination"
        message="Are you sure you want to remove this payout destination?"
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
