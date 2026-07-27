import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Download, Filter, Loader2, Search, Ticket, Wallet, AlertCircle, Layers3 } from "lucide-react";

import AccountPageShell from "./components/AccountPageShell";
import { formatMoney } from "./shared/utils/formatMoney";
import { EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, navigateToPath } from "./lib/appNavigation";
import { apiFetch } from "./lib/api";
import { useAuthUser } from "./hooks/useAuthUser";

type CreatorOverviewEvent = {
  id: number;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_price: number | null;
  status: string;
  updated_at: string;
  tickets_sold: number;
  revenue_amount: number;
  revenue_currency: string;
  message_threads: number;
  unread_messages: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
  pending_issues: boolean;
};

type CreatorOverviewResponse = {
  creator: Record<string, unknown> | null;
  events: CreatorOverviewEvent[];
  summary: {
    totalTicketsSold: number;
    revenueAmount: number;
    revenueCurrency: string;
    activeEvents: number;
    pendingIssues: number;
  };
};

type FilterStatus = "all" | "published" | "inactive" | "cancelled" | "draft";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
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

function MetricCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
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

export default function EventCreatorOverviewPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [data, setData] = useState<CreatorOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
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
        const response = (await apiFetch("/api/event-creator/overview")) as CreatorOverviewResponse;
        if (!mounted) return;
        setData({
          creator: response?.creator ?? null,
          events: Array.isArray(response?.events) ? response.events : [],
          summary: response?.summary ?? {
            totalTicketsSold: 0,
            revenueAmount: 0,
            revenueCurrency: "MWK",
            activeEvents: 0,
            pendingIssues: 0,
          },
        });
      } catch (loadError: any) {
        if (!mounted) return;
        setError(loadError?.message || "Could not load your creator dashboard overview.");
        setData({
          creator: null,
          events: [],
          summary: {
            totalTicketsSold: 0,
            revenueAmount: 0,
            revenueCurrency: "MWK",
            activeEvents: 0,
            pendingIssues: 0,
          },
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [firebaseUser]);

  const eventTypes = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];
    (data?.events ?? []).forEach((event) => {
      if (!event.event_type || seen.has(event.event_type)) return;
      seen.add(event.event_type);
      values.push(event.event_type);
    });
    return values;
  }, [data?.events]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.events ?? []).filter((event) => {
      const matchesSearch = !q || [event.event_title, event.organizer_name, event.venue, event.location, event.event_type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
      const matchesStatus = status === "all" ? true : event.status === status;
      const matchesType = eventType === "all" ? true : event.event_type === eventType;
      const eventDate = event.event_date ? new Date(event.event_date) : null;
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      const matchesFrom = !fromDate || !eventDate || eventDate >= fromDate;
      const matchesTo = !toDate || !eventDate || eventDate <= toDate;
      return matchesSearch && matchesStatus && matchesType && matchesFrom && matchesTo;
    });
  }, [data?.events, search, status, eventType, dateFrom, dateTo]);

  const summary = data?.summary ?? {
    totalTicketsSold: 0,
    revenueAmount: 0,
    revenueCurrency: "MWK",
    activeEvents: 0,
    pendingIssues: 0,
  };

  return (
    <AccountPageShell
      eyebrow="Event creator"
      title="Dashboard"
      description="Track ticket sales, revenue, active events, and issues at a glance."
      backLabel="Back to Manage Events"
      onBack={() => navigateToPath(EVENTS_MANAGE_PATH)}
      childrenSectionClassName="w-full"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
          <div className="flex items-center gap-2 text-zinc-500">
            <Layers3 className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-[0.2em]">Overview</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigateToPath(EVENTS_MANAGE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
            >
              <ArrowRight className="h-4 w-4" />
              Manage Events
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
            >
              New Event
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
            >
              <Download className="h-4 w-4" />
              Print / PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Total tickets sold" value={String(summary.totalTicketsSold)} helper="Across all events" icon={Ticket} />
          <MetricCard label="Revenue" value={formatMoney(summary.revenueAmount, summary.revenueCurrency)} helper="Paid ticket sales" icon={Wallet} />
          <MetricCard label="Active events" value={String(summary.activeEvents)} helper="Currently published" icon={CalendarDays} />
          <MetricCard label="Pending issues" value={String(summary.pendingIssues)} helper="Needs attention" icon={AlertCircle} />
        </div>

        <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr]">
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
                placeholder="Search events"
              />
            </label>

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
              <Filter className="h-4 w-4 shrink-0" />
              <select value={status} onChange={(event) => setStatus(event.target.value as FilterStatus)} className="w-full bg-transparent text-sm text-zinc-900 outline-none">
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
                {eventTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm shadow-zinc-200/30">
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
              <button
                type="button"
                onClick={() => setSearch("")}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
              >
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
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Activity</th>
                    <th className="px-4 py-3">Last updated</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white text-sm">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="align-top hover:bg-zinc-50/50">
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="font-black tracking-tight text-zinc-950">{event.event_title}</p>
                          <p className="mt-1 text-xs text-zinc-500">{event.event_type} • {event.organizer_name}</p>
                          <p className="mt-1 text-xs text-zinc-500">{event.venue} • {event.location}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${statusBadge(event.status)}`}>
                          {event.status}
                        </span>
                        {event.pending_issues ? (
                          <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-600">Needs attention</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-zinc-700">{formatDate(event.event_date)}<div className="mt-1 text-xs text-zinc-500">{event.start_time}</div></td>
                      <td className="px-4 py-4 font-bold text-zinc-950">{event.tickets_sold}</td>
                      <td className="px-4 py-4 font-bold text-zinc-950">{formatMoney(event.revenue_amount, event.revenue_currency)}</td>
                      <td className="px-4 py-4 text-zinc-700">
                        <div className="space-y-1 text-xs text-zinc-500">
                          <p>{event.ticket_clicks} clicks</p>
                          <p>{event.cart_adds} cart adds</p>
                          <p>{event.message_threads} threads</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-zinc-700">{formatDateTime(event.last_activity_at || event.updated_at)}</td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?event=${event.id}`)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-50"
                        >
                          Open
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
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
