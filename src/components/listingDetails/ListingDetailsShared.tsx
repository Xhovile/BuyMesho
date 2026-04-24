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
    <div className="space-y-2">
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
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
          <p className="mt-1 text-base font-extrabold text-zinc-900">{value}</p>
        </div>
        {icon ? <div className="shrink-0 text-zinc-400">{icon}</div> : null}
      </div>
    </div>
  );
}

export function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600">
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
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <button type="button" onClick={() => onOpenDetails(item)} className="block w-full text-left">
        <div className="aspect-[4/3] bg-zinc-100">
          <img src={firstPhoto} alt={item.name} className="h-full w-full object-cover" />
        </div>
      </button>
      <div className="space-y-3 p-4">
        <button type="button" onClick={() => onOpenDetails(item)} className="block w-full text-left">
          <h3 className="line-clamp-1 text-[15px] font-extrabold tracking-tight text-zinc-900">{item.name}</h3>
        </button>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-zinc-900">MK {Number(item.price).toLocaleString()}</p>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
            {item.university}
          </span>
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
