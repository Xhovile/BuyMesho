import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  BadgeCheck,
  Building2,
  ClipboardList,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import BrandMark from "./components/BrandMark";
import PayoutDestinationCard from "./components/payouts/PayoutDestinationCard";
import PayoutDestinationForm from "./components/payouts/PayoutDestinationForm";
import type { PayoutDestinationFormValue, PayoutDestinationType } from "./components/payouts/PayoutDestinationForm";
import PayoutStatusBadge from "./components/payouts/PayoutStatusBadge";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { navigateToPath, SETTINGS_PATH } from "./lib/appNavigation";
import { sellerOperationalSignals } from "./modules/payouts/uiModel";

type DestinationType = PayoutDestinationType;

type PayoutDestination = {
  id: string;
  sellerId: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  maskedAccount: string;
  isDefault: boolean;
  verificationStatus: string;
  verificationAttempts: number;
  lastError: string | null;
  verifiedAt: string | null;
  replacedFromId: string | null;
  replacedById: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PayoutRecord = {
  id: string;
  sellerId: string;
  orderId: string | null;
  escrowId: string | null;
  releaseEntryId: string | null;
  amount: number;
  currency: string;
  grossAmount?: number | null;
  platformFeeAmount?: number | null;
  reserveAmount?: number | null;
  manualAdjustmentAmount?: number | null;
  netAmount?: number | null;
  status: "eligible" | "queued" | "processing" | "pending" | "held" | "paid" | "failed" | "cancelled";
  provider: string | null;
  providerChargeId: string | null;
  providerStatus?: string | null;
  destinationStatus?: string;
  holdReason?: string | null;
  lastFailureReason?: string | null;
  retryAllowed?: boolean;
  retryCount?: number;
  manualReviewPending?: boolean;
  verificationBlockers?: string[];
  lastUpdatedTimestamp?: string | null;
  requestedBy: string | null;
  requestedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PayoutPermissions = {
  viewPayoutSettings: boolean;
  editPayoutSettings: boolean;
  requestWithdrawal: boolean;
  viewPayoutHistory: boolean;
  requestPayoutRetry: boolean;
  approveOverride: boolean;
};

type FormState = PayoutDestinationFormValue;

const INITIAL_FORM: FormState = {
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

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function SellerPayoutsPage() {
  const { firebaseUser, profile, profileLoading } = useAccountProfile();
  const [permissions, setPermissions] = useState<PayoutPermissions | null>(null);
  const [destinations, setDestinations] = useState<PayoutDestination[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [savingDestination, setSavingDestination] = useState(false);
  const [destinationFormError, setDestinationFormError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  const sellerId = firebaseUser?.uid || profile?.uid || "";
  const isSeller = !!profile?.is_seller;

  const loadData = useCallback(async () => {
    if (!sellerId) return;
    setLoading(true);
    try {
      const [permissionsRes, destinationsRes, payoutsRes] = await Promise.allSettled([
        apiFetch(`/api/payouts/permissions/${encodeURIComponent(sellerId)}`),
        apiFetch(`/api/payouts/destinations?sellerUid=${encodeURIComponent(sellerId)}`),
        apiFetch(`/api/payouts/history/${encodeURIComponent(sellerId)}`),
      ]);

      if (permissionsRes.status === "fulfilled") {
        setPermissions(permissionsRes.value.permissions ?? permissionsRes.value);
      } else {
        setPermissions(null);
      }

      if (destinationsRes.status === "fulfilled") {
        setDestinations(Array.isArray(destinationsRes.value.destinations) ? destinationsRes.value.destinations : []);
      } else {
        setDestinations([]);
      }

      if (payoutsRes.status === "fulfilled") {
        setPayouts(Array.isArray(payoutsRes.value.payouts) ? payoutsRes.value.payouts : []);
      } else {
        setPayouts([]);
      }
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to load payout data" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sellerId]);

  useEffect(() => {
    if (!sellerId) return;
    void loadData();
  }, [sellerId, loadData]);

  const summary = useMemo(() => {
    const amounts = {
      eligible: 0,
      queued: 0,
      processing: 0,
      pending: 0,
      held: 0,
      paid: 0,
      failed: 0,
      cancelled: 0,
    } as Record<PayoutRecord["status"], number>;

    for (const payout of payouts) {
      amounts[payout.status] = (amounts[payout.status] || 0) + Number(payout.amount || 0);
    }

    return {
      total: payouts.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paid: amounts.paid,
      pending: amounts.eligible + amounts.queued + amounts.processing + amounts.pending + amounts.held,
      failed: amounts.failed,
      activeDestinations: destinations.filter((item) => item.isActive).length,
      defaultDestination: destinations.find((item) => item.isDefault && item.isActive) || null,
    };
  }, [payouts, destinations]);

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

  const handleSaveDestination = async () => {
    if (!sellerId) return;
    if (!form.providerName.trim() || !form.accountName.trim()) {
      const message = "Provider and account name are required.";
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
        accountNumber: form.destinationType === "bank" ? form.accountNumber.trim() : undefined,
        mobile: form.destinationType === "mobile_money" ? form.mobile.trim() : undefined,
        isDefault: form.isDefault,
      };

      if (selectedDestinationId) {
        await apiFetch(`/api/payouts/destinations/${selectedDestinationId}/replace`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/payouts/destinations`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setNotice({ type: "success", message: selectedDestinationId ? "Payout destination replaced safely." : "Payout destination saved." });
      resetForm();
      await loadData();
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
      await apiFetch(`/api/payouts/destinations/${destination.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      });
      setNotice({ type: "success", message: `${destination.providerName} is now your default payout destination.` });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to update default destination" });
    } finally {
      setSavingDestination(false);
    }
  };

  const handleRemoveDestination = (destination: PayoutDestination) => {
    setNotice({
      type: "info",
      message: `${destination.providerName} cannot be removed directly yet. Replace it with a new destination to deactivate the old details safely.`,
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
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
        <div className="max-w-4xl mx-auto px-4 py-10">
          <button
            type="button"
            onClick={() => navigateToPath(SETTINGS_PATH)}
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

  const activeDestinations = destinations.filter((item) => item.isActive);
  const canEditSettings = permissions?.editPayoutSettings !== false;
  const canViewHistory = permissions?.viewPayoutHistory !== false;

  return (
    <div className="min-h-screen bg-[#f4f5f7] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <BrandMark />
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <button
              type="button"
              onClick={() => navigateToPath(SETTINGS_PATH)}
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
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller payouts</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Payout control center.</h1>
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

            <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-3 shadow-sm lg:min-w-[420px]">
              <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-[1.35rem] border border-zinc-200 bg-white sm:grid-cols-4">
                <div className="border-b border-zinc-200 sm:border-b-0 sm:border-r">
                  <StatCard label="Total payout volume" value={money(summary.total)} icon={<Wallet className="w-4 h-4" />} />
                </div>
                <div className="border-b border-zinc-200 sm:border-b-0 sm:border-r">
                  <StatCard label="Paid out" value={money(summary.paid)} icon={<BadgeCheck className="w-4 h-4" />} />
                </div>
                <div className="border-b border-zinc-200 sm:border-b-0 sm:border-r">
                  <StatCard label="Pending" value={money(summary.pending)} icon={<ClipboardList className="w-4 h-4" />} />
                </div>
                <div>
                  <StatCard label="Failed" value={money(summary.failed)} icon={<AlertTriangle className="w-4 h-4" />} />
                </div>
              </div>
            </div>
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

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
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
          />
          <div className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Status snapshot</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">What the seller sees.</h2>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Default</p>
                <p className="mt-1 text-sm font-black">{summary.defaultDestination ? summary.defaultDestination.maskedAccount : "Not set"}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <MiniStatus icon={<Banknote className="w-4 h-4" />} title="Setup required" text="Add a payout destination before release can move money out." />
              <MiniStatus icon={<ClipboardList className="w-4 h-4" />} title="Queued" text="Escrow release created a payout candidate and is waiting on provider action." />
              <MiniStatus icon={<ShieldCheck className="w-4 h-4" />} title="Held for review" text="Payout held for review and awaiting admin action." />
              <MiniStatus icon={<BadgeCheck className="w-4 h-4" />} title="Paid" text="The provider confirmed the seller payout has been completed." />
              <MiniStatus icon={<AlertTriangle className="w-4 h-4" />} title="Failed" text="A failed payout stays visible and retryable from the admin side." />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="min-w-0 rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Payout destinations</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Saved destinations</h2>
              </div>
              <Building2 className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="mt-5 overflow-x-auto">
              <div className="flex min-w-max gap-3 pb-2">
                {destinations.length === 0 ? (
                  <div className="min-w-[320px] rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                    No payout destination yet.
                  </div>
                ) : (
                  destinations.map((destination) => (
                    <PayoutDestinationCard
                      key={destination.id}
                      destination={destination}
                      onReplace={startEdit}
                      onRemove={handleRemoveDestination}
                      onMakeDefault={(item) => void handleMakeDefault(item)}
                      formatDate={formatDate}
                      actionsDisabled={!canEditSettings || savingDestination}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Payout history</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Release, paid, failed.</h2>
              </div>
              <Wallet className="w-5 h-5 text-zinc-400" />
            </div>

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
                        <td colSpan={4} className="px-4 py-6 text-zinc-500">
                          You do not have permission to view payout history.
                        </td>
                      </tr>
                    ) : payouts.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="px-4 py-6 text-zinc-500">No payout activity yet.</td>
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
                              {payout.status === "held" ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                  <div>Payout held for review</div>
                                  <div>Awaiting admin action</div>
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-zinc-700">
                            <div className="font-bold text-zinc-900">{money(Number(payout.netAmount ?? payout.amount ?? 0), payout.currency)}</div>
                            {payout.grossAmount !== null && payout.grossAmount !== undefined ? (
                              <div className="mt-2 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] font-semibold text-zinc-500">
                                <div className="flex justify-between gap-3"><span>Gross</span><span>{money(Number(payout.grossAmount || 0), payout.currency)}</span></div>
                                <div className="flex justify-between gap-3"><span>Platform commission</span><span>-{money(Number(payout.platformFeeAmount || 0), payout.currency)}</span></div>
                                <div className="flex justify-between gap-3"><span>Reserve</span><span>-{money(Number(payout.reserveAmount || 0), payout.currency)}</span></div>
                                <div className="flex justify-between gap-3"><span>Adjustments</span><span>-{money(Number(payout.manualAdjustmentAmount || 0), payout.currency)}</span></div>
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
                                  <div key={`${payout.id}-${message}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold">
                                    {message}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-zinc-500">{formatDate(payout.updatedAt)}</td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex min-h-[104px] flex-col justify-between px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm">{icon}</div>
      </div>

      <div className="mt-4 min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-500">{label}</p>
        <p className="mt-1 truncate text-lg font-black tracking-tight text-zinc-900">{value}</p>
      </div>
    </div>
  );
}

function MiniStatus({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm">{icon}</div>
        <div>
          <p className="text-sm font-black text-zinc-900">{title}</p>
          <p className="mt-0.5 text-xs font-semibold leading-5 text-zinc-500">{text}</p>
        </div>
      </div>
    </div>
  );
}
