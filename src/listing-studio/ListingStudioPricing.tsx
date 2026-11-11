import type { Dispatch, SetStateAction } from "react";
import type { ListingDraft, ListingMode } from "../types";

type Props = {
  form: ListingDraft;
  setForm: Dispatch<SetStateAction<ListingDraft>>;
  mode: ListingMode;
  onModeChange: (mode: ListingMode) => void;
  fieldErrors?: Record<string, string>;
  clearError?: (key: string) => void;
};

const MODES: Array<{ value: ListingMode; label: string; description: string }> = [
  { value: "normal", label: "Normal", description: "Standard listing price." },
  { value: "deal", label: "Deal", description: "Show a promotional price against an original price." },
  { value: "wholesale", label: "Wholesale", description: "Sell in packs or bulk quantities." },
];

export default function ListingStudioPricing({
  form,
  setForm,
  mode,
  onModeChange,
  fieldErrors = {},
  clearError,
}: Props) {
  const isDeal = mode === "deal";
  const isWholesale = mode === "wholesale";
  const errorClass = (key: string) => (fieldErrors[key] ? "border-red-500" : "border-bm-border");

  const update = <K extends keyof ListingDraft>(key: K, value: ListingDraft[K]) => {
    clearError?.(String(key));
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section className="space-y-5 rounded-3xl border border-bm-border bg-bm-surface p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-bm-text-subtle">Pricing</p>
        <h2 className="mt-1 text-lg font-black text-zinc-900">Choose how you sell it</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onModeChange(item.value)}
            className={`rounded-2xl border p-4 text-left ${mode === item.value ? "border-bm-brand bg-bm-brand text-bm-on-brand" : "border-bm-border bg-bm-surface text-bm-text-muted hover:bg-bm-surface-subtle"}`}
          >
            <p className="font-extrabold">{item.label}</p>
            <p className={`mt-1 text-xs ${mode === item.value ? "text-bm-on-brand/80" : "text-bm-text-subtle"}`}>{item.description}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Price *</label>
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(event) => update("price", event.target.value)}
            className={`w-full rounded-2xl border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${errorClass("price")}`}
            placeholder="0"
          />
          {fieldErrors.price ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.price}</p> : null}
        </div>

        {isDeal ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Original price *</label>
              <input
                type="number"
                min="0"
                value={form.original_price ?? ""}
                onChange={(event) => update("original_price", event.target.value)}
                className={`w-full rounded-2xl border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${errorClass("original_price")}`}
                placeholder="0"
              />
              {fieldErrors.original_price ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.original_price}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Deal label</label>
              <input
                type="text"
                value={form.deal_label ?? ""}
                onChange={(event) => update("deal_label", event.target.value)}
                className="w-full rounded-2xl border border-bm-border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Weekend offer"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Deal expires at (optional)</label>
              <input
                type="date"
                value={form.deal_expires_at ?? ""}
                onChange={(event) => update("deal_expires_at", event.target.value)}
                className="w-full rounded-2xl border border-bm-border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </>
        ) : null}

        {isWholesale ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Pack size</label>
              <input
                type="number"
                min="1"
                value={form.pack_size ?? ""}
                onChange={(event) => update("pack_size", event.target.value)}
                className={`w-full rounded-2xl border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${errorClass("pack_size")}`}
                placeholder="e.g. 12"
              />
              {fieldErrors.pack_size ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.pack_size}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Bulk units</label>
              <input
                type="text"
                value={form.bulk_units ?? ""}
                onChange={(event) => update("bulk_units", event.target.value)}
                className={`w-full rounded-2xl border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${errorClass("bulk_units")}`}
                placeholder="e.g. carton"
              />
              {fieldErrors.bulk_units ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.bulk_units}</p> : null}
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface-subtle px-4 py-3 text-sm font-bold text-bm-text-muted">
              <input
                type="checkbox"
                checked={form.can_sell_individually ?? false}
                onChange={(event) => update("can_sell_individually", event.target.checked)}
              />
              Can sell individually
            </label>
            {form.can_sell_individually ? (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-bm-text-subtle">Single item price</label>
                <input
                  type="number"
                  min="0"
                  value={form.single_item_price ?? ""}
                  onChange={(event) => update("single_item_price", event.target.value)}
                  className={`w-full rounded-2xl border bg-bm-surface px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 ${errorClass("single_item_price")}`}
                  placeholder="e.g. 1500"
                />
                {fieldErrors.single_item_price ? <p className="mt-1 text-xs font-semibold text-red-600">{fieldErrors.single_item_price}</p> : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
