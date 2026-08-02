import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { AlertCircle, ArrowRight, CalendarDays, Clock3, Download, Filter, LayoutDashboard, Loader2, Search, Ticket, Wallet } from "lucide-react";

import loaderImage from "../photos/LoaderPic.png";
import AccountPageShell from "./components/AccountPageShell";
import { apiFetch } from "./lib/api";
import { EVENTS_MANAGE_PATH, navigateToPath } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { formatMoney } from "./shared/utils/formatMoney";

type DashboardEvent = {
  id: number;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  status: string;
  updated_at: string;
  tickets_sold: number;
  gross_revenue_amount: number;
  net_revenue_amount: number;
  revenue_currency: string;
  ticket_clicks: number;
  cart_adds: number;
  message_threads: number;
  last_activity_at: string | null;
  pending_issues: boolean;
};

type DashboardResponse = {
  creator: Record<string, unknown> | null;
  events: DashboardEvent[];
  summary: {
    totalTicketsSold: number;
    grossRevenueAmount: number;
    netRevenueAmount: number;
    revenueAmount: number;
    revenueCurrency: string;
    activeEvents: number;
    pendingIssues: number;
  };
};

type StatusFilter = "all" | "published" | "inactive" | "cancelled" | "draft";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "inactive":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "draft":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

function transactionStatusClass(hasRevenue: boolean, pendingIssues: boolean) {
  if (hasRevenue) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (pendingIssues) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function transactionStatusLabel(event: DashboardEvent) {
  if (event.gross_revenue_amount > 0) {
    return "Successful · awaiting midnight settlement";
  }
  if (event.pending_issues) {
    return "Needs attention";
  }
  return "No captured payments yet";
}

function transactionSettlementNote(event: DashboardEvent) {
  if (event.gross_revenue_amount > 0) {
    return "Payments made today will be available the next day after midnight. The exact time may vary slightly, but it follows the T+1 cycle.";
  }
  return "No captured event payments yet.";
}

function settlementFeeAmount(event: DashboardEvent) {
  const fee = Number(event.gross_revenue_amount || 0) - Number(event.net_revenue_amount || 0);
  return fee > 0 ? fee : 0;
}

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper?: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{value}</p>
          {helper ? <p className="mt-1 text-xs font-medium text-zinc-500">{helper}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
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
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-zinc-400">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      </div>
      {action ? action : null}
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintableDashboardHtml(params: {
  title: string;
  logoUrl: string;
  summary: DashboardResponse["summary"];
  events: DashboardEvent[];
  filters: { query: string; status: StatusFilter; eventType: string; dateFrom: string; dateTo: string };
}) {
  const { title, logoUrl, summary, events, filters } = params;
  const now = new Date().toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const rows = events
    .map(
      (event) => `
        <tr>
          <td><strong>${escapeHtml(event.event_title)}</strong><div class="muted">${escapeHtml(event.event_type)} • ${escapeHtml(event.organizer_name)}</div></td>
          <td>${escapeHtml(transactionStatusLabel(event))}</td>
          <td>${escapeHtml(formatMoney(event.gross_revenue_amount, event.revenue_currency))}</td>
          <td>${escapeHtml(formatMoney(settlementFeeAmount(event), event.revenue_currency))}</td>
          <td>${escapeHtml(formatMoney(event.net_revenue_amount, event.revenue_currency))}</td>
          <td>${event.tickets_sold}</td>
          <td>${event.ticket_clicks} / ${event.cart_adds} / ${event.message_threads}</td>
          <td>${escapeHtml(formatDateTime(event.last_activity_at || event.updated_at))}</td>
        </tr>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #ffffff; }
    h1 { margin: 0; font-size: 28px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .brand img { width: 44px; height: 44px; border-radius: 14px; object-fit: cover; border: 1px solid #e2e8f0; }
    .brand-copy { display: flex; flex-direction: column; gap: 2px; }
    .brand-name { font-size: 18px; font-weight: 900; letter-spacing: -.03em; line-height: 1; }
    .brand-name .buy { color: #7f1d1d; }
    .brand-name .mesho { color: #334155; }
    .brand-sub { color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: .18em; font-weight: 700; }
    .sub { color: #475569; font-size: 13px; margin-top: 8px; line-height: 1.5; }
    .meta { margin-top: 8px; color: #64748b; font-size: 12px; }
    .grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; }
    .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: .18em; color: #94a3b8; font-weight: 700; }
    .card .value { margin-top: 8px; font-size: 22px; font-weight: 800; }
    .card .note { margin-top: 6px; font-size: 11px; color: #64748b; line-height: 1.4; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 12px; }
    thead th { text-align: left; background: #f8fafc; color: #94a3b8; text-transform: uppercase; letter-spacing: .14em; font-size: 10px; padding: 10px; border-bottom: 1px solid #e2e8f0; }
    tbody td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    .muted { color: #64748b; font-size: 11px; margin-top: 4px; }
    .footer { margin-top: 18px; color: #94a3b8; font-size: 11px; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="brand">
    <img src="${escapeHtml(logoUrl)}" alt="BuyMesho logo" />
    <div class="brand-copy">
      <div class="brand-name"><span class="buy">Buy</span><span class="mesho">Mesho</span></div>
      <div class="brand-sub">Creator dashboard export</div>
    </div>
  </div>

  <h1>${escapeHtml(title)}</h1>
  <div class="sub">Creator dashboard export for your events. Successful payments are captured now and settle after midnight on a T+1 cycle.</div>
  <div class="meta">Exported ${escapeHtml(now)} • Filters: ${escapeHtml(filters.query || "All events")} • ${escapeHtml(filters.status)} • ${escapeHtml(filters.eventType)} • ${escapeHtml(filters.dateFrom || "Any start date")} → ${escapeHtml(filters.dateTo || "Any end date")}</div>

  <div class="grid">
    <div class="card"><div class="label">Total tickets sold</div><div class="value">${summary.totalTicketsSold}</div><div class="note">All published ticket purchases in scope.</div></div>
    <div class="card"><div class="label">Gross sales</div><div class="value">${escapeHtml(formatMoney(summary.grossRevenueAmount, summary.revenueCurrency))}</div><div class="note">Before platform fee adjustments.</div></div>
    <div class="card"><div class="label">Estimated net sales</div><div class="value">${escapeHtml(formatMoney(summary.netRevenueAmount, summary.revenueCurrency))}</div><div class="note">After estimated platform fee only.</div></div>
    <div class="card"><div class="label">Active events</div><div class="value">${summary.activeEvents}</div><div class="note">Currently published events.</div></div>
    <div class="card"><div class="label">Pending issues</div><div class="value">${summary.pendingIssues}</div><div class="note">Events needing attention.</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Event</th>
        <th>Settlement</th>
        <th>Gross</th>
        <th>Fee / reserve</th>
        <th>Net</th>
        <th>Tickets</th>
        <th>Activity</th>
        <th>Last updated</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="8">No events matched the current filters.</td></tr>`}
    </tbody>
  </table>

  <div class="footer">Generated by BuyMesho creator dashboard.</div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.print(); }, 250);
    };
    window.onafterprint = function () { window.close(); };
  </script>
</body>
</html>`;
}

function SettlementBanner({ summary }: { summary: DashboardResponse["summary"] }) {
  const hasRevenue = summary.grossRevenueAmount > 0;
  return (
    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700">
          <Clock3 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-600">Settlement status</p>
          <h3 className="mt-1 text-xl font-black tracking-tight text-emerald-950">
            {hasRevenue ? "Successful transactions are waiting for midnight settlement" : "No captured transactions yet"}
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-emerald-900/90">
            Payments made today will be available the next day after midnight. The exact time may vary slightly, but it follows the T+1 cycle.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-900">
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">
              Captured: {formatMoney(summary.grossRevenueAmount, summary.revenueCurrency)}
            </span>
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">
              Est. net: {formatMoney(summary.netRevenueAmount, summary.revenueCurrency)}
            </span>
            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1">
              T+1 settlement
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TransactionHistorySection({ events }: { events: DashboardEvent[] }) {
  return (
    <section className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
      <SectionTitle
        eyebrow="Transaction ledger"
        title="Captured payments and settlement maths"
        action={<Wallet className="h-5 w-5 text-zinc-400" />}
      />

      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
        Successful event payments stay visible here with gross, fees, net, and settlement state. The ledger stays intact; only the wording changes.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-200">
        <div className="max-h-[540px] min-w-[940px] overflow-auto">
          <table className="w-full divide-y divide-zinc-200 text-left text-sm">
            <thead className="sticky top-0 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Settlement</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Amount</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Event</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Ledger</th>
                <th className="px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em]">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-zinc-500">
                    No transaction records yet.
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const hasRevenue = event.gross_revenue_amount > 0;
                  const feeAmount = settlementFeeAmount(event);

                  return (
                    <tr key={event.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${transactionStatusClass(hasRevenue, event.pending_issues)}`}>
                            {transactionStatusLabel(event)}
                          </span>
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">
                            {transactionSettlementNote(event)}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-zinc-700">
                        <div className="font-bold text-zinc-900">
                          {formatMoney(event.gross_revenue_amount, event.revenue_currency)}
                        </div>
                        <div className="mt-2 space-y-1 rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-[11px] font-semibold text-zinc-500">
                          <div className="flex justify-between gap-3">
                            <span>Gross</span>
                            <span>{formatMoney(event.gross_revenue_amount, event.revenue_currency)}</span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span>Fee / reserve</span>
                            <span>-{formatMoney(feeAmount, event.revenue_currency)}</span>
                          </div>
                          <div className="flex justify-between gap-3 border-t border-zinc-200 pt-1 font-bold text-zinc-700">
                            <span>Net</span>
                            <span>{formatMoney(event.net_revenue_amount, event.revenue_currency)}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-zinc-700">
                        <p className="font-bold text-zinc-950">{event.event_title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {event.event_type} • {event.organizer_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {event.venue} • {event.location}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          {formatDate(event.event_date)} • {event.start_time}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-zinc-700">
                        <div className="space-y-1 text-xs text-zinc-500">
                          <p>{event.tickets_sold} tickets sold</p>
                          <p>{event.cart_adds} cart adds</p>
                          <p>{event.message_threads} message threads</p>
                          <p>{event.ticket_clicks} ticket clicks</p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-zinc-700">
                        {formatDateTime(event.last_activity_at || event.updated_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default function EventCreatorOverviewPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [eventType, setEventType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = (await apiFetch("/api/event-creator/overview")) as DashboardResponse;
        if (!mounted) return;
        setData({
          creator: response?.creator ?? null,
          events: Array.isArray(response?.events) ? response.events : [],
          summary: response?.summary ?? {
            totalTicketsSold: 0,
            grossRevenueAmount: 0,
            netRevenueAmount: 0,
            revenueAmount: 0,
            revenueCurrency: "MWK",
            activeEvents: 0,
            pendingIssues: 0,
          },
        });
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError?.message || "Could not load the dashboard.");
        setData({
          creator: null,
          events: [],
          summary: { totalTicketsSold: 0, grossRevenueAmount: 0, netRevenueAmount: 0, revenueAmount: 0, revenueCurrency: "MWK", activeEvents: 0, pendingIssues: 0 },
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [firebaseUser, authLoading]);

  const eventTypes = useMemo(() => {
    const seen = new Set<string>();
    return (data?.events ?? [])
      .filter((event) => {
        if (!event.event_type || seen.has(event.event_type)) return false;
        seen.add(event.event_type);
        return true;
      })
      .map((event) => event.event_type);
  }, [data?.events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.events ?? []).filter((event) => {
      const matchesSearch = !q || [event.event_title, event.organizer_name, event.venue, event.location, event.event_type].join(" ").toLowerCase().includes(q);
      const matchesStatus = status === "all" || event.status === status;
      const matchesType = eventType === "all" || event.event_type === eventType;
      const eventDate = event.event_date ? new Date(event.event_date) : null;
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      const matchesFrom = !fromDate || !eventDate || eventDate >= fromDate;
      const matchesTo = !toDate || !eventDate || eventDate <= toDate;
      return matchesSearch && matchesStatus && matchesType && matchesFrom && matchesTo;
    });
  }, [data?.events, query, status, eventType, dateFrom, dateTo]);

  const summary = data?.summary ?? { totalTicketsSold: 0, grossRevenueAmount: 0, netRevenueAmount: 0, revenueAmount: 0, revenueCurrency: "MWK", activeEvents: 0, pendingIssues: 0 };
  const exportState = { query, status, eventType, dateFrom, dateTo };

  const handleExportPdf = () => {
    if (typeof window === "undefined") return;
    const html = buildPrintableDashboardHtml({
      title: "Creator Dashboard Export",
      logoUrl: loaderImage,
      summary,
      events: filteredEvents,
      filters: exportState,
    });

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const creatorStatus = typeof data?.creator?.status === "string" ? data.creator.status : null;

  return (
    <AccountPageShell
      eyebrow="Event creator"
      title="Dashboard"
      description="A clean overview of sales, active events, and items that need attention."
      backLabel="Back to Manage Events"
      onBack={() => navigateToPath(EVENTS_MANAGE_PATH)}
      childrenSectionClassName="w-full"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-500">
            <LayoutDashboard className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Overview</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => navigateToPath(EVENTS_MANAGE_PATH)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50">
              <ArrowRight className="h-4 w-4" /> Manage Events
            </button>
            <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50">
              <Download className="h-4 w-4" />
              Export PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5 print:grid-cols-5">
          <MetricCard label="Total tickets sold" value={String(summary.totalTicketsSold)} helper="Across all events" icon={Ticket} />
          <MetricCard label="Gross sales" value={formatMoney(summary.grossRevenueAmount, summary.revenueCurrency)} helper="Before platform fee" icon={Wallet} />
          <MetricCard label="Estimated net sales" value={formatMoney(summary.netRevenueAmount, summary.revenueCurrency)} helper="After platform fee" icon={Wallet} />
          <MetricCard label="Active events" value={String(summary.activeEvents)} helper="Currently published" icon={CalendarDays} />
          <MetricCard label="Pending issues" value={String(summary.pendingIssues)} helper="Needs attention" icon={AlertCircle} />
        </div>

        <SettlementBanner summary={summary} />

        <TransactionHistorySection events={filteredEvents} />

        <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.7fr_0.8fr_0.8fr_0.8fr_0.8fr]">
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 lg:col-span-1">
              <Search className="h-4 w-4 shrink-0" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none" placeholder="Search events" />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <Filter className="h-4 w-4 shrink-0" />
              <select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className="w-full bg-transparent text-sm text-zinc-900 outline-none">
                <option value="all">All statuses</option>
                <option value="published">Published</option>
                <option value="inactive">Inactive</option>
                <option value="cancelled">Cancelled</option>
                <option value="draft">Draft</option>
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none" />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none" />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <Filter className="h-4 w-4 shrink-0" />
              <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none">
                <option value="all">All types</option>
                {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          </div>
        </div>

        {error ? <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

        <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Event performance</p>
              <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-950">Filtered events</h2>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{filteredEvents.length} shown</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 px-5 py-12 text-sm text-zinc-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading dashboard…
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-zinc-600">No events match your filters.</p>
              <button type="button" onClick={() => setQuery("")} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">
                Clear search
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-left">
                <thead className="bg-zinc-50 text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Tickets</th>
                    <th className="px-4 py-3">Gross</th>
                    <th className="px-4 py-3">Net</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Last updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white text-sm">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="align-top hover:bg-zinc-50/50">
                      <td className="px-4 py-4">
                        <p className="font-black tracking-tight text-zinc-950">{event.event_title}</p>
                        <p className="mt-1 text-xs text-zinc-500">{event.event_type} • {event.organizer_name}</p>
                        <p className="mt-1 text-xs text-zinc-500">{event.venue} • {event.location}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusClass(event.status)}`}>{event.status}</span>
                        {event.pending_issues ? <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600">Needs attention</p> : null}
                      </td>
                      <td className="px-4 py-4 text-zinc-700">
                        {formatDate(event.event_date)}
                        <div className="mt-1 text-xs text-zinc-500">{event.start_time}</div>
                      </td>
                      <td className="px-4 py-4 font-bold text-zinc-950">{event.tickets_sold}</td>
                      <td className="px-4 py-4 font-bold text-zinc-950">{formatMoney(event.gross_revenue_amount, event.revenue_currency)}</td>
                      <td className="px-4 py-4 font-bold text-zinc-950">{formatMoney(event.net_revenue_amount, event.revenue_currency)}</td>
                      <td className="px-4 py-4 text-zinc-700"><div className="space-y-1 text-xs text-zinc-500"><p>{event.ticket_clicks} clicks</p><p>{event.cart_adds} cart adds</p><p>{event.message_threads} threads</p></div></td>
                      <td className="px-4 py-4 text-zinc-700">{formatDateTime(event.last_activity_at || event.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AccountPageShell>
  );
}
