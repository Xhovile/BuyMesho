import { BarChart3, MessageCircle, Pencil, Share2, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";

import { EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, navigateToPath } from "../../lib/appNavigation";
import type { EventRecord } from "./eventDetailsTypes";

export default function EventDetailsActions({
  event,
  canManageEvent,
  canMessageEvent,
  canBuyOrCart,
  checkoutLoading,
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
  onBuyTicket: () => void;
  onMessage: () => void;
  onAddToCart: () => void;
  onShare: () => void;
  onCancelEvent: () => void;
}) {
  const ownerActionButtonClass = "inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-blue-50";
  const buyerActionButtonClass = "inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition-colors";

  return canManageEvent ? (
    <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-zinc-50 to-white p-4 shadow-sm ring-1 ring-blue-100/60">
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-700/80">Owner view</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-900">Manage this event</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Use these tools to edit details, publish changes, or remove the event from the public directory.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?event=${event.id}`)} className={ownerActionButtonClass}>
            <BarChart3 className="h-4 w-4" />
            Creator dashboard
          </button>
          <button type="button" onClick={() => navigateToPath(`${EVENTS_CREATE_PATH}?edit=${event.id}&skipCreatorCheck=1`)} className={ownerActionButtonClass}>
            <Pencil className="h-4 w-4" />
            Edit event
          </button>
          <button type="button" onClick={onCancelEvent} className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100">
            <Trash2 className="h-4 w-4" />
            Cancel event
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="border-t border-zinc-200 pt-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <button
          type="button"
          onClick={onBuyTicket}
          disabled={!canBuyOrCart || checkoutLoading}
          className={`${buyerActionButtonClass} bg-orange-500 text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <ShoppingBag className="h-4 w-4 shrink-0" />
          <span className="truncate">{checkoutLoading ? "Buying…" : "Buy Ticket"}</span>
        </button>

        <button
          type="button"
          onClick={onMessage}
          disabled={!canMessageEvent}
          className={`${buyerActionButtonClass} bg-sky-500 text-white hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60`}
          title={!canMessageEvent ? "This event is not available for messaging right now." : "Message event owner"}
        >
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="truncate">Message</span>
        </button>

        <button
          type="button"
          onClick={onAddToCart}
          disabled={!canBuyOrCart}
          className={`${buyerActionButtonClass} bg-yellow-500 text-white hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <ShoppingCart className="h-4 w-4 shrink-0" />
          <span className="truncate">Add to Cart</span>
        </button>

        <button
          type="button"
          onClick={onShare}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50"
          aria-label="Share event"
          title="Share event"
        >
          <Share2 className="h-4 w-4 text-zinc-700" />
        </button>
      </div>
    </div>
  );
}
