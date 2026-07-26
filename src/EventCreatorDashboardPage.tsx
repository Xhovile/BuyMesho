import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, Clock3, ExternalLink, Loader2, MessageCircle, Pencil, RefreshCw, Ticket, Trash2, Eye } from "lucide-react";

import AccountPageShell from "./components/AccountPageShell";
import { apiFetch } from "./lib/api";
import { EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, EVENTS_PATH, navigateToLoginWithReturnPath, navigateToPath } from "./lib/appNavigation";
import { fetchInbox } from "./lib/messages";
import { navigateToConversation } from "./lib/messagesNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import type { Conversation } from "./types";

type CreatorProfile = {
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
};

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
};

type CreatorDashboardResponse = {
  creator: CreatorProfile | null;
  events: ManagedEvent[];
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

function badgeClass(status: string) {
  switch (status.toLowerCase()) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "inactive":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "cancelled":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-zinc-700";
  }
}

function StatCard({ label, value, helper, icon: Icon }: { label: string; value: string; helper?: string; icon: typeof BarChart3 }) {
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
  const [dashboard, setDashboard] = useState<CreatorDashboardResponse | null>(null);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedEventId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("event");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, inboxResponse] = await Promise.allSettled([
        apiFetch("/api/event-creator/dashboard"),
        fetchInbox(),
      ]);

      if (dashboardResponse.status === "fulfilled") {
        const data = dashboardResponse.value as CreatorDashboardResponse;
        setDashboard({
          creator: data?.creator ?? null,
          events: Array.isArray(data?.events) ? data.events : [],
        });
      } else {
        throw dashboardResponse.reason;
      }

      if (inboxResponse.status === "fulfilled") {
        setInbox(Array.isArray(inboxResponse.value) ? inboxResponse.value : []);
      } else {
        setInbox([]);
      }
    } catch (loadError: any) {
      setError(loadError?.message || "Could not load your event dashboard.");
      setDashboard({ creator: null, events: [] });
      setInbox([]);
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
    void loadDashboard();
  }, [authLoading, firebaseUser]);

  const events = dashboard?.events ?? [];
  const selectedEvent = useMemo(() => {
    if (events.length === 0) return null;
    return events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;
  }, [events, selectedEventId]);

  const selectedThreads = useMemo(() => {
    if (!selectedEvent) return [];
    return inbox
      .filter((conversation) => conversation.thread_type === "event" && (conversation.event?.id === selectedEvent.id || conversation.event_id === selectedEvent.id))
      .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  }, [inbox, selectedEvent]);

  const totals = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        acc.ticketClicks += Number(event.ticket_clicks || 0);
        acc.cartAdds += Number(event.cart_adds || 0);
        acc.threads += Number(event.message_threads || 0);
        acc.unread += Number(event.unread_messages || 0);
        if (event.status === "published") acc.published += 1;
        if (event.status === "inactive") acc.inactive += 1;
        return acc;
      },
      { ticketClicks: 0, cartAdds: 0, threads: 0, unread: 0, published: 0, inactive: 0 }
    );
  }, [events]);

  const handleSelectEvent = (eventId: number) => {
    navigateToPath(`${EVENTS_MANAGE_PATH}?event=${eventId}`);
  };

  const handleEditEvent = (eventId: number) => {
    navigateToPath(`${EVENTS_CREATE_PATH}?edit=${eventId}`);
  };

  const handleViewPublic = (eventId: number) => {
    navigateToPath(`${EVENTS_PATH}?event=${eventId}`);
  };

  const handleOpenThread = (conversationId: number) => {
    navigateToConversation(conversationId);
  };

  const updateEventStatus = async (eventId: number, status: "published" | "inactive") => {
    await apiFetch(`/api/event-creator/events/${eventId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
        title="Creator dashboard"
        description="Manage the events you own, review ticket activity, and open event conversations without touching seller tools."
        backLabel="Back to Events"
        onBack={() => navigateToPath(EVENTS_PATH)}
        childrenSectionClassName="w-full"
      >
        <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white p-10 text-zinc-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading creator dashboard...
        </div>
      </AccountPageShell>
    );
  }

  if (!firebaseUser) {
    return (
      <AccountPageShell
        eyebrow="Event creator"
        title="Creator dashboard"
        description="Manage the events you own, review ticket activity, and open event conversations without touching seller tools."
        backLabel="Back to Events"
        onBack={() => navigateToPath(EVENTS_PATH)}
        childrenSectionClassName="w-full"
      >
        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900">Login required</h2>
          <p className="mt-3 text-sm text-zinc-500">Sign in before opening the event creator dashboard.</p>
          <ActionButton onClick={() => navigateToLoginWithReturnPath(EVENTS_MANAGE_PATH)}>
            Go to Login
          </ActionButton>
        </div>
      </AccountPageShell>
    );
  }

  const creatorProfile = dashboard?.creator ?? null;
  const activeUntil = creatorProfile?.active_until ? formatDateTime(creatorProfile.active_until) : null;

  return (
    <AccountPageShell
      eyebrow="Event creator"
      title="Creator dashboard"
      description="Manage the events you own, review ticket activity, and open event conversations without touching seller tools."
      backLabel="Back to Events"
      onBack={() => navigateToPath(EVENTS_PATH)}
      childrenSectionClassName="w-full"
    >
      <div className="space-y-6">
        {error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Owned events" value={String(events.length)} icon={Ticket} helper="Only your events are shown here." />
          <StatCard label="Published" value={String(totals.published)} icon={Eye} helper="Visible in the public directory." />
          <StatCard label="Inactive" value={String(totals.inactive)} icon={Clock3} helper="Hidden from the public directory." />
          <StatCard label="Event threads" value={String(totals.threads)} icon={MessageCircle} helper={`${totals.unread} unread messages`} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <section className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-200/30">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Your events</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Manage</h2>
              </div>
              <button
                type="button"
                onClick={loadDashboard}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-extrabold text-zinc-900 hover:bg-zinc-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {events.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-zinc-200 bg-zinc-50/60 p-5 text-sm text-zinc-600">
                  No events yet. Create your first event to start managing it here.
                  <div className="mt-4">
                    <ActionButton onClick={() => navigateToPath(EVENTS_CREATE_PATH)}>
                      Create Event
                      <ArrowRight className="h-4 w-4" />
                    </ActionButton>
                  </div>
                </div>
              ) : (
                events.map((event) => {
                  const active = selectedEvent?.id === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSelectEvent(event.id)}
                      className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                        active ? "border-zinc-900 bg-zinc-950 text-white shadow-lg shadow-zinc-950/10" : "border-zinc-200 bg-white hover:bg-zinc-50"
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
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${badgeClass(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      <div className={`mt-3 flex flex-wrap gap-2 text-[11px] font-bold ${active ? "text-white/80" : "text-zinc-500"}`}>
                        <span className="rounded-full border border-current/10 px-3 py-1">{event.message_threads} threads</span>
                        <span className="rounded-full border border-current/10 px-3 py-1">{event.cart_adds} cart adds</span>
                        <span className="rounded-full border border-current/10 px-3 py-1">{event.ticket_clicks} clicks</span>
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
                {events.length === 0 ? (
                  <>
                    Your event creator dashboard is empty. Once you publish an event, its edit controls, messages, and ticket activity will appear here.
                    <div className="mt-4">
                      <ActionButton onClick={() => navigateToPath(EVENTS_CREATE_PATH)}>
                        Publish Event
                        <ArrowRight className="h-4 w-4" />
                      </ActionButton>
                    </div>
                  </>
                ) : (
                  "Select an event from the left to manage it."
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
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] ${badgeClass(selectedEvent.status)}`}>
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
                    <ActionButton onClick={() => handleEditEvent(selectedEvent.id)}>
                      <Pencil className="h-4 w-4" />
                      Edit
                    </ActionButton>
                    <ActionButton onClick={() => handleViewPublic(selectedEvent.id)} variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                      View public page
                    </ActionButton>
                    {selectedEvent.status === "inactive" ? (
                      <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "published")}>
                        <RefreshCw className="h-4 w-4" />
                        Reactivate
                      </ActionButton>
                    ) : (
                      <ActionButton onClick={() => void updateEventStatus(selectedEvent.id, "inactive")} variant="ghost">
                        <Clock3 className="h-4 w-4" />
                        Mark inactive
                      </ActionButton>
                    )}
                    <ActionButton onClick={() => void handleDeleteEvent(selectedEvent.id)} variant="danger">
                      <Trash2 className="h-4 w-4" />
                      Cancel
                    </ActionButton>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard label="Ticket clicks" value={String(selectedEvent.ticket_clicks)} icon={ExternalLink} helper="Clicks on the buy button." />
                  <StatCard label="Cart adds" value={String(selectedEvent.cart_adds)} icon={Ticket} helper="Tickets added to cart." />
                  <StatCard label="Message threads" value={String(selectedEvent.message_threads)} icon={MessageCircle} helper={`${selectedEvent.unread_messages} unread messages`} />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                  <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Messages</p>
                        <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">Event conversations</h3>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500">
                        {selectedThreads.length} threads
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {selectedThreads.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-zinc-200 bg-zinc-50/70 p-5 text-sm text-zinc-600">
                          No one has messaged about this event yet.
                        </div>
                      ) : (
                        selectedThreads.map((conversation) => {
                          const buyerName = conversation.buyer?.business_name || conversation.buyer_uid || "Buyer";
                          const preview = conversation.last_message_preview || "No preview available.";
                          const unread = Number(conversation.seller_unread_count || 0);
                          return (
                            <div key={conversation.id} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-black tracking-tight text-zinc-950">{buyerName}</p>
                                  <p className="mt-1 text-xs font-medium text-zinc-500">Updated {formatDateTime(conversation.updated_at)}</p>
                                </div>
                                {unread > 0 ? (
                                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
                                    {unread} unread
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-zinc-700">{preview}</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                <ActionButton onClick={() => handleOpenThread(conversation.id)}>
                                  Open thread
                                  <ArrowRight className="h-4 w-4" />
                                </ActionButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded-[1.75rem] border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Activity</p>
                        <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">Ticket movement</h3>
                      </div>
                      <BarChart3 className="h-5 w-5 text-zinc-400" />
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-zinc-700">
                      <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Buy clicks</p>
                        <p className="mt-1 text-2xl font-black tracking-tight text-zinc-950">{selectedEvent.ticket_clicks}</p>
                        <p className="mt-1 text-xs text-zinc-500">People who opened the ticket link from the event page.</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Cart adds</p>
                        <p className="mt-1 text-2xl font-black tracking-tight text-zinc-950">{selectedEvent.cart_adds}</p>
                        <p className="mt-1 text-xs text-zinc-500">Tickets saved by buyers for later checkout.</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Last ticket activity</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">{formatDateTime(selectedEvent.last_activity_at)}</p>
                      </div>
                      <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Creator status</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-950">{creatorProfile?.status || "Unknown"}</p>
                        <p className="mt-1 text-xs text-zinc-500">Active until: {activeUntil || "—"}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/30">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Creator profile</p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-zinc-950">{creatorProfile?.display_name || firebaseUser.email || "Your account"}</h3>
            </div>
            <div className="text-right text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
              {creatorProfile?.organization_name || "No organization yet"}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Email</p>
              <p className="mt-1 break-words text-sm font-semibold text-zinc-950">{creatorProfile?.email || firebaseUser.email || "—"}</p>
            </div>
            <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Events hosted</p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">{events.length}</p>
            </div>
            <div className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/80 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">WhatsApp</p>
              <p className="mt-1 text-sm font-semibold text-zinc-950">{creatorProfile?.contact_whatsapp || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </AccountPageShell>
  );
}
