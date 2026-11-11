import { useState, type MouseEvent, type ReactNode } from "react";
import { type Listing } from "../../types";
import { formatMoney, getListingPricing } from "../../lib/listingPricing";
import CheckoutModal from "../CheckoutModal";
import { auth } from "../../firebase";

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
    <div className="space-y-2 border-b border-bm-border pb-4">
      {eyebrow ? <p className="text-xs font-black uppercase tracking-[0.22em] text-bm-text-muted">{eyebrow}</p> : null}
      <h2 className="font-serif text-3xl font-bold tracking-tight text-bm-text sm:text-4xl">{title}</h2>
      {description ? <p className="max-w-3xl text-sm leading-6 text-bm-text-subtle">{description}</p> : null}
    </div>
  );
}

export function StatTile({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-bm-border pt-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-bm-text-subtle">{label}</p>
        <p className="mt-1 text-base font-extrabold text-bm-text">{value}</p>
      </div>
      {icon ? <div className="shrink-0 text-bm-text-subtle">{icon}</div> : null}
    </div>
  );
}

export function InfoPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-bm-border bg-bm-surface px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-bm-text-muted">
      {children}
    </span>
  );
}

export function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-extrabold transition-colors ${active ? "border-bm-brand text-bm-text" : "border-transparent text-bm-text-subtle hover:text-bm-text"}`}
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
  const pricing = getListingPricing(item);
  const offerLabel =
    pricing.listingMode === "deal" ? "Discount" : pricing.listingMode === "wholesale" ? "Wholesale" : null;
  const offerValue =
    pricing.listingMode === "deal"
      ? `${formatMoney(pricing.price)}${pricing.discountPercent !== null ? ` -${pricing.discountPercent}%` : ""}`
      : pricing.listingMode === "wholesale"
        ? formatMoney(pricing.price)
        : null;

  const firstPhoto = Array.isArray(item.photos) && typeof item.photos[0] === "string" && item.photos[0].trim()
    ? item.photos[0]
    : `https://picsum.photos/seed/${encodeURIComponent(String(item.id))}/600/600`;

  const sellerName =
    typeof item.business_name === "string" && item.business_name.trim()
      ? item.business_name.trim()
      : "View seller profile";

  const isDesktop = variant === "desktop";
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [buyNotice, setBuyNotice] = useState<string | null>(null);

  const handleBuyClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const currentUid = auth.currentUser?.uid;
    if (currentUid && String(currentUid).trim() === String(item.seller_uid).trim()) {
      setBuyNotice("You cannot buy your own listing.");
      return;
    }
    setBuyNotice(null);
    setCheckoutOpen(true);
  };

  return (
    <article
      className={`group overflow-hidden rounded-3xl border border-bm-border bg-bm-surface shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        isDesktop ? "h-full" : ""
      }`}
    >
      <a
        href={`/listing?listing=${encodeURIComponent(String(item.id))}`}
        onClick={(event) => {
          event.preventDefault();
          onOpenDetails(item);
        }}
        className="block w-full text-left"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-bm-surface-muted">
          <img
            src={firstPhoto}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      </a>

      <div className={isDesktop ? "space-y-2 p-4" : "space-y-1.5 p-2.5"}>
        <a
          href={`/listing?listing=${encodeURIComponent(String(item.id))}`}
          onClick={(event) => {
            event.preventDefault();
            onOpenDetails(item);
          }}
          className="block w-full text-left"
        >
          <h3
            className={`line-clamp-1 tracking-tight text-bm-text ${
              isDesktop ? "text-sm font-extrabold" : "text-[12px] font-extrabold"
            }`}
          >
            {item.name}
          </h3>
        </a>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {offerLabel ? (
              <div className="inline-flex flex-col gap-0.5">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-bm-brand">{offerLabel}</span>
                <span className="text-[9px] font-extrabold leading-none text-bm-brand">{offerValue}</span>
              </div>
            ) : (
              <p className={isDesktop ? "text-base font-bold text-bm-brand" : "text-xs font-black text-bm-text"}>
                MK {Number(item.price).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {item.description?.trim() ? (
          <p
            className={`min-h-[1.25rem] text-bm-text-subtle ${isDesktop ? "line-clamp-2 text-[11px] leading-5" : "line-clamp-1 text-[10px] leading-4"}`}
          >
            {item.description.trim()}
          </p>
        ) : (
          <div className="min-h-[1.25rem]" />
        )}

        {item.seller_uid ? (
          <a
            href={`/seller?uid=${encodeURIComponent(String(item.seller_uid))}`}
            onClick={(event) => {
              event.preventDefault();
              onOpenSeller(item.seller_uid!);
            }}
            className={`block w-full text-left font-semibold text-bm-text-subtle transition-colors hover:text-bm-text ${
              isDesktop ? "text-[11px]" : "text-[10px]"
            }`}
          >
            <span className="line-clamp-1">{sellerName}</span>
          </a>
        ) : (
          <span className={`block w-full text-left font-semibold text-bm-text-subtle ${
            isDesktop ? "text-[11px]" : "text-[10px]"
          }`}>
            <span className="line-clamp-1">{sellerName}</span>
          </span>
        )}

        <div className="space-y-1">
          <button
            type="button"
            onClick={handleBuyClick}
            className="inline-flex h-9 w-full items-center justify-center rounded-xl bg-bm-brand px-3 text-xs font-black uppercase tracking-[0.14em] text-bm-on-brand shadow-sm transition-colors hover:bg-bm-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-bm-focus"
          >
            Buy
          </button>
          {buyNotice ? <p className="text-[10px] font-bold text-bm-brand">{buyNotice}</p> : null}
        </div>
      </div>

      <CheckoutModal
        listing={item}
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
      />
    </article>
  );
}
