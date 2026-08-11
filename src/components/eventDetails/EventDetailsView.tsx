import { useEffect, useMemo, useState } from "react";
import { Loader2, Ticket, X } from "lucide-react";

import EventActionsMenu from "./EventActionsMenu";
import EventDetailsActions from "./EventDetailsActions";
import EventDetailsHeader from "./EventDetailsHeader";
import EventDetailsHero from "./EventDetailsHero";
import EventDetailsSections from "./EventDetailsSections";
import {
  BASE_DETAIL_KEYS,
  HIDDEN_SPEC_KEYS,
  formatMoney,
  getPosterAlt,
  getPosterUrl,
  posterAccent,
} from "./eventDetailsUtils";
import type { EventRecord } from "./eventDetailsTypes";
import { apiFetch } from "../../lib/api";
import { EVENTS_PATH, navigateBackOrPath, navigateToLoginWithReturnPath, navigateToPath } from "../../lib/appNavigation";
import { startConversationFromEvent } from "../../lib/messages";
import { navigateToConversation } from "../../lib/messagesNavigation";
import { useAuthUser } from "../../hooks/useAuthUser";
import { upsertEventCartItem } from "../../lib/eventCart";
import FeedbackModal from "../FeedbackModal";
import TicketHolderForm, { type TicketHolderInformation } from "../tickets/TicketHolderForm";

export default function EventDetailsView() {
  const { user: firebaseUser } = useAuthUser();
  const eventId = useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("event");
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, []);

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [ticketHolderOpen, setTicketHolderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cartNoticeOpen, setCartNoticeOpen] = useState(false);
  const [coreOpen, setCoreOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      setError("Missing event id.");
      return;
    }

    let active = true;

    async function loadEvent() {
      try {
        setLoading(true);
        const response = (await apiFetch(`/api/events/${eventId}`)) as { event?: EventRecord };
        if (!active) return;
        setEvent(response?.event ?? null);
        setError(response?.event ? null : "Event not found.");
      } catch (fetchError: any) {
        if (!active) return;
        setError(fetchError?.message || "Could not load event.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvent();
    return () => {
      active = false;
    };
  }, [eventId]);

  const price = formatMoney(event?.ticket_price);
  const posterUrl = event ? getPosterUrl(event) : "";
  const posterAlt = event ? getPosterAlt(event) : "Event poster";
  const accent = posterAccent(event?.event_type || "");
  const eventPageUrl = typeof window !== "undefined" && event ? `${window.location.origin}${EVENTS_PATH}?event=${event.id}` : "";
  const isPublished = event?.status === "published";
  const canManageEvent = !!firebaseUser?.uid && !!event?.creator_uid && event.creator_uid === firebaseUser.uid;
  const canMessageEvent = !!event?.creator_uid && isPublished;
  const canBuyOrCart = !!event && isPublished;
  const shouldShowMenu = !!event && !canManageEvent;

  const clearNotice = () => setNotice(null);

  const handleShare = async () => {
    if (!event || !eventPageUrl) return;
    const shareData = { title: event.event_title, text: `${event.event_title} • ${price}`, url: eventPageUrl };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(eventPageUrl);
        setNotice("Event link copied to clipboard.");
      }
    } catch {
      // Keep silent if sharing is unavailable.
    }
  };

  const handleMessage = async () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }
    if (!canMessageEvent) {
      setNotice(event.creator_uid ? "This event is inactive right now." : "This event does not yet have an owner profile for messaging.");
      return;
    }
    try {
      const conversation = await startConversationFromEvent(event.id);
      navigateToConversation(conversation.id);
    } catch (error: any) {
      setNotice(error?.message || "Failed to start event conversation.");
    }
  };

  const handleBuyTicket = () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }
    if (!canBuyOrCart) {
      setNotice("This event is inactive right now.");
      return;
    }
    setNotice(null);
    setTicketHolderOpen(true);
  };

  const submitTicketHolder = async (ticketHolder: TicketHolderInformation) => {
    if (!event || !firebaseUser?.uid) return;
    try {
      setCheckoutLoading(true);
      const result = (await apiFetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          items: [{ eventId: String(event.id), quantity: 1 }],
          method: "mobile_money",
          ticketHolder,
          returnUrl: `${window.location.origin}/payment/return`,
          cancelUrl: `${window.location.origin}/payment/return?cancelled=1`,
        }),
      })) as { checkoutUrl?: string | null; payment?: { checkoutUrl?: string | null } };

      const checkoutUrl = result.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      throw new Error("Payment gateway did not return a checkout URL.");
    } catch (error: any) {
      setNotice(error?.message || "Failed to start ticket checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!event) return;
    if (!firebaseUser?.uid) {
      navigateToLoginWithReturnPath(eventPageUrl || `${EVENTS_PATH}?event=${event.id}`);
      return;
    }
    if (!canBuyOrCart) {
      setNotice("This event is inactive right now.");
      return;
    }

    upsertEventCartItem(firebaseUser.uid, {
      itemType: "event_ticket",
      eventId: String(event.id),
      eventTitle: event.event_title,
      organizerName: event.organizer_name,
      organizerUid: event.creator_uid,
      eventDate: event.event_date,
      startTime: event.start_time,
      venue: event.venue,
      location: event.location,
      ticketPrice: event.ticket_price,
      ticketLink: event.ticket_link,
      unitPrice: Number(event.ticket_price || 0),
      quantity: 1,
      totalPrice: Number(event.ticket_price || 0),
      addedAt: new Date().toISOString(),
    });

    setNotice("Ticket added to cart.");
    setCartNoticeOpen(true);
  };

  const handleCancelEvent = async () => {
    if (!event || !canManageEvent) return;
    const confirmed = window.confirm("Cancel this event? It will be removed from public event listings.");
    if (!confirmed) return;
    try {
      await apiFetch(`/api/events/${event.id}`, { method: "DELETE" });
      navigateToPath(EVENTS_PATH, { replace: true });
    } catch (error: any) {
      setNotice(error?.message || "Could not cancel event.");
    }
  };

  const extraSpecEntries = useMemo(() => {
    if (!event) return [] as Array<[string, unknown]>;
    return Object.entries(event.spec_values ?? {}).filter(([key]) => !BASE_DETAIL_KEYS.has(key) && !HIDDEN_SPEC_KEYS.has(key));
  }, [event]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-medium text-zinc-600 shadow-lg shadow-zinc-200/50">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-700" />
          Loading event details...
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
        <div className="w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-6 text-center shadow-xl shadow-zinc-200/60 sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-950 text-white"><Ticket className="h-6 w-6" /></div>
          <h1 className="mt-5 text-2xl font-black tracking-[-0.05em] text-zinc-950">Event unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{error || "This event could not be loaded."}</p>
          <button type="button" onClick={() => navigateBackOrPath(EVENTS_PATH)} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800">Back to Events</button>
        </div>
      </div>
    );
  }

  const holderInitialValue = {
    fullName: firebaseUser?.displayName ?? "",
    email: firebaseUser?.email ?? "",
    phone: firebaseUser?.phoneNumber ?? "",
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <EventDetailsHeader isLoggedIn={!!firebaseUser} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:pb-12">
        <div className="grid gap-8">
          {shouldShowMenu ? <section><div className="mb-3 flex justify-start"><EventActionsMenu eventId={event.id} eventTitle={event.event_title} shareUrl={eventPageUrl} /></div></section> : null}
          <EventDetailsHero event={event} posterUrl={posterUrl} posterAlt={posterAlt} accent={accent} price={price} notice={notice} onClearNotice={clearNotice} />
          <EventDetailsSections event={event} coreOpen={coreOpen} extraOpen={extraOpen} onToggleCore={() => setCoreOpen((current) => !current)} onToggleExtra={() => setExtraOpen((current) => !current)} extraSpecEntries={extraSpecEntries} />
          <EventDetailsActions event={event} canManageEvent={canManageEvent} canMessageEvent={canMessageEvent} canBuyOrCart={canBuyOrCart} checkoutLoading={checkoutLoading} onBuyTicket={handleBuyTicket} onMessage={() => void handleMessage()} onAddToCart={() => void handleAddToCart()} onShare={handleShare} onCancelEvent={() => void handleCancelEvent()} />
        </div>
      </main>

      {ticketHolderOpen ? (
        <div className="fixed inset-0 z-[98] flex items-center justify-center p-4">
          <button type="button" aria-label="Close ticket holder form" onClick={() => setTicketHolderOpen(false)} className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button type="button" onClick={() => setTicketHolderOpen(false)} disabled={checkoutLoading} className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Close"><X className="h-5 w-5" /></button>
            <TicketHolderForm initialValue={holderInitialValue} onSubmit={submitTicketHolder} onCancel={() => setTicketHolderOpen(false)} submitting={checkoutLoading} />
          </div>
        </div>
      ) : null}

      <FeedbackModal open={cartNoticeOpen} type="success" title="Added to cart" message="Ticket added to cart." onClose={() => setCartNoticeOpen(false)} />
    </div>
  );
}
