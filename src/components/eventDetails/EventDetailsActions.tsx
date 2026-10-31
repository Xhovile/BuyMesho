import { Check, LoaderCircle, MessageCircle, Share2, BarChart3, Pencil, Trash2 } from "lucide-react";

import { EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, navigateToPath } from "../../lib/appNavigation";
import type { EventRecord } from "./eventDetailsTypes";
import BuyBasketIcon from "../BuyBasketIcon";

export default function EventDetailsActions({
  event,
  canManageEvent,
  canMessageEvent,
  canBuyOrCart,
  checkoutLoading,
  ticketHolderOpen,
  isMessagingEvent,
  isSharingEvent,
  shareCompleted,
  onBuyTicket,
  onMessage,
  onAddToCart,
  onShare,
  onCancelEvent,
}: {
  event: EventRecord;
  canManageEvent: boolean;
  canMessageEvent: boolean;
  canBuyOrCart: boolean;
  checkoutLoading: boolean;
  ticketHolderOpen: boolean;
  isMessagingEvent: boolean;
  isSharingEvent: boolean;
  shareCompleted: boolean;
  onBuyTicket: () => void;
  onMessage: () => void;
  onAddToCart: () => void;
  onShare: () => void;
  onCancelEvent: () => void;
}) {
  const ownerActionButtonClass = "inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-blue-50";
  const buyerActionButtonClass = "inline-flex min-w-0 w-full items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-extrabold transition-all duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 motion-reduce:transition-none sm:gap-2 sm:px-3 sm:text-sm";

  return canManageEvent ? (
    <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-zinc-50 to-white p-4 shadow-sm ring-1 ring-blue-100/60">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-700/80">Owner view</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-900">Manage this event</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">Use these tools to edit details, publish changes, or remove the event from the public directory.</p>
          </div>
          <button type="button" onClick={onShare} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-sm transition-colors hover:bg-blue-50" aria-label="Share event" title="Share event">
            <Share2 className="h-4 w-4 text-blue-700" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?event=${event.id}`)} className={ownerActionButtonClass}><BarChart3 className="h-4 w-4" />Open Event Manager</button>
          <button type="button" onClick={() => navigateToPath(`${EVENTS_CREATE_PATH}?edit=${event.id}&skipCreatorCheck=1`)} className={ownerActionButtonClass}><Pencil className="h-4 w-4" />Edit event</button>
          <button type="button" onClick={onCancelEvent} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100"><Trash2 className="h-4 w-4" />Cancel event</button>
        </div>
      </div>
    </div>
  ) : (
    <div className="border-t border-zinc-200 pt-4 pb-24">
      <div className="grid grid-cols-3 items-center gap-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-3">
        <button
          type="button"
          onClick={onBuyTicket}
          disabled={!canBuyOrCart || checkoutLoading}
          aria-haspopup="dialog"
          aria-expanded={ticketHolderOpen}
          className={`${buyerActionButtonClass} bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5`}
        >
          {checkoutLoading ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" /> : ticketHolderOpen ? <Check className="h-4 w-4 shrink-0" /> : <BuyBasketIcon className="hidden h-6 w-6 shrink-0 text-[#8F171D] lg:block" />}
          <span className="truncate">{checkoutLoading ? "Processing…" : ticketHolderOpen ? "Details ready" : "Buy Ticket"}</span>
        </button>

        <button
          type="button"
          onClick={onMessage}
          disabled={!canMessageEvent || isMessagingEvent}
          aria-busy={isMessagingEvent}
          className={`${buyerActionButtonClass} border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:ring-sky-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-4`}
          aria-label={isMessagingEvent ? "Opening chat" : "Message event owner"}
          title={!canMessageEvent ? "This event is not available for messaging right now." : "Message event owner"}
        >
          {isMessagingEvent ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-sky-700" /> : <MessageCircle className="h-4 w-4 shrink-0 text-sky-700" />}
          <span className="truncate">{isMessagingEvent ? "Opening…" : "Message"}</span>
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={isSharingEvent}
          aria-busy={isSharingEvent}
          aria-label={isSharingEvent ? "Sharing event" : "Share event"}
          className={`${buyerActionButtonClass} border border-zinc-200 bg-white text-zinc-800 shadow-sm hover:bg-zinc-50 focus-visible:ring-violet-600 disabled:cursor-wait disabled:opacity-80 sm:w-auto sm:px-4 `}
        >
          {isSharingEvent ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-violet-700" /> : shareCompleted ? <Check className="h-4 w-4 shrink-0 text-emerald-600" /> : <Share2 className="h-4 w-4 shrink-0 text-zinc-700" />}
          <span className="truncate">{isSharingEvent ? "Sharing…" : shareCompleted ? "Shared" : "Share"}</span>
        </button>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {isMessagingEvent ? "Opening a conversation with the event organizer." : isSharingEvent ? "Sharing event." : shareCompleted ? "Event shared successfully." : ticketHolderOpen ? "Ticket holder form opened." : ""}
      </p>
    </div>
  );
}
