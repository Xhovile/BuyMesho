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
import { navigateToPath, SETTINGS_PATH } from "./lib/appNavigation";

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
  status: "eligible" | "queued" | "processing" | "pending" | "paid" | "failed" | "cancelled";
  provider: string | null;
  providerChargeId: string | null;
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
  if (["paid"].includes(status)) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (["failed"].includes(status)) return "bg-red-50 text-red-700 border-red-200";
  if (["pending", "queued", "processing", "eligible"].includes(status)) return "bg-amber-50 text-amber-700 border-amber-200";
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
      pending: amounts.eligible + amounts.queued + amounts.processing + amounts.pending,
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

  const handleRetryPayout = async (payoutId: string) => {
    setRefreshing(true);
    try {
      await apiFetch(`/api/admin/payouts/${payoutId}/retry`, { method: "POST" });
      setNotice({ type: "success", message: "Retry sent to payout queue." });
      await loadData();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Retry failed" });
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  if (profileLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
          <span className="font-semibold text-zinc-700">Loading seller payouts...</span>
        </div>
      </div>
    );
  }

  if (!isSeller) {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <button type="button" onClick={() => navigateToPath(SETTINGS_PATH)} className="inline-flex items-center gap-2 text-sm font-bold text-zinc-600 hover:text-zinc-900">
            <ArrowLeft className="w-4 h-4" />
            Back to settings
          </button>
          <div className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-black tracking-tight">Seller payouts</h1>
            <p className="mt-3 text-sm text-zinc-600">You are not marked as a seller yet. Seller payout tools appear here after the account is approved as a seller.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeDestinations = destinations.filter((item) => item.isActive);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigateToPath(SETTINGS_PATH)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50">
              <ArrowLeft className="w-4 h-4" />
              Settings
            </button>
            <button type="button" onClick={() => void handleRefresh()} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller payouts</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight">Payout control center.</h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                Set up your payout destination, track payout status, and keep a clean view of what is pending, paid, or failed.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:min-w-[340px]">
              <StatCard label="Total payout volume" value={money(summary.total)} icon={<Wallet className="w-4 h-4" />} />
              <StatCard label="Paid out" value={money(summary.paid)} icon={<BadgeCheck className="w-4 h-4" />} />
              <StatCard label="Pending" value={money(summary.pending)} icon={<ClipboardList className="w-4 h-4" />} />
              <StatCard label="Failed" value={money(summary.failed)} icon={<AlertTriangle className="w-4 h-4" />} />
            </div>
          </div>
        </section>

        {notice ? (
          <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : notice.type === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {notice.message}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Payout setup</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Add or update your payout destination.</h2>
                <p className="mt-2 text-sm text-zinc-600">Choose mobile money or bank, then store the payout destination securely on the server.</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-right">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Active destinations</p>
                <p className="mt-1 text-2xl font-black">{activeDestinations.length}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Destination type</span>
                <select value={form.destinationType} onChange={(e) => setForm((current) => ({ ...current, destinationType: e.target.value as DestinationType }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900">
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Provider / operator</span>
                <input value={form.providerName} onChange={(e) => setForm((current) => ({ ...current, providerName: e.target.value }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900" placeholder="e.g. TNM, Airtel, NBS" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Provider ref ID</span>
                <input value={form.providerRefId} onChange={(e) => setForm((current) => ({ ...current, providerRefId: e.target.value }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900" placeholder="Optional provider reference" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Account holder name</span>
                <input value={form.accountName} onChange={(e) => setForm((current) => ({ ...current, accountName: e.target.value }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900" placeholder="Name on bank account or wallet" />
              </label>
              {form.destinationType === "bank" ? (
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Account number</span>
                  <input value={form.accountNumber} onChange={(e) => setForm((current) => ({ ...current, accountNumber: e.target.value }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900" placeholder="Bank account number" />
                </label>
              ) : (
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Mobile number</span>
                  <input value={form.mobile} onChange={(e) => setForm((current) => ({ ...current, mobile: e.target.value }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900" placeholder="Mobile wallet number" />
                </label>
              )}
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">Currency</span>
                <input value={form.currency} onChange={(e) => setForm((current) => ({ ...current, currency: e.target.value.toUpperCase() }))} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-zinc-900" placeholder="MWK" />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setForm((current) => ({ ...current, isDefault: !current.isDefault }))} className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold ${form.isDefault ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}>
                <ShieldCheck className="w-4 h-4" />
                {form.isDefault ? "Default destination" : "Make default"}
              </button>

              <button type="button" onClick={handleSaveDestination} disabled={savingDestination} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 disabled:opacity-60">
                {savingDestination ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {selectedDestinationId ? "Update destination" : "Save destination"}
              </button>

              {selectedDestinationId ? (
                <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
                  <Trash2 className="w-4 h-4" />
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
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
              <MiniStatus icon={<BadgeCheck className="w-4 h-4" />} title="Paid" text="The provider confirmed the seller payout has been completed." />
              <MiniStatus icon={<AlertTriangle className="w-4 h-4" />} title="Failed" text="A failed payout stays visible and retryable from the admin side." />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Payout destinations</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Saved destinations</h2>
              </div>
              <Building2 className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="mt-5 space-y-3">
              {destinations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                  No payout destination yet.
                </div>
              ) : (
                destinations.map((destination) => (
                  <div key={destination.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${destinationTone(destination.verificationStatus)}`}>
                            {destination.verificationStatus}
                          </span>
                          {destination.isDefault ? <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-sky-700">Default</span> : null}
                        </div>
                        <h3 className="mt-3 text-base font-black tracking-tight">{destination.accountName}</h3>
                        <p className="mt-1 text-sm text-zinc-600 inline-flex items-center gap-2">
                          {destination.destinationType === "bank" ? <Building2 className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          {destination.providerName} · {destination.maskedAccount}
                        </p>
                      </div>
                      <button type="button" onClick={() => startEdit(destination)} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50">
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

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">Payout history</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Release, paid, failed.</h2>
              </div>
              <Wallet className="w-5 h-5 text-zinc-400" />
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200">
              <div className="max-h-[520px] overflow-auto">
                <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Status</th>
                      <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Amount</th>
                      <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Order</th>
                      <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]">Updated</th>
                      <th className="px-4 py-3 font-extrabold uppercase tracking-[0.14em] text-[11px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {payouts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-zinc-500">No payout activity yet.</td>
                      </tr>
                    ) : (
                      payouts.map((payout) => (
                        <tr key={payout.id} className="align-top">
                          <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.16em] ${statusTone(payout.status)}`}>{payout.status}</span></td>
                          <td className="px-4 py-4 font-bold text-zinc-900">{money(Number(payout.amount || 0), payout.currency)}</td>
                          <td className="px-4 py-4 text-zinc-600">{payout.orderId || payout.escrowId || "—"}</td>
                          <td className="px-4 py-4 text-zinc-500">{formatDate(payout.updatedAt)}</td>
                          <td className="px-4 py-4 text-right">
                            {payout.status === "failed" ? (
                              <button type="button" onClick={() => void handleRetryPayout(payout.id)} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white hover:bg-zinc-800">
                                Retry
                              </button>
                            ) : null}
                          </td>
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

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-700">{icon}</div>
        <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Dashboard</span>
      </div>
      <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-black tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}

function MiniStatus({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
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
