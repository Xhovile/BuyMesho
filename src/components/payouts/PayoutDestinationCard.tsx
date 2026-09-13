import { useState } from "react";
import { AlertTriangle, Building2, MoreHorizontal, Phone, ShieldCheck, Trash2 } from "lucide-react";
import type { PayoutDestinationType } from "./PayoutDestinationForm";

export type PayoutDestinationCardData = {
  id: string;
  sellerId: string;
  destinationType: PayoutDestinationType;
  providerName: string;
  providerRefId: string | null;
  currency: string;
  accountName: string;
  maskedAccount: string;
  accountDisplay: string;
  isDefault: boolean;
  verificationStatus: string;
  verificationAttempts: number;
  lastError: string | null;
  verifiedAt: string | null;
  replacedFromId: string | null;
  replacedById: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type PayoutDestinationCardProps = {
  destination: PayoutDestinationCardData;
  onReplace?: (destination: PayoutDestinationCardData) => void;
  onRemove?: (destination: PayoutDestinationCardData) => void;
  onMakeDefault?: (destination: PayoutDestinationCardData) => void;
  actionsDisabled?: boolean;
};

export default function PayoutDestinationCard({
  destination,
  onReplace,
  onRemove,
  onMakeDefault,
  actionsDisabled = false,
}: PayoutDestinationCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const canMakeDefault = Boolean(onMakeDefault) && destination.isActive && !destination.isDefault;
  const canReplace = Boolean(onReplace) && destination.isActive;
  const canRemove = Boolean(onRemove) && destination.isActive;
  const verificationStatus = destination.verificationStatus?.toLowerCase() ?? "";
  const needsAttention = Boolean(destination.lastError) || (verificationStatus !== "" && verificationStatus !== "verified");
  const destinationLabel = destination.destinationType === "bank" ? "Bank" : "Mobile Money";
  const accountDisplay = destination.accountDisplay || destination.maskedAccount || "Account unavailable";

  const closeMenu = () => setMenuOpen(false);

  return (
    <article className="relative w-full min-w-0 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">
            {destinationLabel}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black tracking-tight text-zinc-950">{destination.providerName}</h3>
            {destination.isDefault ? (
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-sky-700">
                Default
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-sm font-semibold text-zinc-700">{destination.accountName}</p>
          <p className="mt-2 flex items-center gap-2 text-base font-bold tracking-wide text-zinc-900">
            {destination.destinationType === "bank" ? (
              <Building2 className="h-4 w-4 shrink-0 text-zinc-500" />
            ) : (
              <Phone className="h-4 w-4 shrink-0 text-zinc-500" />
            )}
            <span className="truncate">{accountDisplay}</span>
          </p>

          {needsAttention ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{destination.lastError || `Destination status: ${destination.verificationStatus}`}</span>
            </div>
          ) : null}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="Destination actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
            disabled={actionsDisabled || (!canReplace && !canRemove && !canMakeDefault)}
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_16px_32px_rgba(0,0,0,0.12)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onReplace?.(destination);
                }}
                disabled={actionsDisabled || !canReplace}
                className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onMakeDefault?.(destination);
                }}
                disabled={actionsDisabled || !canMakeDefault}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ShieldCheck className="h-4 w-4" />
                Make default
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onRemove?.(destination);
                }}
                disabled={actionsDisabled || !canRemove}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
