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
  variant = "mobile",
}: {
  item: Listing;
  onOpenDetails: (listing: Listing) => void;
  onOpenSeller: (sellerUid: string) => void;
  variant?: "mobile" | "desktop";
}) {
  const firstPhoto = Array.isArray(item.photos) && typeof item.photos[0] === "string" && item.photos[0].trim()
    ? item.photos[0]
    : `https://picsum.photos/seed/${encodeURIComponent(String(item.id))}/600/600`;

  const sellerName =
    typeof item.business_name === "string" && item.business_name.trim()
      ? item.business_name.trim()
      : "View seller profile";

  const isDesktop = variant === "desktop";

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        isDesktop ? "h-full" : ""
      }`}
    >
      <button type="button" onClick={() => onOpenDetails(item)} className="block w-full text-left">
        <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
          <img
            src={firstPhoto}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </button>

      <div className={isDesktop ? "space-y-2 p-4" : "space-y-1.5 p-2.5"}>
        <button type="button" onClick={() => onOpenDetails(item)} className="block w-full text-left">
          <h3
            className={`line-clamp-1 tracking-tight text-zinc-900 ${
              isDesktop ? "text-sm font-extrabold" : "text-[12px] font-extrabold"
            }`}
          >
            {item.name}
          </h3>
        </button>

        {isDesktop ? (
          <p className="text-sm leading-relaxed text-zinc-500 line-clamp-2">
            {item.description || "Tap to open the full listing details."}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <p className={isDesktop ? "text-base font-bold text-red-900" : "text-xs font-black text-zinc-900"}>
            MK {Number(item.price).toLocaleString()}
          </p>

          <span
            className={`truncate font-bold uppercase tracking-[0.12em] text-zinc-500 ${
              isDesktop ? "max-w-[100px] text-[10px]" : "max-w-[72px] text-[9px]"
            }`}
          >
            {item.university}
          </span>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (item.seller_uid) onOpenSeller(item.seller_uid);
          }}
          className={`block w-full text-left font-semibold text-zinc-500 transition-colors hover:text-zinc-900 ${
            isDesktop ? "text-[11px]" : "text-[10px]"
          }`}
        >
          <span className="line-clamp-1">{sellerName}</span>
        </button>

        {isDesktop ? (
          <button
            type="button"
            onClick={() => onOpenDetails(item)}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-900"
          >
            Open listing
          </button>
        ) : null}
      </div>
    </article>
  );
}
