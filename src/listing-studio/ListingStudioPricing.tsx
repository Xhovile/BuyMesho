import type { Dispatch, SetStateAction } from "react";
import type { ListingDraft, ListingMode } from "../types";

type Props = {
  form: ListingDraft;
  setForm: Dispatch<SetStateAction<ListingDraft>>;
  mode: ListingMode;
  onModeChange: (mode: ListingMode) => void;
};

const MODES: Array<{ value: ListingMode; label: string; description: string }> = [
  { value: "normal", label: "Normal", description: "Standard listing price." },
  { value: "deal", label: "Deal", description: "Show a promotional price against an original price." },
  { value: "wholesale", label: "Wholesale", description: "Sell in packs or bulk quantities." },
];

export default function ListingStudioPricing({ form, setForm, mode, onModeChange }: Props) {
  const isDeal = mode === "deal";
  const isWholesale = mode === "wholesale";

  return (
    <section className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Pricing</p>
        <h2 className="mt-1 text-lg font-black text-zinc-900">Choose how you sell it</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onModeChange(item.value)}
            className={`rounded-2xl border p-4 text-left ${mode === item.value ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"}`}
          >
            <p className="font-extrabold">{item.label}</p>
            <p className={`mt-1 text-xs ${mode === item.value ? "text-zinc-300" : "text-zinc-500"}`}>{item.description}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Price *</label>
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="0"
          />
        </div>

        {isDeal ? (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Original price *</label>
            <input
              type="number"
              min="0"
              value={form.original_price ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, original_price: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="0"
            />
          </div>
        ) : null}

        {isDeal ? (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Deal label</label>
            <input
              type="text"
              value={form.deal_label ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, deal_label: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Weekend offer"
            />
          </div>
        ) : null}

        {isDeal ? (
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Deal expires</label>
            <input
              type="datetime-local"
              value={form.deal_expires_at ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, deal_expires_at: event.target.value }))}
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : null}

        {isWholesale ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Pack size</label>
              <input
                type="number"
                min="1"
                value={form.pack_size ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, pack_size: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Bulk units</label>
              <input
                type="text"
                value={form.bulk_units ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, bulk_units: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. carton"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-zinc-400">Single-item price</label>
              <input
                type="number"
                min="0"
                value={form.single_item_price ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, single_item_price: event.target.value }))}
                className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Optional"
              />
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={form.can_sell_individually ?? false}
                onChange={(event) => setForm((prev) => ({ ...prev, can_sell_individually: event.target.checked }))}
              />
              Can sell individually
            </label>
          </>
        ) : null}
      </div>
    </section>
  );
}
