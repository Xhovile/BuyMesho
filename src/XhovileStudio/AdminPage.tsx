import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  FolderKanban,
  LayoutDashboard,
  Loader2,
  Mail,
  RefreshCw,
  Server,
  Users,
  Webhook,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AdminRouteGuard from "../components/AdminRouteGuard";
import AdminPayments from "./admin/AdminPayments";
import AdminCustomersProjects from "./admin/AdminCustomersProjects";
import AdminNotifications from "./admin/AdminNotifications";
import AdminWebhooks from "./admin/AdminWebhooks";
import AdminSystem from "./admin/AdminSystem";
import { apiFetch } from "../lib/api";
import { navigateToPath } from "../lib/appNavigation";
import { formatMoney, type PaymentStatus, type StudioAdminPayment } from "./config";
import xsLogo from "../../photos/XSLOGO.svg";

type ViewKey = "overview" | "payments" | "customers" | "projects" | "notifications" | "webhooks" | "system";

type AdminCustomer = {
  customerPhone: string;
  customerName: string;
  customerEmail: string | null;
  paymentCount: number;
  paidCount: number;
  paidAmount: number;
  projectCount: number;
  lastActivityAt: string;
};

type AdminProject = {
  projectReference: string;
  customerName: string;
  customerPhone: string;
  paymentCount: number;
  paidAmount: number;
  lastActivityAt: string;
  latestStatus: PaymentStatus;
};

type AdminSnapshot = {
  success: boolean;
  summary: {
    totalPayments: number;
    paidPayments: number;
    pendingPayments: number;
    failedPayments: number;
    refundedPayments: number;
    paidRevenue: number;
    todayPaidPayments: number;
    todayPaidRevenue: number;
    customerCount: number;
    projectCount: number;
    notificationPending: number;
    notificationFailed: number;
    webhookReceived: number;
    webhookFailed: number;
    lastPaymentAt: string | null;
    lastWebhookAt: string | null;
  };
  payments: StudioAdminPayment[];
  customers: AdminCustomer[];
  projects: AdminProject[];
  notifications: StudioAdminPayment[];
  webhooks: Array<{
    id: number;
    providerEventId: string | null;
    paymentReference: string | null;
    eventType: string | null;
    payloadHash: string;
    status: string;
    signatureValid: boolean;
    error: string | null;
    createdAt: string;
    processedAt: string | null;
  }>;
  system: {
    databaseConnected: boolean;
    databaseCheckedAt: string | null;
    paychanguConfigured: boolean;
    webhookSecretConfigured: boolean;
    brevoConfigured: boolean;
    cloudinaryConfigured: boolean;
    notificationEmail: string;
    environment: string;
  };
};

const VIEW_LABELS: Record<ViewKey, string> = {
  overview: "Overview",
  payments: "Payments",
  customers: "Customers",
  projects: "Projects",
  notifications: "Notifications",
  webhooks: "Webhooks",
  system: "System",
};

const NAV_ITEMS: Array<{ key: ViewKey; label: string; description: string; icon: LucideIcon }> = [
  { key: "overview", label: "Overview", description: "Live operating picture for Xhovilé Studio.", icon: LayoutDashboard },
  { key: "payments", label: "Payments", description: "Track every Studio checkout and payment status.", icon: CreditCard },
  { key: "customers", label: "Customers", description: "See customer activity, spend, and project count.", icon: Users },
  { key: "projects", label: "Projects", description: "Follow project references across payments.", icon: FolderKanban },
  { key: "notifications", label: "Notifications", description: "Monitor internal payment email delivery.", icon: Bell },
  { key: "webhooks", label: "Webhooks", description: "Inspect PayChangu webhook receipt and processing.", icon: Webhook },
  { key: "system", label: "System", description: "Check Studio database and integration configuration.", icon: Server },
];

function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-MW", { dateStyle: "medium", timeStyle: includeTime ? "short" : undefined }).format(date);
}

function StatCard({ icon: Icon, label, value, helper }: { icon: LucideIcon; label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-tight text-zinc-950">{value}</p>
          {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700"><Icon className="h-5 w-5" /></span>
      </div>
    </div>
  );
}

function SectionCard({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p> : null}
          <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500">{label}</div>;
}

function AdminConsole() {
  const [view, setView] = useState<ViewKey>("overview");
  const [focusedPaymentId, setFocusedPaymentId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = (await apiFetch("/api/admin/xhovile-studio?limit=250", { retryAttempts: 2 })) as AdminSnapshot;
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
      const params = new URLSearchParams(window.location.search);
      const rawView = params.get("view") as ViewKey | null;
      setView(rawView && VIEW_LABELS[rawView] ? rawView : "overview");
      setFocusedPaymentId(params.get("payment"));
    };
    handlePopState();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const selectView = (nextView: ViewKey, paymentId: string | null = null) => {
    setView(nextView);
    setFocusedPaymentId(paymentId);
    const params = new URLSearchParams();
    if (nextView !== "overview") params.set("view", nextView);
    if (paymentId) params.set("payment", paymentId);
    const query = params.toString();
    window.history.replaceState(window.history.state, "", "/Services/XhovileStudio/Admin" + (query ? "?" + query : ""));
  };

  const clearFocusedPayment = () => {
    setFocusedPaymentId(null);
    const params = new URLSearchParams(window.location.search);
    params.delete("payment");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", "/Services/XhovileStudio/Admin" + (query ? "?" + query : ""));
  };

  if (loading && !snapshot) {
    return <div className="min-h-screen bg-[#f6f1ea] text-zinc-900"><div className="flex min-h-screen items-center justify-center p-6"><div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-bold text-zinc-700 shadow-sm"><Loader2 className="h-5 w-5 animate-spin" /> Loading Xhovilé Studio Admin…</div></div></div>;
  }

  if (error && !snapshot) {
    return <div className="min-h-screen bg-[#f6f1ea] p-5 text-zinc-900 sm:p-8"><div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center"><div className="w-full rounded-[2rem] border border-red-200 bg-white p-7 text-center shadow-sm"><XCircle className="mx-auto h-12 w-12 text-red-500" /><p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Xhovilé Studio</p><h1 className="mt-2 text-2xl font-black tracking-tight">Admin data unavailable</h1><p className="mt-3 text-sm leading-6 text-zinc-600">{error}</p><button type="button" onClick={() => void load(false)} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-zinc-800"><RefreshCw className="h-4 w-4" /> Try Again</button></div></div></div>;
  }

  const summary = snapshot?.summary;
  const system = snapshot?.system;
  const attentionCount = (summary?.pendingPayments ?? 0) + (summary?.failedPayments ?? 0) + (summary?.notificationFailed ?? 0) + (summary?.webhookFailed ?? 0);

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => window.location.assign("/Services/XhovileStudio")} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"><ArrowLeft className="h-4 w-4" /> Studio</button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void load(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw className={(refreshing ? "animate-spin " : "") + "h-4 w-4"} /> Refresh</button>
            <button type="button" onClick={() => navigateToPath("/")} className="hidden rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:inline-flex">BuyMesho</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-zinc-900 bg-[#10151a] p-5 text-white shadow-xl sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-2xl bg-[#8f1528] px-3 py-2"><img src={xsLogo} alt="Xhovilé Studio" className="h-9 w-auto" /></div>
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Studio Administration</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Admin Control Room</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">Monitor payments, customers, project references, email notifications, and PayChangu webhook activity from one workspace.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /><span className="font-bold text-white">Admin monitoring active</span></div><p className="mt-1 text-xs text-zinc-500">{lastRefresh ? "Updated " + formatDate(lastRefresh) : "Waiting for update"}</p></div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Database className="h-4 w-4 text-zinc-500" /><span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Studio database</span></div><p className="mt-2 text-sm font-black text-zinc-900">{system?.databaseConnected ? "Connected" : "Unavailable"}</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-zinc-500" /><span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">PayChangu</span></div><p className="mt-2 text-sm font-black text-zinc-900">{system?.paychanguConfigured ? "Configured" : "Not configured"}</p></div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-500" /><span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">Email transport</span></div><p className="mt-2 text-sm font-black text-zinc-900">{system?.brevoConfigured ? "Brevo configured" : "Not configured"}</p></div>
        </section>

        <nav className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Studio Workspace</p><p className="mt-1 text-sm text-zinc-500">Choose what you want to monitor.</p></div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3">
            {NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const active = view === item.key;
              return <button key={item.key} type="button" onClick={() => selectView(item.key)} className={"group flex min-h-[112px] items-center gap-4 px-5 py-5 text-left transition-colors " + (index > 0 ? "border-t border-zinc-200 " : "") + (index > 1 ? "md:border-t " : "") + (active ? "bg-zinc-50 " : "hover:bg-zinc-50")}><span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors " + (active ? "bg-[#8f1528] text-white" : "bg-zinc-100 text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white")}><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="text-sm font-black text-zinc-900">{item.label}</span>{item.key === "overview" && attentionCount > 0 ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700 ring-1 ring-red-100">{attentionCount > 99 ? "99+" : attentionCount}</span> : null}</span><span className="mt-1 block text-sm leading-5 text-zinc-500">{item.description}</span></span></button>;
            })}
          </div>
        </nav>

        {error ? <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error} Showing the last successfully loaded snapshot.</p></div> : null}

        {view === "overview" && summary ? (
          <>
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <StatCard icon={CircleDollarSign} label="Paid revenue" value={formatMoney(summary.paidRevenue)} helper="Confirmed Studio payments" />
              <StatCard icon={CheckCircle2} label="Paid payments" value={summary.paidPayments.toLocaleString()} helper={summary.todayPaidPayments.toLocaleString() + " paid today"} />
              <StatCard icon={Clock3} label="Pending" value={summary.pendingPayments.toLocaleString()} helper="Still awaiting confirmation" />
              <StatCard icon={XCircle} label="Failed" value={summary.failedPayments.toLocaleString()} helper="Failed or declined checkouts" />
              <StatCard icon={CreditCard} label="Refunded" value={summary.refundedPayments.toLocaleString()} helper="Recorded refunded payments" />
              <StatCard icon={Users} label="Customers" value={summary.customerCount.toLocaleString()} helper="Unique phone numbers" />
              <StatCard icon={FolderKanban} label="Projects" value={summary.projectCount.toLocaleString()} helper="Referenced Studio projects" />
              <StatCard icon={Bell} label="Email issues" value={(summary.notificationPending + summary.notificationFailed).toLocaleString()} helper={summary.notificationFailed.toLocaleString() + " failed delivery records"} />
            </section>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
              <SectionCard title="Recent payments" eyebrow="Live activity" action={<span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">Latest 250 records</span>}>
                {snapshot?.payments.length ? <div className="overflow-hidden rounded-2xl border border-zinc-200"><div className="hidden grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 bg-zinc-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400 sm:grid sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]"><span>Customer</span><span>Service / Project</span><span className="text-right">Amount / Time</span><span className="text-right">Status</span></div>{snapshot.payments.slice(0, 10).map(payment => <button key={payment.id} type="button" onClick={() => selectView("payments", String(payment.id))} className="grid w-full grid-cols-[minmax(150px,1.15fr)_minmax(140px,1fr)_auto_auto] gap-4 border-b border-zinc-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-zinc-50 sm:grid-cols-[minmax(170px,1.1fr)_minmax(200px,1fr)_auto_auto]"><div className="min-w-0"><p className="truncate text-sm font-black text-zinc-900">{payment.customerName}</p><p className="mt-0.5 truncate text-xs text-zinc-500">{payment.customerPhone}</p></div><div className="min-w-0"><p className="truncate text-xs font-bold text-zinc-800">{payment.serviceType}</p><p className="mt-0.5 truncate text-[11px] text-zinc-500">{payment.projectReference || "No project reference"}</p></div><div className="text-right"><p className="text-sm font-black text-zinc-950">{formatMoney(payment.amount, payment.currency)}</p><p className="mt-0.5 text-[10px] text-zinc-400">{formatDate(payment.createdAt)}</p></div><div className="flex items-center justify-end"><StatusPill value={payment.status} /></div></button>)}</div> : <EmptyState label="No Studio payments have been recorded yet." />}
              </SectionCard>
              <SectionCard title="Attention" eyebrow="Operational signals"><div className="space-y-3"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Pending payments</p><p className="mt-1 text-2xl font-black text-amber-900">{summary.pendingPayments}</p><p className="mt-1 text-xs leading-5 text-amber-800">Payments that have not yet reached a confirmed paid state.</p></div><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-700">Failed notifications</p><p className="mt-1 text-2xl font-black text-red-900">{summary.notificationFailed}</p><p className="mt-1 text-xs leading-5 text-red-800">Successful payments whose internal notification email needs attention.</p></div><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">Webhook failures</p><p className="mt-1 text-2xl font-black text-zinc-900">{summary.webhookFailed}</p><p className="mt-1 text-xs leading-5 text-zinc-600">PayChangu webhook events recorded as failed.</p></div></div></SectionCard>
            </div>
            <SectionCard title="Today" eyebrow="Confirmed payment activity"><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Paid today</p><p className="mt-2 text-2xl font-black text-zinc-950">{summary.todayPaidPayments}</p></div><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Revenue today</p><p className="mt-2 text-2xl font-black text-zinc-950">{formatMoney(summary.todayPaidRevenue)}</p></div><div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Last payment activity</p><p className="mt-2 text-sm font-black text-zinc-950">{formatDate(summary.lastPaymentAt)}</p></div></div></SectionCard>
          </>
        ) : null}

        {view === "payments" && snapshot ? <AdminPayments payments={snapshot.payments} focusPaymentId={focusedPaymentId} onFocusConsumed={clearFocusedPayment} /> : null}
        {view === "customers" && snapshot ? <AdminCustomersProjects customers={snapshot.customers} projects={[]} /> : null}
        {view === "projects" && snapshot ? <AdminCustomersProjects customers={[]} projects={snapshot.projects} /> : null}

        {view === "notifications" && snapshot ? (
          <AdminNotifications
            notifications={snapshot.notifications}
            recipient={system?.notificationEmail ?? "—"}
            onSelectPayment={(paymentId) => selectView("payments", paymentId)}
          />
        ) : null}

        {view === "webhooks" && snapshot ? <AdminWebhooks webhooks={snapshot.webhooks} /> : null}

        {view === "system" && system ? (
          <AdminSystem
            system={system}
            summary={{
              webhookReceived: summary?.webhookReceived ?? 0,
              lastWebhookAt: summary?.lastWebhookAt ?? null,
              lastPaymentAt: summary?.lastPaymentAt ?? null,
            }}
          />
        ) : null}

        <footer className="pb-4 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">Xhovilé Studio Admin · {VIEW_LABELS[view]}</footer>
      </main>
    </div>
  );
}

export default function XhovileStudioAdminPage() {
  return <AdminRouteGuard><AdminConsole /></AdminRouteGuard>;
}