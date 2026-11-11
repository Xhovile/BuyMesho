import { ChevronRight, ShoppingCart, Trash2 } from "lucide-react";

import { formatMoney } from "../shared/utils/formatMoney";
import type { CartItemViewModel } from "./cartTypes";

type CartItemCardProps = {
  item: CartItemViewModel;
  isSelected: boolean;
  selectedQuantity: number;
  maxSelectable: number;
  onOpen: () => void;
  onToggleSelection: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
};

export function CartItemCard({
  item,
  isSelected,
  selectedQuantity,
  maxSelectable,
  onOpen,
  onToggleSelection,
  onDecrease,
  onIncrease,
  onRemove,
}: CartItemCardProps) {
  const availableQuantity = item.availableQuantity ?? null;
  const description = item.description?.trim();
  const subtitle = item.subtitle?.trim();
  const kindLabel = item.kind === "event_ticket" ? "Event ticket" : "Listing";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`overflow-hidden rounded-2xl border bg-bm-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-bm-focus ${
        isSelected ? "border-bm-brand ring-1 ring-bm-focus" : "border-bm-border dark:border-bm-border"
      }`}
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bm-surface-muted dark:bg-bm-surface-muted sm:h-24 sm:w-24">
          <input
            type="checkbox"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={onToggleSelection}
            className="absolute left-2 top-2 z-10 h-4 w-4 rounded border-bm-border dark:border-bm-border text-bm-text dark:text-bm-text focus:ring-zinc-900"
            aria-label={`Select ${item.title}`}
          />

          {item.image ? (
            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-bm-text-subtle dark:text-bm-text-subtle">
              <ShoppingCart className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-bm-text dark:text-bm-text sm:text-base">{item.title}</p>
              <p className="mt-0.5 text-xs font-semibold text-bm-text-subtle dark:text-bm-text-subtle sm:text-sm">{formatMoney(item.unitPrice)} each</p>
              <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">{kindLabel}</p>
            </div>

            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-bm-text-subtle dark:text-bm-text-subtle" />
          </div>

          {subtitle ? <p className="mt-1 line-clamp-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle sm:text-sm">{subtitle}</p> : null}
          {description ? <p className="mt-1 line-clamp-1 text-xs text-bm-text-subtle dark:text-bm-text-subtle sm:text-sm">{description}</p> : null}

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-bm-border dark:border-bm-border bg-bm-surface-subtle dark:bg-bm-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-bm-text-subtle dark:text-bm-text-subtle">
              Available {availableQuantity ?? "—"}
            </span>
            <span className="rounded-full border border-bm-border dark:border-bm-border bg-bm-surface-subtle dark:bg-bm-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-bm-text-subtle dark:text-bm-text-subtle">
              Qty {selectedQuantity || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-bm-border-subtle dark:border-bm-border-subtle px-3 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDecrease();
            }}
            disabled={!isSelected}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-black text-bm-text-muted dark:text-bm-text-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Decrease checkout quantity for ${item.title}`}
          >
            −
          </button>

          <span className="min-w-7 text-center text-xs font-black text-bm-text dark:text-bm-text sm:text-sm">
            {selectedQuantity || 0}
          </span>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onIncrease();
            }}
            disabled={selectedQuantity >= maxSelectable}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-black text-bm-text-muted dark:text-bm-text-muted disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Increase checkout quantity for ${item.title}`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-bm-border dark:border-bm-border bg-bm-surface px-2.5 py-1 text-[11px] font-bold text-bm-text-muted dark:text-bm-text-muted hover:bg-bm-surface-subtle dark:hover:bg-bm-surface-muted hover:text-bm-text sm:px-3 sm:text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
}
