import { useEffect, useMemo, useState, type ComponentType } from "react";
import { AlertCircle, ArrowRight, CalendarDays, Download, Filter, LayoutDashboard, Loader2, Search, Ticket, Wallet } from "lucide-react";

import AccountPageShell from "./components/AccountPageShell";
import { apiFetch } from "./lib/api";
import { EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, navigateToPath } from "./lib/appNavigation";
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
  summary: DashboardResponse["summary"];
  events: DashboardEvent[];
  filters: { query: string; status: StatusFilter; eventType: string; dateFrom: string; dateTo: string };
}) {
  const { title, summary, events, filters } = params;
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
          <td>${escapeHtml(event.status)}</td>
          <td>${escapeHtml(formatDate(event.event_date))}</td>
          <td>${event.tickets_sold}</td>
          <td>${escapeHtml(formatMoney(event.gross_revenue_amount, event.revenue_currency))}</td>
          <td>${escapeHtml(formatMoney(event.net_revenue_amount, event.revenue_currency))}</td>
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
  <h1>${escapeHtml(title)}</h1>
  <div class="sub">Creator dashboard export for your events. This view uses the current dashboard filters and shows gross and estimated net sales separately.</div>
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
        <th>Status</th>
        <th>Date</th>
        <th>Tickets</th>
        <th>Gross</th>
        <th>Net</th>
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
    return (data?.events ?? []).filter((event) => {
      if (!event.event_type || seen.has(event.event_type)) return false;
      seen.add(event.event_type);
      return true;
    }).map((event) => event.event_type);
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
            <button type="button" onClick={() => navigateToPath(EVENTS_CREATE_PATH)} className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">
              New Event
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
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Events table</p>
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
                    <th className="px-4 py-3">Action</th>
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
                      <td className="px-4 py-4"><button type="button" onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?event=${event.id}`)} className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50">Open<ArrowRight className="h-3.5 w-3.5" /></button></td>
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
