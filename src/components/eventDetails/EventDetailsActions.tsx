import { BarChart3, Pencil, Share2, ShoppingBag, Trash2 } from "lucide-react";

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
  const buyerActionButtonClass = "inline-flex min-w-0 w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-extrabold transition-colors";

  return canManageEvent ? (
    <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50/80 via-zinc-50 to-white p-4 shadow-sm ring-1 ring-blue-100/60">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-blue-700/80">Owner view</p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-zinc-900">Manage this event</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              Use these tools to edit details, publish changes, or remove the event from the public directory.
            </p>
          </div>

          <button
            type="button"
            onClick={onShare}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-white shadow-sm transition-colors hover:bg-blue-50"
            aria-label="Share event"
            title="Share event"
          >
            <Share2 className="h-4 w-4 text-blue-700" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigateToPath(`${EVENTS_MANAGE_PATH}?event=${event.id}`)} className={ownerActionButtonClass}>
            <BarChart3 className="h-4 w-4" />
            Open Event Manager
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
    <div className="border-t border-zinc-200 pt-4 pb-16">
      <div className="grid grid-cols-3 gap-2">
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
          className="flex h-12 w-full min-w-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white p-0 shadow-sm transition-all hover:bg-zinc-50 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Message event owner"
          title={!canMessageEvent ? "This event is not available for messaging right now." : "Message event owner"}
        >
          <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden="true" className="h-12 w-24">
            <path d="M232 250 H360 C379 250 394 265 394 284 V351 C394 370 379 385 360 385 H351 V414 C351 424 343 429 335 421 L298 385 H232 C213 385 198 370 198 351 V284 C198 265 213 250 232 250 Z" fill="#198FC7" />
            <circle cx="245" cy="316" r="12" fill="#FFFFFF" />
            <circle cx="284" cy="316" r="12" fill="#FFFFFF" />
            <circle cx="323" cy="316" r="12" fill="#FFFFFF" />
            <path d="M149 264 C126 264 108 245 108 222 V108 C108 85 126 67 149 67 H321 C344 67 362 85 362 108 V222 C362 245 344 264 321 264 H229 L180 309 C170 318 162 313 162 300 V264 H149 Z" fill="#3E5569" />
            <circle cx="170" cy="150" r="17" fill="#FFFFFF" />
            <circle cx="225" cy="150" r="17" fill="#FFFFFF" />
            <circle cx="280" cy="150" r="17" fill="#FFFFFF" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onShare}
          className="flex h-12 w-full min-w-0 items-center justify-center rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50"
          aria-label="Share event"
          title="Share event"
        >
          <Share2 className="h-4 w-4 text-zinc-700" />
        </button>
      </div>
    </div>
  );
}
