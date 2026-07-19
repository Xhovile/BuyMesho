import type { MouseEvent as ReactMouseEvent } from "react";
import { formatMoney, getListingPricing } from "../lib/listingPricing";
import {
  getListingAvailabilityLabel,
  getListingCardSpecs,
  getListingConditionLabel,
} from "../lib/listingCardHighlights";
import type { Listing } from "../types";
import ListingActionsMenu from "./ListingActionsMenu";

type ListingCardProps = {
  listing: Listing;
  onReport: (id: number) => any;
  currentUid?: string;
  onDelete?: (id: number) => void | Promise<void>;
  onEdit?: (listing: Listing) => void;
  onHideSeller?: (uid: string) => void;
  onHideListing?: (listingId: number) => void;
  onToggleStatus?: (listing: Listing) => void | Promise<void>;
  onRecordSale?: (listing: Listing, quantity: number) => void | Promise<void>;
  onRestock?: (listing: Listing, quantity: number) => void | Promise<void>;
  isSaved?: boolean;
  onToggleSave?: (listingId: number) => void;
  isLoggedIn?: boolean;
  compact?: boolean;
  ultraCompact?: boolean;
  clickable?: boolean;
  showActionsMenu?: boolean;
  performanceMode?: boolean;
  onOpenDetails: (listing: Listing) => void;
  onOpenSeller: (sellerUid: string) => void;
};

export default function ListingCard({
  listing,
  onReport,
  currentUid,
  onDelete,
  onEdit,
  onHideSeller,
  onHideListing,
  onToggleStatus,
  onRecordSale,
  onRestock,
  isSaved,
  onToggleSave,
  isLoggedIn,
  compact = false,
  ultraCompact = false,
  showActionsMenu = true,
  performanceMode = false,
  onOpenDetails,
  onOpenSeller: _onOpenSeller,
}: ListingCardProps) {
  const pricing = getListingPricing(listing);
  const firstPhoto =
    Array.isArray(listing.photos) && typeof listing.photos[0] === "string" && listing.photos[0].trim()
      ? listing.photos[0]
      : `https://picsum.photos/seed/${encodeURIComponent(String(listing.id ?? "listing"))}/600/600`;

  const titleLabel =
    typeof listing.name === "string" && listing.name.trim() ? listing.name : "Untitled listing";

  const listingMode = pricing.listingMode;
  const offerLabel =
    listingMode === "deal" ? "Discount" : listingMode === "wholesale" ? "Wholesale" : null;
  const offerValue =
    listingMode === "deal"
      ? `${formatMoney(pricing.price)}${pricing.discountPercent !== null ? ` -${pricing.discountPercent}%` : ""}`
      : listingMode === "wholesale"
        ? formatMoney(pricing.price)
        : null;

  const cardSpecs = getListingCardSpecs(listing, ultraCompact ? 2 : 3);
  const conditionLabel = getListingConditionLabel(listing.condition);
  const availabilityLabel = getListingAvailabilityLabel(listing.quantity, listing.sold_quantity);

  const handleOpenDetails = () => {
    onOpenDetails(listing);
  };

  const imageAspect = ultraCompact ? "aspect-square" : compact ? "aspect-[4/3]" : "aspect-[1/1] md:aspect-[4/5]";
  const cardSize = ultraCompact ? "max-h-[245px] max-w-[160px]" : compact ? "max-h-[320px] max-w-[235px]" : "max-h-[420px] max-w-[300px]";

  return (
    <article
      className={`group relative w-full overflow-hidden ${cardSize} cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40`}
      onClick={handleOpenDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleOpenDetails();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Open listing details for ${titleLabel}`}
    >
      <div className="relative overflow-hidden">
        <div className={`relative overflow-hidden rounded-2xl bg-zinc-100 ${imageAspect}`}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails();
            }}
            className="h-full w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <img
              src={firstPhoto}
              alt={titleLabel}
              loading="lazy"
              decoding="async"
              className={`h-full w-full object-cover ${performanceMode ? "" : "transition-transform duration-700 group-hover:scale-105"}`}
              referrerPolicy="no-referrer"
            />
          </button>

          {listing.status === "sold" ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-black/30" />
              <div className="absolute right-3 top-3">
                <span className="rounded-xl bg-red-900 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                  Sold
                </span>
              </div>
            </>
          ) : null}

          {showActionsMenu ? (
            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <ListingActionsMenu
                listing={listing}
                currentUid={currentUid}
                isLoggedIn={isLoggedIn}
                isSaved={isSaved}
                onReport={onReport}
                onDelete={onDelete}
                onEdit={onEdit}
                onHideSeller={onHideSeller}
                onHideListing={onHideListing}
                onToggleStatus={onToggleStatus}
                onRecordSale={onRecordSale}
                onRestock={onRestock}
              />
            </div>
          ) : null}

          <div className="absolute bottom-3 left-3 max-w-[86%]">
            {offerLabel ? (
              <div
                className={`inline-flex flex-col gap-0.5 rounded-xl border border-white/30 bg-black/45 px-2.5 py-1.5 shadow-lg ${
                  performanceMode ? "" : "backdrop-blur-[2px]"
                } ${ultraCompact ? "max-w-[100px]" : compact ? "max-w-[132px]" : "max-w-[165px]"}`}
              >
                <span
                  className={`font-black uppercase tracking-[0.18em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.60)] ${
                    ultraCompact ? "text-[8px]" : compact ? "text-[9px]" : "text-[10px]"
                  }`}
                >
                  {offerLabel}
                </span>
                <span
                  className={`font-extrabold leading-none text-red-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] ${
                    ultraCompact ? "text-[9px]" : compact ? "text-[10px]" : "text-[11px]"
                  }`}
                >
                  {offerValue}
                </span>
              </div>
            ) : (
              <div
                className={`rounded-xl border border-white/25 bg-white/90 font-extrabold shadow-md ${
                  performanceMode ? "" : "backdrop-blur-md"
                } ${ultraCompact ? "px-2 py-1 text-[11px]" : compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} text-zinc-950`}
              >
                <span>{formatMoney(Number(listing.price) || 0)}</span>
              </div>
            )}
          </div>
        </div>

        <div className={ultraCompact ? "py-2" : compact ? "space-y-1.5 py-3" : "space-y-2 py-3"}>
          <h3
            className={
              ultraCompact
                ? "line-clamp-1 text-[12px] font-extrabold tracking-tight text-zinc-900"
                : compact
                  ? "line-clamp-1 text-[14px] font-extrabold tracking-tight text-zinc-900 group-hover:text-primary"
                  : "line-clamp-1 text-[17px] font-bold tracking-tight text-zinc-900 group-hover:text-primary"
            }
          >
            {titleLabel}
          </h3>

          <div className={`flex min-h-[1.6rem] flex-wrap gap-0.5 ${ultraCompact ? "text-[8px]" : compact ? "text-[9px]" : "text-[10px]"}`}>
            {cardSpecs.map((spec) => (
              <span key={spec.key} className="rounded-full bg-zinc-100 px-1.5 py-px font-semibold leading-tight text-zinc-700">
                {spec.label}: {spec.value}
              </span>
            ))}
          </div>

          <div className="min-h-[1.1rem] text-[9px] font-extrabold uppercase tracking-wider text-zinc-600">
            {[conditionLabel, availabilityLabel].filter(Boolean).join(" | ")}
          </div>
        </div>
      </div>
    </article>
  );
}