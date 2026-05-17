import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  BadgeCheck,
  Building2,
  ChevronRight,
  ClipboardList,
  Loader2,
  Phone,
  RefreshCw,
  ShieldCheck,
  Wallet,
  AlertTriangle,
  Trash2,
  Save,
} from "lucide-react";
import BrandMark from "./components/BrandMark";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";
import { navigateToPath} from "./lib/appNavigation";

type DestinationType = "mobile_money" | "bank";

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
  status: "eligible" | "queued" | "processing" | "pending" | "held" | "paid" | "failed" | "cancelled";
  provider: string | null;
  providerChargeId: string | null;
  providerStatus?: string | null;
  failure_reason?: string | null;
  manual_review_reason?: string | null;
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

type FormState = {
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string;
  currency: string;
  accountName: string;
  accountNumber: string;
  mobile: string;
  isDefault: boolean;
};

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

function statusTone(status: string) {
  if (status === "paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
  if (["pending", "queued", "processing", "eligible", "held"].includes(status)) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function destinationTone(status: string) {
  if (status === "verified") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sellerFacingPayoutSummary(payout: PayoutRecord) {
  if (payout.status === "held") {
    return {
      title: "Payout held for review",
      detail: "Awaiting admin action",
    };
  }

  if (payout.status === "paid") {
    return {
      title: "Paid",
      detail: "Provider confirmed the payout.",
    };
  }

  if (["queued", "processing", "pending", "eligible"].includes(payout.status)) {
    return {
      title: "In progress",
      detail: "Awaiting provider processing.",
    };
  }

  if (payout.status === "failed") {
    return {
      title: "Payout failed",
      detail: "Awaiting admin review.",
    };
  }

  return {
    title: payout.status,
    detail: "Awaiting payout update.",
  };
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
    setForm(INITIAL_FORM);
  };

  const handleSaveDestination = async () => {
    if (!sellerId) return;
    if (!form.providerName.trim() || !form.accountName.trim()) {
      setNotice({ type: "info", message: "Provider and account name are required." });
      return;
    }

    if (form.destinationType === "bank" && !form.accountNumber.trim()) {
      setNotice({ type: "info", message: "Bank account number is required." });
      return;
    }

    if (form.destinationType === "mobile_money" && !form.mobile.trim()) {
      setNotice({ type: "info", message: "Mobile number is required." });
      return;
    }

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
        await apiFetch(`/api/payouts/destinations/${selectedDestinationId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/api/payouts/destinations`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setNotice({ type: "success", message: selectedDestinationId ? "Payout destination updated." : "Payout destination saved." });
      resetForm();
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to save destination" });
    } finally {
      setSavingDestination(false);
    }
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
            onClick={() => navigateToPath()}
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
    <div className="min-h-screen overflow-x-hidden bg-[#f4f5f7] text-zinc-900">
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
          <div className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Payout setup</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Add or update your payout destination.</h2>
                <p className="mt-2 text-sm text-zinc-600">
                  Choose mobile money or bank, then store the payout destination securely on the server.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Active destinations</p>
                <p className="mt-1 text-2xl font-black">{activeDestinations.length}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Destination type</span>
                <select
                  value={form.destinationType}
                  onChange={(e) => setForm((current) => ({ ...current, destinationType: e.target.value as DestinationType }))}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Provider / operator</span>
                <input
                  value={form.providerName}
                  onChange={(e) => setForm((current) => ({ ...current, providerName: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                  placeholder="e.g. TNM, Airtel, NBS"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Provider ref ID</span>
                <input
                  value={form.providerRefId}
                  onChange={(e) => setForm((current) => ({ ...current, providerRefId: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                  placeholder="Optional provider reference"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Account holder name</span>
                <input
                  value={form.accountName}
                  onChange={(e) => setForm((current) => ({ ...current, accountName: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                  placeholder="Name on bank account or wallet"
                />
              </label>

              {form.destinationType === "bank" ? (
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Account number</span>
                  <input
                    value={form.accountNumber}
                    onChange={(e) => setForm((current) => ({ ...current, accountNumber: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                    placeholder="Bank account number"
                  />
                </label>
              ) : (
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Mobile number</span>
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm((current) => ({ ...current, mobile: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                    placeholder="Mobile wallet number"
                  />
                </label>
              )}

              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Currency</span>
                <input
                  value={form.currency}
                  onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))}
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-zinc-900"
                  placeholder="MWK"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, isDefault: !current.isDefault }))}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold ${
                  form.isDefault ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                {form.isDefault ? "Default destination" : "Make default"}
              </button>

              <button
                type="button"
                onClick={handleSaveDestination}
                disabled={savingDestination || !canEditSettings}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {savingDestination ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {selectedDestinationId ? "Update destination" : "Save destination"}
              </button>

              {selectedDestinationId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

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
          <div className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
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
        <div key={destination.id} className="min-w-[360px] max-w-[360px] rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${destinationTone(destination.verificationStatus)}`}>
                  {destination.verificationStatus}
                </span>
                {destination.isDefault ? (
                  <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-700">
                    Default
                  </span>
                ) : null}
              </div>

              <h3 className="mt-3 text-base font-black tracking-tight">{destination.accountName}</h3>
              <p className="mt-1 flex items-center gap-2 text-sm text-zinc-600">
                {destination.destinationType === "bank" ? <Building2 className="w-4 h-4 shrink-0" /> : <Phone className="w-4 h-4 shrink-0" />}
                <span className="truncate">{destination.providerName} · {destination.maskedAccount}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => startEdit(destination)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
              disabled={!canEditSettings}
            >
              Edit
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
            <MetaBox label="Updated" value={formatDate(destination.updatedAt)} />
            <MetaBox label="Verified" value={formatDate(destination.verifiedAt)} />
          </div>
        </div>
      ))
    )}
  </div>
</div>
</div>

          <div className="rounded-[28px] border border-zinc-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)]">
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
                      <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Status</th>
                      <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Amount</th>
                      <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Order</th>
                      <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Updated</th>
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
                        <td colSpan={4} className="px-4 py-6 text-zinc-500">
                          No payout activity yet.
                        </td>
                      </tr>
                    ) : (
                      payouts.map((payout) => (
                        <tr key={payout.id} className="align-top">
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${statusTone(payout.status)}`}>{payout.status}</span>
                              {payout.status === "held" ? (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                                  <div>Payout held for review</div>
                                  <div>Awaiting admin action</div>
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold text-zinc-900">{money(Number(payout.amount || 0), payout.currency)}</td>
                          <td className="px-4 py-4 text-zinc-600">
                            <div>{payout.orderId || payout.escrowId || "—"}</div>
                            <div className="mt-1 text-xs font-semibold text-zinc-700">{sellerFacingPayoutSummary(payout).title}</div>
                            <div className="mt-1 text-xs text-zinc-500">{sellerFacingPayoutSummary(payout).detail}</div>
                          </td>
                          <td className="px-4 py-4 text-zinc-500">{formatDate(payout.updatedAt)}</td>
                        </tr>
                      ))
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
        <div className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700">{icon}</div>
        <div>
          <p className="font-black text-zinc-900">{title}</p>
          <p className="text-sm text-zinc-600">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MetaBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  );
}
