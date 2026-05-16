import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuthUser } from "./hooks/useAuthUser";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { navigateBackOrPath } from "./lib/appNavigation";
import {
  createSellerPayoutDestination,
  fetchSellerPayoutDestinations,
} from "./lib/sellerPayoutApi";

const DEFAULT_COUNTRY_CURRENCY = "MWK";

type DestinationType = "mobile_money" | "bank";

type SellerPayoutDestination = {
  id: string;
  destinationType: DestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  maskedAccount: string;
  isDefault: boolean;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
};

export default function SellerPayoutPage() {
  const { user: firebaseUser } = useAuthUser();
  const { profile, profileLoading } = useAccountProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [destinations, setDestinations] = useState<SellerPayoutDestination[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    destinationType: "mobile_money" as DestinationType,
    providerName: "",
    providerRefId: "",
    accountName: "",
    accountNumber: "",
    mobile: "",
    isDefault: true,
  });

  const sellerUid = profile?.uid ?? firebaseUser?.uid ?? "";
  const formDisabled = !firebaseUser || !profile?.is_seller;

  const title = useMemo(() => {
    if (!profile?.is_seller) return "Seller payout access required";
    return "Seller payout settings";
  }, [profile?.is_seller]);

  const loadDestinations = async () => {
    if (!sellerUid) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSellerPayoutDestinations(sellerUid);
      const items = Array.isArray(result?.destinations) ? result.destinations : [];
      setDestinations(items);
    } catch (loadError: any) {
      setError(loadError?.message || "Failed to load payout destinations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDestinations();
  }, [sellerUid]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formDisabled) return;

    setSaving(true);
    setError(null);
    try {
      const payload = {
        sellerUid,
        destinationType: form.destinationType,
        providerName: form.providerName.trim(),
        providerRefId: form.providerRefId.trim() || null,
        currency: DEFAULT_COUNTRY_CURRENCY,
        accountName: form.accountName.trim(),
        accountNumber: form.destinationType === "bank" ? form.accountNumber.trim() : undefined,
        mobile: form.destinationType === "mobile_money" ? form.mobile.trim() : undefined,
        isDefault: form.isDefault,
      };

      await createSellerPayoutDestination(payload);
      setForm((current) => ({
        ...current,
        providerName: "",
        providerRefId: "",
        accountName: "",
        accountNumber: "",
        mobile: "",
      }));
      await loadDestinations();
    } catch (saveError: any) {
      setError(saveError?.message || "Failed to save payout destination.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller</p>
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">{title}</h1>
          </div>

          <button
            type="button"
            onClick={() => navigateBackOrPath("/settings")}
            className="rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
          >
            Back
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Payout destination</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Add or replace seller payout details</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadDestinations()}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          {profileLoading || loading ? (
            <div className="mt-6 flex items-center gap-3 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading payout destinations...
            </div>
          ) : !firebaseUser ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Login required.</div>
          ) : !profile?.is_seller ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Seller access is required before payout details can be saved.
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Destination type</label>
                <select
                  value={form.destinationType}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      destinationType: e.target.value as DestinationType,
                    }))
                  }
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
                >
                  <option value="mobile_money">Mobile money</option>
                  <option value="bank">Bank account</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Provider name</label>
                  <input
                    value={form.providerName}
                    onChange={(e) => setForm((current) => ({ ...current, providerName: e.target.value }))}
                    placeholder={form.destinationType === "bank" ? "National Bank" : "Airtel Money"}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Provider ref ID</label>
                  <input
                    value={form.providerRefId}
                    onChange={(e) => setForm((current) => ({ ...current, providerRefId: e.target.value }))}
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Account name</label>
                <input
                  value={form.accountName}
                  onChange={(e) => setForm((current) => ({ ...current, accountName: e.target.value }))}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              {form.destinationType === "bank" ? (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Account number</label>
                  <input
                    value={form.accountNumber}
                    onChange={(e) => setForm((current) => ({ ...current, accountNumber: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">Mobile number</label>
                  <input
                    value={form.mobile}
                    onChange={(e) => setForm((current) => ({ ...current, mobile: e.target.value }))}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none focus:ring-2 focus:ring-zinc-300"
                  />
                </div>
              )}

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((current) => ({ ...current, isDefault: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Set as default payout destination
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={saving || formDisabled}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Save payout destination
              </button>
            </form>
          )}
        </section>

        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-900">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-black tracking-tight">Saved destinations</h2>
          </div>
          <p className="mt-2 text-sm text-zinc-500">
            Payout details are stored privately and only the masked account is shown here.
          </p>

          <div className="mt-5 space-y-3">
            {destinations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
                No payout destination has been saved yet.
              </div>
            ) : (
              destinations.map((destination) => (
                <article key={destination.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-zinc-900">{destination.providerName}</p>
                      <p className="mt-1 text-sm text-zinc-600">{destination.accountName}</p>
                    </div>
                    {destination.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 text-xs font-medium text-zinc-500">
                    <p>
                      <span className="font-bold text-zinc-700">Type:</span> {destination.destinationType}
                    </p>
                    <p>
                      <span className="font-bold text-zinc-700">Account:</span> {destination.maskedAccount}
                    </p>
                    <p>
                      <span className="font-bold text-zinc-700">Status:</span> {destination.verificationStatus}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
