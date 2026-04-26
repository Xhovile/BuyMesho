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
      {eyebrow ? (
        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">{title}</h2>
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

export function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-extrabold transition-colors ${
        active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900"
      }`}
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
  const firstPhoto =
    Array.isArray(item.photos) && typeof item.photos[0] === "string" && item.photos[0].trim()
      ? item.photos[0]
      : `https://picsum.photos/seed/${encodeURIComponent(String(item.id))}/600/600`;

  return (
    <article className="flex gap-4 border-t border-zinc-200 py-4 first:border-t-0 first:pt-0">
      <button type="button" onClick={() => onOpenDetails(item)} className="block shrink-0 text-left">
        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-zinc-100 ring-1 ring-zinc-200 sm:h-24 sm:w-24">
          <img src={firstPhoto} alt={item.name} className="h-full w-full object-cover" />
        </div>
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <button type="button" onClick={() => onOpenDetails(item)} className="block text-left">
          <h3 className="line-clamp-2 text-[15px] font-extrabold tracking-tight text-zinc-900">{item.name}</h3>
        </button>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <p className="font-black text-zinc-900">MK {Number(item.price).toLocaleString()}</p>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-500">{item.university}</span>
        </div>
        <button
          type="button"
          onClick={() => item.seller_uid && onOpenSeller(item.seller_uid)}
          className="text-left text-xs font-semibold text-zinc-500 hover:text-zinc-900"
        >
          {item.business_name}
        </button>
      </div>
    </article>
  );
}
