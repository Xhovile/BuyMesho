import { ChevronRight, ShoppingCart, Trash2 } from "lucide-react";

import { formatMoney } from "../shared/utils/formatMoney";
import type { BuyerCartItem } from "../lib/buyerState";

type CartItemCardProps = {
  item: BuyerCartItem;
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
  const description = item.listingDescription?.trim();

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
      className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
        isSelected ? "border-zinc-900 ring-1 ring-zinc-900/10" : "border-zinc-200"
      }`}
    >
      <div className="relative h-28 bg-zinc-100 sm:h-32">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(event) => event.stopPropagation()}
          onChange={onToggleSelection}
          className="absolute left-2 top-2 z-10 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
          aria-label={`Select ${item.listingTitle}`}
        />

        {item.listingImage ? (
          <img src={item.listingImage} alt={item.listingTitle} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            <ShoppingCart className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="space-y-2.5 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-950 sm:text-base">{item.listingTitle}</p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-500 sm:text-sm">
              {formatMoney(item.unitPrice)} each
            </p>
          </div>

          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        </div>

        {description ? <p className="line-clamp-1 text-xs text-zinc-500 sm:text-sm">{description}</p> : null}

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
            Available {availableQuantity ?? "—"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-500">
            Qty {selectedQuantity || 0}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDecrease();
              }}
              disabled={!isSelected}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Decrease checkout quantity for ${item.listingTitle}`}
            >
              −
            </button>

            <span className="min-w-7 text-center text-xs font-black text-zinc-900 sm:text-sm">
              {selectedQuantity || 0}
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onIncrease();
              }}
              disabled={selectedQuantity >= maxSelectable}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Increase checkout quantity for ${item.listingTitle}`}
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
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 sm:px-3 sm:text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
