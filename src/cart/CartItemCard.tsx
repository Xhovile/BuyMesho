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
      className={`group overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${
        isSelected ? "border-zinc-900 ring-1 ring-zinc-900/10" : "border-zinc-200"
      }`}
    >
      <div className="relative aspect-[4/3] bg-zinc-100">
        <input
          type="checkbox"
          checked={isSelected}
          onClick={(event) => event.stopPropagation()}
          onChange={onToggleSelection}
          className="absolute left-3 top-3 z-10 h-5 w-5 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-900"
          aria-label={`Select ${item.listingTitle}`}
        />

        {item.listingImage ? (
          <img src={item.listingImage} alt={item.listingTitle} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-zinc-500">
            <ShoppingCart className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-zinc-950">{item.listingTitle}</p>
            <p className="mt-1 text-sm font-semibold text-zinc-500">{formatMoney(item.unitPrice)} each</p>
          </div>

          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-zinc-400" />
        </div>

        {description ? <p className="line-clamp-1 text-sm text-zinc-500">{description}</p> : null}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500">
            Available {availableQuantity ?? "—"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-500">
            Qty {selectedQuantity || 0}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDecrease();
              }}
              disabled={!isSelected}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-base font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Decrease checkout quantity for ${item.listingTitle}`}
            >
              −
            </button>

            <span className="min-w-8 text-center text-sm font-black text-zinc-900">
              {selectedQuantity || 0}
            </span>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onIncrease();
              }}
              disabled={selectedQuantity >= maxSelectable}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-base font-black text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
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
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
