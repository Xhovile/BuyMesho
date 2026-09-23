import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, CreditCard, Database, Loader2, Mail, RefreshCw, XCircle } from "lucide-react";
import AdminRouteGuard from "../components/AdminRouteGuard";
import { apiFetch } from "../lib/api";
import { navigateToPath } from "../lib/appNavigation";
import { type PaymentStatus, type StudioAdminPayment } from "./config";
import { formatDate } from "./admin/AdminUi";
import AdminWorkspaceViews from "./admin/AdminViews";
import { NAV_ITEMS, VIEW_LABELS, type AdminSnapshot, type ViewKey } from "./admin/types";
import xsLogo from "../../photos/XSLOGO.svg";

function AdminConsole() {
  const [view, setView] = useState<ViewKey>("overview");
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | PaymentStatus>("all");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<StudioAdminPayment | null>(null);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = (await apiFetch("/api/admin/xhovile-studio?limit=250", {
        retryAttempts: 2,
      })) as AdminSnapshot;

      setSnapshot(data);
      setLastRefresh(new Date().toISOString());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load Xhovilé Studio admin data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const handlePopState = () => {
      const raw = new URLSearchParams(window.location.search).get("view") as ViewKey | null;
      if (raw && VIEW_LABELS[raw]) setView(raw);
      else setView("overview");
    };

    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectView = (nextView: ViewKey) => {
    setView(nextView);
    const url = nextView === "overview"
      ? "/Services/XhovileStudio/Admin"
      : "/Services/XhovileStudio/Admin?view=" + encodeURIComponent(nextView);
    window.history.replaceState(window.history.state, "", url);
  };

  const filteredPayments = useMemo(() => {
    const payments = snapshot?.payments ?? [];
    const q = paymentQuery.trim().toLowerCase();
    return payments.filter((payment) => {
      const matchesStatus = paymentStatusFilter === "all" || payment.status === paymentStatusFilter;
      if (!matchesStatus) return false;
      if (!q) return true;

      return [
        payment.customerName,
        payment.customerPhone,
        payment.customerEmail || "",
        payment.description,
        payment.projectReference || "",
        payment.paymentReference || "",
        payment.providerReference || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [paymentQuery, paymentStatusFilter, snapshot?.payments]);

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen bg-[#f6f1ea] text-zinc-900">
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-bold text-zinc-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Xhovilé Studio Admin…
          </div>
        </div>
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="min-h-screen bg-[#f6f1ea] p-5 text-zinc-900 sm:p-8">
        <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-red-200 bg-white p-7 text-center shadow-sm">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Xhovilé Studio</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight">Admin data unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{error}</p>
            <button
              type="button"
              onClick={() => void load(false)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const summary = snapshot?.summary;
  const system = snapshot?.system;

  const attentionCount =
    (summary?.pendingPayments ?? 0) +
    (summary?.failedPayments ?? 0) +
    (summary?.notificationFailed ?? 0) +
    (summary?.webhookFailed ?? 0);

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => window.location.assign("/Services/XhovileStudio")}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Studio
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={(refreshing ? "animate-spin " : "") + "h-4 w-4"} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigateToPath("/")}
              className="hidden rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:inline-flex"
            >
              BuyMesho
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-900 bg-[#10151a] p-5 text-white shadow-xl sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-2xl bg-[#8f1528] px-3 py-2">
                <img src={xsLogo} alt="Xhovilé Studio" className="h-9 w-auto" />
              </div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Studio Administration</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Admin Control Room</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                Monitor payments, customers, project references, email notifications, and PayChangu webhook activity from one workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="font-bold text-white">Admin monitoring active</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {lastRefresh ? "Updated " + formatDate(lastRefresh) : "Waiting for update"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-zinc-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Studio database</span>
            </div>
            <p className="mt-2 text-sm font-black text-zinc-900">{system?.databaseConnected ? "Connected" : "Unavailable"}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-zinc-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">PayChangu</span>
            </div>
            <p className="mt-2 text-sm font-black text-zinc-900">{system?.paychanguConfigured ? "Configured" : "Not configured"}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Email transport</span>
            </div>
            <p className="mt-2 text-sm font-black text-zinc-900">{system?.brevoConfigured ? "Brevo configured" : "Not configured"}</p>
          </div>
        </section>

        <nav className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Studio Workspace</p>
            <p className="mt-1 text-sm text-zinc-500">Choose what you want to monitor.</p>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3">
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => selectView(item.key)}
                  className={
                    "group flex min-h-[112px] items-center gap-4 px-5 py-5 text-left transition-colors " +
                    (index > 0 ? "border-t border-zinc-200 " : "") +
                    (index > 1 ? "md:border-t " : "") +
                    (active ? "bg-zinc-50 " : "hover:bg-zinc-50")
                  }
                >
                  <span
                    className={
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors " +
                      (active ? "bg-[#8f1528] text-white" : "bg-zinc-100 text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white")
                    }
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-black text-zinc-900">{item.label}</span>
                      {item.key === "overview" && attentionCount > 0 ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700 ring-1 ring-red-100">
                          {attentionCount > 99 ? "99+" : attentionCount}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-zinc-500">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error} Showing the last successfully loaded snapshot.</p>
          </div>
        ) : null}

        <AdminWorkspaceViews
          view={view}
          snapshot={snapshot}
          summary={summary}
          system={system}
          filteredPayments={filteredPayments}
          paymentQuery={paymentQuery}
          setPaymentQuery={setPaymentQuery}
          paymentStatusFilter={paymentStatusFilter}
          setPaymentStatusFilter={setPaymentStatusFilter}
          selectedPayment={selectedPayment}
          setSelectedPayment={setSelectedPayment}
          selectView={selectView}
        />

        <footer className="pb-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">
          Xhovilé Studio Admin · {VIEW_LABELS[view]}
        </footer>
      </main>
    </div>
  );
}

export default function XhovileStudioAdminPage() {
  return (
    <AdminRouteGuard>
      <AdminConsole />
    </AdminRouteGuard>
  );
}
