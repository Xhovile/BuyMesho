import { useEffect, useMemo, useState, type ComponentType } from "react";
import { ArrowRight, BarChart3, Clock3, ExternalLink, Loader2, Pencil, RefreshCw, Search, Ticket, Trash2, Eye } from "lucide-react";

import AccountPageShell from "./components/AccountPageShell";
import EventCreatorOverviewPage from "./EventCreatorOverviewPage";
import { apiFetch } from "./lib/api";
import { EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, EVENTS_PATH, navigateToLoginWithReturnPath, navigateToPath } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";

type ManagedEvent = {
  id: number;
  creator_uid: string | null;
  event_type: string;
  event_title: string;
  organizer_name: string;
  event_date: string;
  start_time: string;
  venue: string;
  location: string;
  ticket_mode: string;
  ticket_price: number | null;
  ticket_link: string | null;
  description: string;
  contact_whatsapp: string | null;
  poster_alt: string | null;
  spec_values: Record<string, unknown>;
  status: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  cart_adds: number;
  ticket_clicks: number;
  message_threads: number;
  unread_messages: number;
  last_activity_at: string | null;
  last_message_at: string | null;
  tickets_sold: number;
  gross_revenue_amount: number;
  net_revenue_amount: number;
  revenue_currency: string;
  purchase_count: number;
  last_sale_at: string | null;
  pending_issues: boolean;
};

type CreatorOverviewResponse = {
  creator: {
    uid: string;
    email: string;
    display_name: string;
    organization_name: string;
    organization_type: string;
    contact_whatsapp: string | null;
    event_types: string;
    status: string;
    active_until: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  events: ManagedEvent[];
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

type StatusFilter = "all" | "published" | "inactive" | "draft" | "cancelled";

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) return "Free";
  return `MK ${value.toLocaleString()}`;
}

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
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: ComponentType<{ className?: string }>;
}) {
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

function ActionButton({
  children,
  onClick,
  variant = "default",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const className =
    variant === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : variant === "ghost"
        ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
        : "border-zinc-900 bg-zinc-950 text-white hover:bg-zinc-800";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export default function EventCreatorDashboardPage() {
  const { user: firebaseUser, loading: authLoading } = useAuthUser();
  const [dashboard, setDashboard] = useState<CreatorOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const [selectedEventId, setSelectedEventId] = useState<number | null>(() => {
    const raw = searchParams.get("event");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });

  const isOverviewView = searchParams.get("view") === "dashboard";

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = (await apiFetch("/api/event-creator/overview")) as CreatorOverviewResponse;
      setDashboard({
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
      setError(loadError?.message || "Could not load your event dashboard.");
      setDashboard({
        creator: null,
        events: [],
        summary: {
          totalTicketsSold: 0,
          grossRevenueAmount: 0,
          netRevenueAmount: 0,
          revenueAmount: 0,
          revenueCurrency: "MWK",
          activeEvents: 0,
          pendingIssues: 0,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    if (isOverviewView) {
      setLoading(false);
      return;
    }
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, firebaseUser, isOverviewView]);

  const allEvents = dashboard?.events ?? [];
  const summary = dashboard?.summary ?? {
    totalTicketsSold: 0,
    grossRevenueAmount: 0,
    netRevenueAmount: 0,
    revenueAmount: 0,
    revenueCurrency: "MWK",
    activeEvents: 0,
    pendingIssues: 0,
  };

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return allEvents.filter((event) => {
      const matchesSearch =
        !q ||
        [event.event_title, event.event_type, event.organizer_name, event.venue, event.location]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesStatus = status === "all" || event.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [allEvents, query, status]);

  const selectedEvent = useMemo(() => {
    if (filteredEvents.length === 0) return null;
    return filteredEvents.find((event) => event.id === selectedEventId) ?? null;
  }, [filteredEvents, selectedEventId]);

  const handleSelectEvent = (eventId: number) => {
    setSelectedEventId(eventId);
    navigateToPath(`${EVENTS_MANAGE_PATH}?event=${eventId}`, { scroll: false });
  };
  const handleEditEvent = (eventId: number) => navigateToPath(`${EVENTS_CREATE_PATH}?edit=${eventId}&skipCreatorCheck=1`);
  const handleViewPublic = (eventId: number) => navigateToPath(`${EVENTS_PATH}?event=${eventId}`);

  const updateEventStatus = async (eventId: number, nextStatus: "published" | "inactive") => {
    await apiFetch(`/api/event-creator/events/${eventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadDashboard();
  };

  const handleDeleteEvent = async (eventId: number) => {
    const confirmed = window.confirm("Cancel this event? It will be removed from the public event listings.");
    if (!confirmed) return;
    await apiFetch(`/api/events/${eventId}`, { method: "DELETE" });
    await loadDashboard();
    navigateToPath(EVENTS_MANAGE_PATH, { replace: true });
  };

  if (authLoading || loading) {
    return (
      <AccountPageShell
        eyebrow="Event creator"
        title="Manage events"
        description="Keep your event list clean, open one event at a time, and edit or pause it without distractions."
        backLabel="Back to Events"
        onBack={() => navigateToPath(EVENTS_PATH)}
        childrenSectionClassName="w-full"
      >
        <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white p-10 text-zinc-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading manage events...
        </div>
      </AccountPageShell>
    );
  }

  if (!firebaseUser) {
    return (
      <AccountPageShell
        eyebrow="Event creator"
        title="Manage events"
        description="Keep your event list clean, open one event at a time, and edit or pause it without distractions."
        backLabel="Back to Events"
        onBack={() => navigateToPath(EVENTS_PATH)}
        childrenSectionClassName="w-full"
      >
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h2>
          <p className="mt-3 text-sm text-zinc-500">Sign in before opening the event manager.</p>
          <ActionButton onClick={() => navigateToLoginWithReturnPath(EVENTS_MANAGE_PATH)}>Go to Login</ActionButton>
        </div>
      </AccountPageShell>
    );
  }

  const creatorProfile = dashboard?.creator ?? null;
  const activeUntil = creatorProfile?.active_until ? formatDateTime(creatorProfile.active_until) : null;

  if (isOverviewView) {
    return <EventCreatorOverviewPage />;
  }

  return (
    <AccountPageShell
      eyebrow="Event creator"
      title="Manage events"
      description="Keep your event list clean, open one event at a time, and edit or pause it without distractions."
      backLabel="Back to Events"
      onBack={() => navigateToPath(EVENTS_PATH)}
      childrenSectionClassName="w-full"
    >
      <div className="space-y-6">
        {error ? <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Owned events" value={String(allEvents.length)} icon={Ticket} helper="Only your events are listed." />
          <MetricCard label="Published" value={String(summary.activeEvents)} icon={Eye} helper="Live in the public directory." />
          <MetricCard label="Tickets sold" value={String(summary.totalTicketsSold)} icon={BarChart3} helper="From paid orders." />
          <MetricCard label="Pending issues" value={String(summary.pendingIssues)} icon={Clock3} helper="Needs attention." />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 pb-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Your events</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Select one event</h2>
                <p className="mt-1 text-xs font-medium text-zinc-500">Click a card to load its action panel.</p>
              </div>
              <button
                type="button"
                onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?view=dashboard`, { scroll: false })}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-900 hover:bg-zinc-50"
              >
                <BarChart3 className="h-3.5 w-3.5" /> Dashboard
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, venue, organizer"
                className="w-full bg-transparent text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["all", "published", "inactive", "draft", "cancelled"] as StatusFilter[]).map((item) => {
                const label = item === "all" ? "All" : item.charAt(0).toUpperCase() + item.slice(1);
                const active = status === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setStatus(item)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] transition ${
                      active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-3">
              {filteredEvents.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-zinc-200 bg-zinc-50/60 p-5 text-sm text-zinc-600">
                  No events matched this filter.
                  <div className="mt-4">
                    <ActionButton onClick={() => navigateToPath(EVENTS_CREATE_PATH)}>
                      <ArrowRight className="h-4 w-4" /> Create Event
                    </ActionButton>
                  </div>
                </div>
              ) : (
                filteredEvents.map((event) => {
                  const active = selectedEvent?.id === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => handleSelectEvent(event.id)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                        active
                          ? "border-zinc-950 bg-zinc-950 text-white shadow-lg shadow-zinc-950/10"
                          : "border-zinc-200 bg-white hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-[10px] font-extrabold uppercase tracking-[0.2em] ${active ? "text-white/60" : "text-zinc-400"}`}>
                            {event.event_type}
                          </p>
                          <h3 className="mt-1 truncate text-base font-black tracking-tight">{event.event_title}</h3>
                          <p className={`mt-1 text-sm ${active ? "text-white/75" : "text-zinc-500"}`}>
                            {formatDate(event.event_date)} • {formatMoney(event.ticket_price)}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${statusClass(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      <div className={`mt-3 text-sm ${active ? "text-white/75" : "text-zinc-500"}`}>
                        {event.venue || "Venue unavailable"}
                      </div>
                      <div className={`mt-3 flex flex-wrap gap-2 text-[11px] font-bold ${active ? "text-white/80" : "text-zinc-500"}`}>
                        <span className="rounded-full border border-current/10 px-3 py-1">{event.tickets_sold} sold</span>
                        <span className="rounded-full border border-current/10 px-3 py-1">{formatMoney(event.gross_revenue_amount)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30">
            {!selectedEvent ? (
              <div className="rounded-[1.75rem] border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-sm text-zinc-600">
                {allEvents.length === 0 ? (
                  <>
                    Your event manager is empty. Create one event first, then control everything from here.
                    <div className="mt-4">
                      <ActionButton onClick={() => navigateToPath(EVENTS_CREATE_PATH)}>
                        <ArrowRight className="h-4 w-4" /> Publish Event
                      </ActionButton>
                    </div>
                  </>
                ) : (
                  "Select an event from the left to manage its actions."
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col gap-4 rounded-[1.75rem] border border-zinc-200 bg-zinc-50/70 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Selected event</p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-zinc-950">{selectedEvent.event_title}</h2>
                    <p className="mt-2 text-sm font-medium text-zinc-600">
                      {selectedEvent.organizer_name} • {selectedEvent.venue || "Venue unavailable"} • {selectedEvent.location || "Location unavailable"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${statusClass(selectedEvent.status)}`}>
                        {selectedEvent.status}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        {formatDate(selectedEvent.event_date)}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        {selectedEvent.ticket_mode}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <ActionButton onClick={() => handleEditEvent(selectedEvent.id)} variant="ghost">
                      <Pencil className="h-4 w-4" /> Edit
                    </ActionButton>
                    <ActionButton onClick={() => handleViewPublic(selectedEvent.id)} variant="ghost">
                      <ExternalLink className="h-4 w-4" /> View public page
                    </ActionButton>
                    {selectedEvent.status === "draft" ? (
                      <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "published")}>
                        <RefreshCw className="h-4 w-4" /> Publish
                      </ActionButton>
                    ) : selectedEvent.status === "published" ? (
                      <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "inactive")} variant="ghost">
                        <Clock3 className="h-4 w-4" /> Pause
                      </ActionButton>
                    ) : selectedEvent.status === "inactive" ? (
                      <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "published")}>
                        <RefreshCw className="h-4 w-4" /> Reactivate
                      </ActionButton>
                    ) : (
                      <ActionButton onClick={() => {}} variant="ghost" disabled>
                        <Clock3 className="h-4 w-4" /> Status locked
                      </ActionButton>
                    )}
                    <ActionButton onClick={() => void handleDeleteEvent(selectedEvent.id)} variant="danger">
                      <Trash2 className="h-4 w-4" /> Cancel
                    </ActionButton>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <MetricCard label="Tickets sold" value={String(selectedEvent.tickets_sold || 0)} icon={Ticket} helper="From paid orders." />
                  <MetricCard label="Gross sales" value={formatMoney(selectedEvent.gross_revenue_amount)} icon={BarChart3} helper="Before payout fees." />
                  <MetricCard label="Net sales" value={formatMoney(selectedEvent.net_revenue_amount)} icon={Eye} helper="Estimated payout value." />
                  <MetricCard label="Last sale" value={selectedEvent.last_sale_at ? formatDateTime(selectedEvent.last_sale_at) : "—"} icon={Clock3} helper="Latest paid order." />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Event details</p>
                        <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">Key information</h3>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-zinc-600">
                      <p>
                        <span className="font-bold text-zinc-900">Date:</span> {formatDate(selectedEvent.event_date)}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Time:</span> {selectedEvent.start_time || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Venue:</span> {selectedEvent.venue || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Location:</span> {selectedEvent.location || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Ticket mode:</span> {selectedEvent.ticket_mode || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Ticket price:</span> {formatMoney(selectedEvent.ticket_price)}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Creator status</p>
                        <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">Account snapshot</h3>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 text-sm text-zinc-600">
                      <p>
                        <span className="font-bold text-zinc-900">Creator:</span> {creatorProfile?.display_name || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Organization:</span> {creatorProfile?.organization_name || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Status:</span> {creatorProfile?.status || "—"}
                      </p>
                      <p>
                        <span className="font-bold text-zinc-900">Active until:</span> {activeUntil || "—"}
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </AccountPageShell>
  );
}