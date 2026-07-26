import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  ReceiptText,
  Search,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";

import { apiFetch } from "./lib/api";
import {
  ADMIN_EVENTS_PATH,
  EVENTS_PATH,
  navigateToPath,
} from "./lib/appNavigation";
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
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "suspended":
    case "inactive":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "pending":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
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
  icon: React.ComponentType<{ className?: string }>;
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
  variant?: "default" | "danger" | "ghost" | "success";
  disabled?: boolean;
}) {
  const className =
    variant === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
      : variant === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
      if (!selectedCreatorUid && data.creators.length > 0) {
        setSelectedCreatorUid(data.creators[0].uid);
      }
      if (!selectedEventId && data.events.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
      setActionSuccess(null);
      setActionError(null);
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
    // Keep URL in sync after a selection changes.
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

  const creatorStats = overview?.summary ?? {
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
            events: current.events.map((event) =>
              event.creator_uid === creatorUid && status === "suspended"
                ? { ...event, creator_status: status, status: event.status === "published" ? "inactive" : event.status }
                : event
            ),
            summary: {
              ...current.summary,
              suspendedCreatorCount:
                current.creators.filter((row) => row.status === "suspended").length + (status === "suspended" ? 1 : -1),
            },
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
    const confirmed = window.confirm("Delete this event permanently from public visibility?");
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
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {loadError}
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {actionError}
          </div>
        ) : null}
        {actionSuccess ? (
          <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {actionSuccess}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Creators" value={String(creatorStats.creatorCount)} icon={Users} helper={`${creatorStats.suspendedCreatorCount} suspended`} />
          <StatCard label="Events" value={String(creatorStats.eventCount)} icon={CalendarDays} helper={`${creatorStats.publishedEventCount} published`} />
          <StatCard label="Messages" value={String(creatorStats.totalMessageThreads)} icon={MessageCircle} helper={`${creatorStats.totalUnreadMessages} unread`} />
          <StatCard label="Traffic" value={String(creatorStats.totalTicketClicks)} icon={Ticket} helper={`${creatorStats.totalCartAdds} cart adds`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <section className="space-y-4">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Event creator submissions</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">Creators and approvals</h2>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={creatorQuery}
                    onChange={(event) => setCreatorQuery(event.target.value)}
                    placeholder="Search creators"
                    className="w-52 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  />
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-zinc-200">
                <div className="grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                  <div>Creator</div>
                  <div>Organisation</div>
                  <div>Status</div>
                  <div>Events</div>
                  <div>Messages</div>
                  <div>Activity</div>
                </div>
                <div className="max-h-[460px] divide-y divide-zinc-200 overflow-auto bg-white">
                  {creators.length === 0 ? (
                    <div className="p-5 text-sm text-zinc-500">No creators found.</div>
                  ) : (
                    creators.map((creator) => (
                      <button
                        key={creator.uid}
                        type="button"
                        onClick={() => {
                          setSelectedCreatorUid(creator.uid);
                          setSelectedEventId(null);
                        }}
                        className={`grid w-full grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 ${selectedCreatorUid === creator.uid ? "bg-zinc-50" : "bg-white"}`}
                      >
                        <div>
                          <p className="font-bold text-zinc-950">{creator.display_name}</p>
                          <p className="text-xs text-zinc-500">{creator.email}</p>
                        </div>
                        <div>
                          <p className="font-medium text-zinc-900">{creator.organization_name}</p>
                          <p className="text-xs text-zinc-500">{creator.organization_type}</p>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(creator.status)}`}>
                            {creator.status}
                          </span>
                          <p className="mt-1 text-xs text-zinc-500">Applied: {formatDate(creator.latest_submission_created_at)}</p>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900">{creator.event_count}</div>
                        <div className="text-sm font-semibold text-zinc-900">{creator.message_threads}</div>
                        <div className="text-xs text-zinc-600">
                          <div>{creator.cart_adds} cart</div>
                          <div>{creator.ticket_clicks} clicks</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Posted events</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-900">Event status and activity</h2>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <Search className="h-4 w-4 text-zinc-400" />
                  <input
                    value={eventQuery}
                    onChange={(event) => setEventQuery(event.target.value)}
                    placeholder="Search events"
                    className="w-52 bg-transparent text-sm outline-none placeholder:text-zinc-400"
                  />
                </label>
              </div>

              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-zinc-200">
                <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                  <div>Event</div>
                  <div>Status</div>
                  <div>Messages</div>
                  <div>Traffic</div>
                  <div>Records</div>
                </div>
                <div className="max-h-[520px] divide-y divide-zinc-200 overflow-auto bg-white">
                  {events.length === 0 ? (
                    <div className="p-5 text-sm text-zinc-500">No events found for the selected creator.</div>
                  ) : (
                    events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(event.id);
                          if (event.creator_uid) setSelectedCreatorUid(event.creator_uid);
                        }}
                        className={`grid w-full grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.9fr] gap-3 px-4 py-3 text-left transition hover:bg-zinc-50 ${selectedEventId === event.id ? "bg-zinc-50" : "bg-white"}`}
                      >
                        <div>
                          <p className="font-bold text-zinc-950">{event.event_title}</p>
                          <p className="text-xs text-zinc-500">
                            {event.event_type} • {event.organizer_name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatDate(event.event_date)} • {event.location}
                          </p>
                        </div>
                        <div>
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(event.status)}`}>
                            {event.status}
                          </span>
                          <p className="mt-1 text-xs text-zinc-500">{event.creator_display_name || event.creator_email || event.creator_uid || "—"}</p>
                        </div>
                        <div className="text-sm font-semibold text-zinc-900">{event.message_threads}</div>
                        <div className="text-xs text-zinc-600">
                          <div>{event.cart_adds} cart</div>
                          <div>{event.ticket_clicks} clicks</div>
                        </div>
                        <div className="text-xs text-zinc-600">
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

          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Selected creator</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-900">{selectedCreator?.display_name || "No creator selected"}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{selectedCreator?.organization_name || "Choose a creator row to inspect their profile."}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(selectedCreator?.status || "")}`}>
                  {selectedCreator?.status || "—"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-zinc-700">
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Profile</p>
                  <p className="mt-1 font-semibold text-zinc-950">{selectedCreator?.email || "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">{selectedCreator?.organization_type || "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">WhatsApp: {selectedCreator?.contact_whatsapp || "—"}</p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Submission</p>
                  <p className="mt-1 text-xs text-zinc-500">Latest: {selectedCreator?.latest_submission_status || "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">Reason: {selectedCreator?.latest_submission_reason || "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">Applied: {formatDateTime(selectedCreator?.latest_submission_created_at)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Activity summary</p>
                  <p className="mt-1 text-xs text-zinc-500">Events: {selectedCreator?.event_count ?? 0}</p>
                  <p className="mt-1 text-xs text-zinc-500">Messages: {selectedCreator?.message_threads ?? 0}</p>
                  <p className="mt-1 text-xs text-zinc-500">Traffic: {selectedCreator?.cart_adds ?? 0} cart / {selectedCreator?.ticket_clicks ?? 0} clicks</p>
                  <p className="mt-1 text-xs text-zinc-500">Last activity: {formatDateTime(selectedCreator?.last_activity_at)}</p>
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

            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Selected event</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-900">{selectedEvent?.event_title || "No event selected"}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{selectedEvent ? `${selectedEvent.event_type} • ${selectedEvent.organizer_name}` : "Choose an event to inspect records and actions."}</p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(selectedEvent?.status || "")}`}>
                  {selectedEvent?.status || "—"}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-zinc-700">
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Details</p>
                  <p className="mt-1 text-xs text-zinc-500">{selectedEvent ? `${selectedEvent.location} • ${selectedEvent.venue}` : "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">Date: {formatDate(selectedEvent?.event_date)}</p>
                  <p className="mt-1 text-xs text-zinc-500">Start: {selectedEvent?.start_time || "—"}</p>
                  <p className="mt-1 text-xs text-zinc-500">Ticket: {formatMoney(selectedEvent?.ticket_price)}</p>
                </div>
                <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Moderation totals</p>
                  <p className="mt-1 text-xs text-zinc-500">Messages: {selectedEvent?.message_threads ?? 0}</p>
                  <p className="mt-1 text-xs text-zinc-500">Unread: {selectedEvent?.unread_messages ?? 0}</p>
                  <p className="mt-1 text-xs text-zinc-500">Cart adds: {selectedEvent?.cart_adds ?? 0}</p>
                  <p className="mt-1 text-xs text-zinc-500">Clicks: {selectedEvent?.ticket_clicks ?? 0}</p>
                  <p className="mt-1 text-xs text-zinc-500">Purchases: {selectedEvent?.purchase_count ?? 0}</p>
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

            <div className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Event records</p>
                  <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-900">Ticket and purchase trail</h3>
                </div>
                <ReceiptText className="h-5 w-5 text-zinc-400" />
              </div>

              {recordsLoading ? (
                <div className="mt-4 flex items-center gap-3 rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading event records...
                </div>
              ) : recordsError ? (
                <div className="mt-4 rounded-[1.4rem] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  {recordsError}
                </div>
              ) : selectedRecordPayload ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4 text-sm text-zinc-700">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Activities</p>
                    <p className="mt-1 text-xs text-zinc-500">{selectedRecordPayload.activities.length} activity rows</p>
                    <p className="mt-1 text-xs text-zinc-500">{selectedRecordPayload.conversations.length} conversation threads</p>
                    <p className="mt-1 text-xs text-zinc-500">{selectedRecordPayload.purchaseRecords.length} purchase records</p>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-auto">
                    {selectedRecordPayload.activities.length === 0 ? (
                      <div className="rounded-[1.4rem] border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">No activity logs yet.</div>
                    ) : (
                      selectedRecordPayload.activities.map((activity) => (
                        <div key={activity.id} className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-zinc-950">{activity.activity_type}</p>
                              <p className="mt-1 text-xs text-zinc-500">{formatDateTime(activity.created_at)}</p>
                            </div>
                            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-500">
                              Activity
                            </span>
                          </div>
                          <pre className="mt-3 overflow-auto rounded-2xl bg-zinc-50 p-3 text-[11px] text-zinc-600">{JSON.stringify(activity.metadata, null, 2)}</pre>
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Purchase records</p>
                    <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                      {selectedRecordPayload.purchaseRecords.length === 0 ? (
                        <div className="rounded-[1.4rem] border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
                          No purchase records were found yet.
                        </div>
                      ) : (
                        selectedRecordPayload.purchaseRecords.map((purchase) => (
                          <div key={String(purchase.id)} className="rounded-[1.4rem] border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-zinc-950">Order {String(purchase.id)}</p>
                                <p className="mt-1 text-xs text-zinc-500">
                                  {String(purchase.status ?? "—")} • {String(purchase.total_currency ?? purchase.currency ?? "MWK")} {String(purchase.total_amount ?? "0")}
                                </p>
                                <p className="mt-1 text-xs text-zinc-500">Placed: {formatDateTime(String(purchase.created_at ?? null))}</p>
                              </div>
                              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-500">
                                Purchase
                              </span>
                            </div>
                            <pre className="mt-3 overflow-auto rounded-2xl bg-zinc-50 p-3 text-[11px] text-zinc-600">{String(purchase.items ?? "")}</pre>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-zinc-200 bg-zinc-50/70 p-4 text-sm text-zinc-500">
                  Select an event to inspect ticket, conversation, and purchase records.
                </div>
              )}
            </div>
          </aside>
        </div>

        <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Submissions audit</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-900">Recent creator applications</h3>
            </div>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-zinc-500">
              {overview?.submissions.length ?? 0} submissions
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-zinc-200">
            <div className="grid grid-cols-[1fr_1fr_1fr_0.8fr_1.2fr] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
              <div>Creator</div>
              <div>Organisation</div>
              <div>Status</div>
              <div>Applied</div>
              <div>Reason</div>
            </div>
            <div className="divide-y divide-zinc-200 bg-white">
              {(overview?.submissions ?? []).map((submission) => (
                <div key={submission.id} className="grid grid-cols-[1fr_1fr_1fr_0.8fr_1.2fr] gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-bold text-zinc-950">{submission.display_name}</p>
                    <p className="text-xs text-zinc-500">{submission.applicant_email || submission.applicant_uid}</p>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">{submission.organization_name}</p>
                    <p className="text-xs text-zinc-500">{submission.organization_type}</p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${statusBadge(submission.status)}`}>
                      {submission.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">{formatDateTime(submission.created_at)}</div>
                  <div className="text-xs text-zinc-600 line-clamp-2">{submission.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AdminWorkspaceLayout>
  );
}