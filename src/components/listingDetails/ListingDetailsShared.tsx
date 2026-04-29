import type { ReactNode } from "react";
import { type Listing } from "../../types";

export function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-2 border-b border-zinc-200 pb-4">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.22em] text-zinc-600">{eyebrow}</p> : null}
      <h2 className="font-serif text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-6 text-zinc-500">{description}</p> : null}
    </div>
  );
}

export function StatTile({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-zinc-200 pt-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
        <p className="mt-1 text-base font-extrabold text-zinc-900">{value}</p>
      </div>
      {icon ? <div className="shrink-0 text-zinc-400">{icon}</div> : null}
    </div>
  );
}

export function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600">
      {children}
    </span>
  );
}

export function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-extrabold transition-colors ${active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"}`}
    >
      {children}
    </button>
  );
}

export function RelatedRailCard({
  item,
  onOpenDetails,
  onOpenSeller,
}: {
  item: Listing;
  onOpenDetails: (listing: Listing) => void;
  onOpenSeller: (sellerUid: string) => void;
}) {
  const firstPhoto = Array.isArray(item.photos) && typeof item.photos[0] === "string" && item.photos[0].trim()
    ? item.photos[0]
    : `https://picsum.photos/seed/${encodeURIComponent(String(item.id))}/600/600`;

  return (
    <article className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <button type="button" onClick={() => onOpenDetails(item)} className="block w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          <img
            src={firstPhoto}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </button>

      <div className="space-y-1.5 p-2.5 sm:p-3">
        <button type="button" onClick={() => onOpenDetails(item)} className="block w-full text-left">
          <h3 className="line-clamp-1 text-[12px] font-extrabold tracking-tight text-zinc-900 sm:text-[13px]">
            {item.name}
          </h3>
        </button>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black text-zinc-900 sm:text-sm">
            MK {Number(item.price).toLocaleString()}
          </p>

          <span className="max-w-[72px] truncate text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-500 sm:max-w-[90px] sm:text-[10px]">
            {item.university}
          </span>
        </div>
      </div>
    </article>
  );
}
