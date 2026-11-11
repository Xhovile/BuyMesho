import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldCheck,
  ShieldOff,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";

import { apiFetch } from "./lib/api";
import { ADMIN_EVENTS_PATH, EVENTS_PATH, navigateToPath } from "./lib/appNavigation";
import AdminWorkspaceLayout from "./modules/admin/AdminWorkspaceLayout";

type CreatorModerationRow = {
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
  submission_count: number;
  latest_submission_status: string | null;
  latest_submission_created_at: string | null;
  latest_submission_reason: string | null;
  event_count: number;
  published_event_count: number;
  inactive_event_count: number;
  cancelled_event_count: number;
  message_threads: number;
  unread_messages: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
  last_event_at: string | null;
};

type SubmissionRow = {
  id: number;
  applicant_uid: string;
  applicant_email: string | null;
  display_name: string;
  organization_name: string;
  organization_type: string;
  contact_whatsapp: string | null;
  event_types: string;
  reason: string;
  status: string;
  reviewed_at: string | null;
  created_at: string;
};

type EventModerationRow = {
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
  creator_email: string | null;
  creator_display_name: string | null;
  creator_status: string | null;
  message_threads: number;
  unread_messages: number;
  cart_adds: number;
  ticket_clicks: number;
  last_activity_at: string | null;
  last_message_at: string | null;
  purchase_count: number;
};

type AdminOverviewResponse = {
  creators: CreatorModerationRow[];
  events: EventModerationRow[];
  submissions: SubmissionRow[];
  summary: {
    creatorCount: number;
    suspendedCreatorCount: number;
    submissionCount: number;
    eventCount: number;
    publishedEventCount: number;
    inactiveEventCount: number;
    cancelledEventCount: number;
    totalMessageThreads: number;
    totalUnreadMessages: number;
    totalCartAdds: number;
    totalTicketClicks: number;
  };
};

type EventRecordsResponse = {
  event: EventModerationRow;
  creator: CreatorModerationRow | null;
  activities: Array<{
    id: number;
    event_id: number;
    actor_uid: string | null;
    activity_type: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  conversations: Array<Record<string, unknown>>;
  purchaseRecords: Array<Record<string, unknown>>;
  payoutDestination: {
    id: string;
    destination_type: string;
    provider_name: string;
    provider_ref_id: string | null;
    currency: string;
    account_name: string;
    masked_account: string;
    verification_status: string;
    is_default: number;
    is_active: number;
    created_at: string;
    updated_at: string;
  } | null;
};

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || value <= 0) return "Free";
  return `MK ${value.toLocaleString()}`;
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

function statusBadge(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "published":
      return "border-bm-success/35 bg-bm-success-bg text-bm-success";
    case "suspended":
    case "inactive":
      return "border-bm-warning/35 bg-bm-warning-bg text-bm-warning";
    case "cancelled":
      return "border-bm-danger/35 bg-bm-danger-bg text-bm-danger";
    case "pending":
      return "border-bm-border bg-bm-surface-muted text-bm-text-muted";
    default:
      return "border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle text-bm-text-muted dark:text-bm-text-muted";
  }
}

function StatCard({
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
    <div className="rounded-[1.5rem] border border-bm-border dark:border-bm-border bg-bm-surface p-4 shadow-sm shadow-zinc-200/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950 dark:text-bm-text">{value}</p>
          {helper ? <p className="mt-1 text-xs font-medium text-bm-text-subtle dark:text-bm-text-subtle">{helper}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-subtle text-bm-text-muted dark:text-bm-text-muted">
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
  children: ReactNode;
  onClick: () => void;
  variant?: "default" | "danger" | "ghost" | "success";
  disabled?: boolean;
}) {
  const className =
    variant === "danger"
      ? "border-bm-danger/35 bg-bm-danger-bg text-bm-danger hover:brightness-95"
      : variant === "success"
        ? "border-bm-success/35 bg-bm-success-bg text-bm-success hover:brightness-95"
        : variant === "ghost"
          ? "border-bm-border dark:border-bm-border bg-bm-surface text-bm-text dark:text-bm-text hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
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

function parseSearchSelection() {
  if (typeof window === "undefined") return { creator: null as string | null, event: null as number | null };
  const params = new URLSearchParams(window.location.search);
  const creator = params.get("creator");
  const eventParam = params.get("event");
  const event = eventParam ? Number(eventParam) : null;
  return {
    creator: creator && creator.trim() ? creator.trim() : null,
    event: Number.isInteger(event) && event > 0 ? event : null,
  };
}

export default function AdminEventModerationPage() {
  const initialSelection = parseSearchSelection();
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [selectedCreatorUid, setSelectedCreatorUid] = useState<string | null>(initialSelection.creator);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(initialSelection.event);
  const [records, setRecords] = useState<EventRecordsResponse | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [creatorQuery, setCreatorQuery] = useState("");
  const [eventQuery, setEventQuery] = useState("");

  const syncSelectionToUrl = (creator: string | null, eventId: number | null) => {
    const url = new URL(window.location.href);
    if (creator) url.searchParams.set("creator", creator);
    else url.searchParams.delete("creator");
    if (eventId) url.searchParams.set("event", String(eventId));
    else url.searchParams.delete("event");
    window.history.replaceState(window.history.state, "", url.toString());
  };

  const fetchOverview = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = (await apiFetch("/api/admin/events/overview")) as AdminOverviewResponse;
      setOverview(data);
      setActionSuccess(null);
      setActionError(null);
      if (!selectedCreatorUid && data.creators.length > 0) {
        setSelectedCreatorUid(data.creators[0].uid);
      }
      if (!selectedEventId && data.events.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (err: any) {
      setLoadError(err?.message || "Failed to load event moderation overview.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async (eventId: number) => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const data = (await apiFetch(`/api/admin/events/${eventId}/records`)) as EventRecordsResponse;
      setRecords(data);
    } catch (err: any) {
      setRecords(null);
      setRecordsError(err?.message || "Failed to load event records.");
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    const sync = () => {
      const selection = parseSearchSelection();
      setSelectedCreatorUid(selection.creator);
      setSelectedEventId(selection.event);
    };

    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setRecords(null);
      return;
    }
    void fetchRecords(selectedEventId);
    syncSelectionToUrl(selectedCreatorUid, selectedEventId);
  }, [selectedEventId]);

  useEffect(() => {
    syncSelectionToUrl(selectedCreatorUid, selectedEventId);
  }, [selectedCreatorUid]);

  const creators = useMemo(() => {
    const rows = overview?.creators ?? [];
    const query = creatorQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.display_name,
        row.organization_name,
        row.organization_type,
        row.email,
        row.status,
        row.latest_submission_reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [overview, creatorQuery]);

  const events = useMemo(() => {
    const rows = overview?.events ?? [];
    const query = eventQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesCreator = selectedCreatorUid ? row.creator_uid === selectedCreatorUid : true;
      if (!matchesCreator) return false;
      if (!query) return true;
      const haystack = [
        row.event_title,
        row.event_type,
        row.organizer_name,
        row.venue,
        row.location,
        row.status,
        row.creator_display_name,
        row.creator_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [overview, eventQuery, selectedCreatorUid]);

  const selectedCreator = creators.find((row) => row.uid === selectedCreatorUid) ?? null;
  const selectedEvent = events.find((row) => row.id === selectedEventId) ?? null;
  const selectedRecordPayload = records;

  const summary = overview?.summary ?? {
    creatorCount: 0,
    suspendedCreatorCount: 0,
    submissionCount: 0,
    eventCount: 0,
    publishedEventCount: 0,
    inactiveEventCount: 0,
    cancelledEventCount: 0,
    totalMessageThreads: 0,
    totalUnreadMessages: 0,
    totalCartAdds: 0,
    totalTicketClicks: 0,
  };

  const updateCreatorStatus = async (creatorUid: string, status: "approved" | "suspended") => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = (await apiFetch(`/api/admin/events/creators/${creatorUid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })) as { creator?: CreatorModerationRow };
      setActionSuccess(status === "suspended" ? "Creator suspended." : "Creator reinstated.");
      if (data?.creator) {
        setOverview((current) => {
          if (!current) return current;
          return {
            ...current,
            creators: current.creators.map((row) => (row.uid === creatorUid ? { ...row, ...data.creator! } : row)),
          };
        });
      }
      await fetchOverview();
    } catch (err: any) {
      setActionError(err?.message || "Failed to update creator status.");
    }
  };

  const updateEventStatus = async (eventId: number, status: "published" | "inactive" | "cancelled") => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = (await apiFetch(`/api/admin/events/${eventId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })) as { event?: EventModerationRow };
      setActionSuccess(status === "published" ? "Event published." : status === "inactive" ? "Event hidden." : "Event cancelled.");
      if (data?.event) {
        setOverview((current) => {
          if (!current) return current;
          return {
            ...current,
            events: current.events.map((row) => (row.id === eventId ? { ...row, ...data.event! } : row)),
          };
        });
      }
      if (selectedEventId === eventId) {
        await fetchRecords(eventId);
      }
      await fetchOverview();
    } catch (err: any) {
      setActionError(err?.message || "Failed to update event status.");
    }
  };

  const deleteEvent = async (eventId: number) => {
    const confirmed = window.confirm("Delete this event from public visibility?");
    if (!confirmed) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await apiFetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: "Admin moderation removal" }),
      });
      setActionSuccess("Event deleted.");
      if (selectedEventId === eventId) {
        setSelectedEventId(null);
        setRecords(null);
      }
      await fetchOverview();
    } catch (err: any) {
      setActionError(err?.message || "Failed to delete event.");
    }
  };

  return (
    <AdminWorkspaceLayout
      title="Event Moderation"
      description="Monitor event creators, posted events, message activity, and ticket activity without slowing down publishing."
      onRefresh={() => void fetchOverview()}
    >
      <div className="space-y-6">
        {loadError ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-bm-danger">
            {loadError}
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-bm-danger">
            {actionError}
          </div>
        ) : null}
        {actionSuccess ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-bm-success">
            {actionSuccess}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Creators" value={String(summary.creatorCount)} icon={Users} helper={`${summary.suspendedCreatorCount} suspended`} />
          <StatCard label="Events" value={String(summary.eventCount)} icon={CalendarDays} helper={`${summary.publishedEventCount} published`} />
          <StatCard label="Messages" value={String(summary.totalMessageThreads)} icon={MessageCircle} helper={`${summary.totalUnreadMessages} unread`} />
          <StatCard label="Traffic" value={String(summary.totalTicketClicks)} icon={Ticket} helper={`${summary.totalCartAdds} cart adds`} />
        </div>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <section className="min-w-0 space-y-4">
            <div className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Event creator submissions</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-bm-text dark:text-bm-text">Creators and approvals</h2>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400 dark:text-bm-text-subtle" />
                  <input
                    value={creatorQuery}
                    onChange={(event) => setCreatorQuery(event.target.value)}
                    placeholder="Search creators"
                    className="w-52 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  />
                </label>
              </div>

              <div className="mt-4 max-w-full overflow-x-auto rounded-[1.5rem] border border-bm-border dark:border-bm-border">
                <div className="grid min-w-[760px] grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-3 border-b border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">
                  <div>Creator</div>
                  <div>Organisation</div>
                  <div>Status</div>
                  <div>Events</div>
                  <div>Messages</div>
                  <div>Activity</div>
                </div>
                <div className="max-h-[460px] divide-y divide-zinc-200 dark:divide-bm-border overflow-auto bg-bm-surface">
                  {creators.length === 0 ? (
                    <div className="p-5 text-sm text-bm-text-subtle dark:text-bm-text-subtle">No creators found.</div>
                  ) : (
                    creators.map((creator) => (
                      <button
                        key={creator.uid}
                        type="button"
                        onClick={() => {
                          setSelectedCreatorUid(creator.uid);
                          setSelectedEventId(null);
                        }}
                        className={`grid min-w-[760px] w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-3 px-4 py-3 text-left transition hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted ${selectedCreatorUid === creator.uid ? "bg-bm-surface-muted dark:bg-bm-surface-subtle" : "bg-bm-surface"}`}
                      >
                        <div>
                          <p className="font-bold text-zinc-950 dark:text-bm-text">{creator.display_name}</p>
                          <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">{creator.email}</p>
                        </div>
                        <div>
                          <p className="font-medium text-bm-text dark:text-bm-text">{creator.organization_name}</p>
                          <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">{creator.organization_type}</p>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(creator.status)}`}>
                            {creator.status}
                          </span>
                          <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Applied: {formatDate(creator.latest_submission_created_at)}</p>
                        </div>
                        <div className="text-sm font-semibold text-bm-text dark:text-bm-text">{creator.event_count}</div>
                        <div className="text-sm font-semibold text-bm-text dark:text-bm-text">{creator.message_threads}</div>
                        <div className="text-xs text-bm-text-muted dark:text-bm-text-muted">
                          <div>{creator.cart_adds} cart</div>
                          <div>{creator.ticket_clicks} clicks</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Posted events</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-bm-text dark:text-bm-text">Event status and activity</h2>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400 dark:text-bm-text-subtle" />
                  <input
                    value={eventQuery}
                    onChange={(event) => setEventQuery(event.target.value)}
                    placeholder="Search events"
                    className="w-52 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  />
                </label>
              </div>

              <div className="mt-4 max-w-full overflow-x-auto rounded-[1.5rem] border border-bm-border dark:border-bm-border">
                <div className="grid min-w-[680px] grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-3 border-b border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">
                  <div>Event</div>
                  <div>Status</div>
                  <div>Messages</div>
                  <div>Traffic</div>
                  <div>Records</div>
                </div>
                <div className="max-h-[520px] divide-y divide-zinc-200 dark:divide-bm-border overflow-auto bg-bm-surface">
                  {events.length === 0 ? (
                    <div className="p-5 text-sm text-bm-text-subtle dark:text-bm-text-subtle">No events found for the selected creator.</div>
                  ) : (
                    events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          if (event.creator_uid) setSelectedCreatorUid(event.creator_uid);
                        }}
                        className={`grid min-w-[680px] w-full grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] gap-3 px-4 py-3 text-left transition hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted ${selectedEventId === event.id ? "bg-bm-surface-muted dark:bg-bm-surface-subtle" : "bg-bm-surface"}`}
                      >
                        <div>
                          <p className="font-bold text-zinc-950 dark:text-bm-text">{event.event_title}</p>
                          <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                            {event.event_type} • {event.organizer_name}
                          </p>
                          <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                            {formatDate(event.event_date)} • {event.location}
                          </p>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(event.status)}`}>
                            {event.status}
                          </span>
                          <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{event.creator_display_name || event.creator_email || event.creator_uid || "—"}</p>
                        </div>
                        <div className="text-sm font-semibold text-bm-text dark:text-bm-text">{event.message_threads}</div>
                        <div className="text-xs text-bm-text-muted dark:text-bm-text-muted">
                          <div>{event.cart_adds} cart</div>
                          <div>{event.ticket_clicks} clicks</div>
                        </div>
                        <div className="text-xs text-bm-text-muted dark:text-bm-text-muted">
                          <div>{event.purchase_count} purchases</div>
                          <div>{formatDateTime(event.last_activity_at)}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="min-w-0 space-y-4 self-start lg:sticky lg:top-24">
            <div className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Selected creator</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-bm-text dark:text-bm-text">{selectedCreator?.display_name || "No creator selected"}</h3>
                  <p className="mt-1 text-sm text-bm-text-subtle dark:text-bm-text-subtle">{selectedCreator?.organization_name || "Choose a creator row to inspect their profile."}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(selectedCreator?.status || "")}`}>
                  {selectedCreator?.status || "—"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-bm-text-muted dark:text-bm-text-muted">
                <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Profile</p>
                  <p className="mt-1 font-semibold text-zinc-950 dark:text-bm-text">{selectedCreator?.email || "—"}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{selectedCreator?.organization_type || "—"}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">WhatsApp: {selectedCreator?.contact_whatsapp || "—"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Submission</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Latest: {selectedCreator?.latest_submission_status || "—"}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Reason: {selectedCreator?.latest_submission_reason || "—"}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Applied: {formatDateTime(selectedCreator?.latest_submission_created_at)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Activity summary</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Events: {selectedCreator?.event_count ?? 0}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Messages: {selectedCreator?.message_threads ?? 0}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Traffic: {selectedCreator?.cart_adds ?? 0} cart / {selectedCreator?.ticket_clicks ?? 0} clicks</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Last activity: {formatDateTime(selectedCreator?.last_activity_at)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedCreator ? (
                  selectedCreator.status === "suspended" ? (
                    <ActionButton onClick={() => void updateCreatorStatus(selectedCreator.uid, "approved")} variant="success">
                      <ShieldCheck className="h-4 w-4" />
                      Reinstate
                    </ActionButton>
                  ) : (
                    <ActionButton onClick={() => void updateCreatorStatus(selectedCreator.uid, "suspended")} variant="danger">
                      <ShieldOff className="h-4 w-4" />
                      Suspend
                    </ActionButton>
                  )
                ) : null}
                <ActionButton onClick={() => navigateToPath(ADMIN_EVENTS_PATH)} variant="ghost">
                  <ArrowRight className="h-4 w-4" />
                  Workspace home
                </ActionButton>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-bm-border dark:border-bm-border pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Selected event</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-bm-text dark:text-bm-text">{selectedEvent?.event_title || "No event selected"}</h3>
                  <p className="mt-1 text-sm text-bm-text-subtle dark:text-bm-text-subtle">{selectedEvent ? `${selectedEvent.event_type} • ${selectedEvent.organizer_name}` : "Choose an event to inspect records and actions."}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(selectedEvent?.status || "")}`}>
                  {selectedEvent?.status || "—"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-bm-text-muted dark:text-bm-text-muted">
                <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Details</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{selectedEvent ? `${selectedEvent.location} • ${selectedEvent.venue}` : "—"}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Date: {formatDate(selectedEvent?.event_date)}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Start: {selectedEvent?.start_time || "—"}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Ticket: {formatMoney(selectedEvent?.ticket_price)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Payout receiving destination</p>
                  {recordsLoading && !selectedRecordPayload ? (
                    <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Loading destination...</p>
                  ) : selectedRecordPayload?.payoutDestination ? (
                    <>
                      <p className="mt-1 font-semibold text-zinc-950 dark:text-bm-text">
                        {selectedRecordPayload.payoutDestination.provider_name} • {selectedRecordPayload.payoutDestination.destination_type.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                        {selectedRecordPayload.payoutDestination.account_name} • {selectedRecordPayload.payoutDestination.masked_account}
                      </p>
                      <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                        {selectedRecordPayload.payoutDestination.currency} • {selectedRecordPayload.payoutDestination.verification_status} • {selectedRecordPayload.payoutDestination.is_active ? "Active" : "Inactive"}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-400 dark:text-bm-text-subtle">Destination ID: {selectedRecordPayload.payoutDestination.id}</p>
                    </>
                  ) : (
                    <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">No payout receiving destination is assigned to this event.</p>
                  )}
                </div>
                <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Moderation totals</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Messages: {selectedEvent?.message_threads ?? 0}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Unread: {selectedEvent?.unread_messages ?? 0}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Cart adds: {selectedEvent?.cart_adds ?? 0}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Clicks: {selectedEvent?.ticket_clicks ?? 0}</p>
                  <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Purchases: {selectedEvent?.purchase_count ?? 0}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedEvent ? (
                  selectedEvent.status === "published" ? (
                    <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "inactive")}>
                      <EyeOff className="h-4 w-4" />
                      Hide
                    </ActionButton>
                  ) : (
                    <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "published")} variant="success">
                      <Eye className="h-4 w-4" />
                      Publish
                    </ActionButton>
                  )
                ) : null}
                {selectedEvent ? (
                  <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "cancelled")} variant="ghost">
                    <RefreshCw className="h-4 w-4" />
                    Cancel
                  </ActionButton>
                ) : null}
                {selectedEvent ? (
                  <ActionButton onClick={() => void deleteEvent(selectedEvent.id)} variant="danger">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </ActionButton>
                ) : null}
                {selectedEvent ? (
                  <ActionButton onClick={() => navigateToPath(`${EVENTS_PATH}?event=${selectedEvent.id}`)} variant="ghost">
                    <ArrowRight className="h-4 w-4" />
                    View public
                  </ActionButton>
                ) : null}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-bm-border dark:border-bm-border pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Event records</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-bm-text dark:text-bm-text">Ticket and purchase trail</h3>
                </div>
                <ReceiptText className="h-5 w-5 text-zinc-400 dark:text-bm-text-subtle" />
              </div>

              {recordsLoading ? (
                <div className="mt-4 flex items-center gap-3 rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4 text-sm text-bm-text-muted dark:text-bm-text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading event records...
                </div>
              ) : recordsError ? (
                <div className="mt-4 rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm text-bm-danger">
                  {recordsError}
                </div>
              ) : selectedRecordPayload ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface-muted/80 dark:bg-bm-surface-subtle/80 p-4 text-sm text-bm-text-muted dark:text-bm-text-muted">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">Activities</p>
                    <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{selectedRecordPayload.activities.length} activity rows</p>
                    <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{selectedRecordPayload.conversations.length} conversation threads</p>
                    <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{selectedRecordPayload.purchaseRecords.length} purchase records</p>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-auto">
                    {selectedRecordPayload.activities.length === 0 ? (
                      <div className="rounded-[1.4rem] border border-dashed border-bm-border dark:border-bm-border bg-bm-surface p-4 text-sm text-bm-text-subtle dark:text-bm-text-subtle">No activity logs yet.</div>
                    ) : (
                      selectedRecordPayload.activities.map((activity) => (
                        <div key={activity.id} className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface p-4 text-sm text-bm-text-muted dark:text-bm-text-muted">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-zinc-950 dark:text-bm-text">{activity.activity_type}</p>
                              <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">{formatDateTime(activity.created_at)}</p>
                            </div>
                            <span className="rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">
                              Activity
                            </span>
                          </div>
                          <pre className="mt-3 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-subtle p-3 text-[11px] text-bm-text-muted dark:text-bm-text-muted">{JSON.stringify(activity.metadata, null, 2)}</pre>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Purchase records</p>
                    <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                      {selectedRecordPayload.purchaseRecords.length === 0 ? (
                        <div className="rounded-[1.4rem] border border-dashed border-bm-border dark:border-bm-border bg-bm-surface p-4 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                          No purchase records were found yet.
                        </div>
                      ) : (
                        selectedRecordPayload.purchaseRecords.map((purchase) => (
                          <div key={String(purchase.id)} className="rounded-[1.4rem] border border-bm-border dark:border-bm-border bg-bm-surface p-4 text-sm text-bm-text-muted dark:text-bm-text-muted">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-zinc-950 dark:text-bm-text">Order {String(purchase.id)}</p>
                                <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">
                                  {String(purchase.status ?? "—")} • {String(purchase.total_currency ?? purchase.currency ?? "MWK")} {String(purchase.total_amount ?? "0")}
                                </p>
                                <p className="mt-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle">Placed: {formatDateTime(String(purchase.created_at ?? null))}</p>
                              </div>
                              <span className="rounded-full bg-bm-surface-muted dark:bg-bm-surface-muted px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">
                                Purchase
                              </span>
                            </div>
                            <pre className="mt-3 max-w-full overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-bm-surface-muted dark:bg-bm-surface-subtle p-3 text-[11px] text-bm-text-muted dark:text-bm-text-muted">{String(purchase.items ?? "")}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-bm-border dark:border-bm-border bg-bm-surface-muted/70 p-4 text-sm text-bm-text-subtle dark:text-bm-text-subtle">
                  Select an event to inspect ticket, conversation, and purchase records.
                </div>
              )}
            </div>
          </aside>
        </div>

        <section className="rounded-[1.75rem] border border-bm-border dark:border-bm-border bg-bm-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-bm-border dark:border-bm-border pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400 dark:text-bm-text-subtle">Submissions audit</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-bm-text dark:text-bm-text">Recent creator applications</h3>
            </div>
            <span className="rounded-full border border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-bm-text-subtle dark:text-bm-text-subtle">
              {overview?.submissions.length ?? 0} submissions
            </span>
          </div>
          <div className="mt-4 max-w-full overflow-x-auto rounded-[1.5rem] border border-bm-border dark:border-bm-border">
            <div className="grid min-w-[680px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 border-b border-bm-border dark:border-bm-border bg-bm-surface-muted dark:bg-bm-surface-subtle px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400 dark:text-bm-text-subtle">
              <div>Creator</div>
              <div>Organisation</div>
              <div>Status</div>
              <div>Applied</div>
              <div>Reason</div>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-bm-border bg-bm-surface">
              {(overview?.submissions ?? []).map((submission) => (
                <div key={submission.id} className="grid min-w-[680px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold text-zinc-950 dark:text-bm-text">{submission.display_name}</p>
                    <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">{submission.applicant_email || submission.applicant_uid}</p>
                  </div>
                  <div>
                    <p className="font-medium text-bm-text dark:text-bm-text">{submission.organization_name}</p>
                    <p className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">{submission.organization_type}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>
                  <div className="text-xs text-bm-text-subtle dark:text-bm-text-subtle">{formatDateTime(submission.created_at)}</div>
                  <div className="text-xs text-bm-text-muted dark:text-bm-text-muted line-clamp-2">{submission.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminWorkspaceLayout>
  );
}