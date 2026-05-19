import type { MouseEvent as ReactMouseEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { formatMoney, getListingPricing } from "../lib/listingPricing";
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
  onOpenDetails: (listing: Listing) => void;
  onOpenSeller: (sellerUid: string) => void;
};

function formatMWK(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.round(value) : 0;
  return `MWK ${safeValue.toLocaleString()}`;
}

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
  clickable = false,
  showActionsMenu = true,
  onOpenDetails,
  onOpenSeller,
}: ListingCardProps) {
  const pricing = getListingPricing(listing);
  const sellerUid = typeof listing.seller_uid === "string" ? listing.seller_uid : "";
  const sellerName =
    typeof listing.business_name === "string" && listing.business_name.trim()
      ? listing.business_name.trim()
      : "Seller";
  const truncatedSellerName =
    sellerName.length > 7 ? `${sellerName.slice(0, 7)}..` : sellerName;

  const quantity = Number.isFinite(Number(listing.quantity)) ? Number(listing.quantity) : 1;
  const soldQuantity = Number.isFinite(Number(listing.sold_quantity))
    ? Number(listing.sold_quantity)
    : 0;

  const availableQuantity = Math.max(0, quantity - soldQuantity);
  const statusLabel = availableQuantity > 0 ? `${availableQuantity} left` : "Sold out";

  const firstPhoto =
    Array.isArray(listing.photos) && typeof listing.photos[0] === "string" && listing.photos[0].trim()
      ? listing.photos[0]
      : `https://picsum.photos/seed/${encodeURIComponent(String(listing.id ?? "listing"))}/600/600`;

  const titleLabel =
    typeof listing.name === "string" && listing.name.trim()
      ? listing.name
      : "Untitled listing";

  const universityLabel =
    typeof listing.university === "string" && listing.university.trim()
      ? listing.university
      : "Unknown campus";

  const listingMode = pricing.listingMode;
  const offerLabel =
    listingMode === "deal" ? "Discount" : listingMode === "wholesale" ? "Wholesale" : null;

  const offerValue =
    listingMode === "deal"
      ? `${formatMWK(pricing.price)}${pricing.discountPercent !== null ? ` -${pricing.discountPercent}%` : ""}`
      : listingMode === "wholesale"
        ? formatMWK(pricing.price)
        : null;

  const handleOpenProfile = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (sellerUid) onOpenSeller(sellerUid);
  };

  const handleOpenDetails = () => {
    onOpenDetails(listing);
  };

  const cardRadius = ultraCompact ? "rounded-[18px]" : "rounded-[28px]";
  const outerPadding = ultraCompact ? "px-2 pt-2" : "px-4 pt-4";
  const imageAspect = ultraCompact ? "aspect-square" : compact ? "aspect-[4/3]" : "aspect-[1/1] md:aspect-[4/5]";

  return (
    <article
  className={`group relative ${clickable ? "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/40" : ""}`}
  onClick={clickable ? handleOpenDetails : undefined}
  onKeyDown={
    clickable
      ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenDetails();
          }
        }
      : undefined
  }
  tabIndex={clickable ? 0 : undefined}
  role={clickable ? "button" : undefined}
>
      
      <div className="absolute -inset-1.5 rounded-[28px] bg-white/60 blur-xl opacity-0 group-hover:opacity-100 transition pointer-events-none" />

      <div
        className={`relative overflow-hidden ${cardRadius} border border-zinc-200/80 bg-white shadow-[0_10px_30px_rgba(24,24,27,0.06)] transition-all ${
          compact
            ? "hover:shadow-[0_14px_40px_rgba(24,24,27,0.09)]"
            : "hover:shadow-[0_16px_46px_rgba(24,24,27,0.12)]"
        }`}
      >
        <div className={`${outerPadding} flex items-center justify-between gap-2`}>
          <button type="button" onClick={handleOpenProfile} className="min-w-0 text-left">
            <div className="inline-flex items-center gap-1.5 min-w-0">
              <p
                className={`truncate ${
                  ultraCompact ? "text-[10px]" : compact ? "text-[11px]" : "text-sm"
                } font-bold text-red-900`}
              >
                {truncatedSellerName}
              </p>
              {listing.is_verified ? (
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 fill-blue-50 text-blue-500" />
              ) : null}
            </div>
            {!ultraCompact ? <p className="text-[10px] font-medium text-zinc-400">Open seller page</p> : null}
          </button>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`shrink-0 truncate rounded-full bg-zinc-100 font-semibold text-zinc-600 ${
                ultraCompact
                  ? "max-w-[76px] px-2 py-0.5 text-[9px]"
                  : compact
                    ? "max-w-[104px] px-2.5 py-1 text-[10px]"
                    : "max-w-[120px] px-3 py-1 text-[11px]"
              }`}
            >
              {universityLabel}
            </span>
          </div>
        </div>

        <div className={`relative mt-3 overflow-hidden bg-zinc-100 ${imageAspect}`}>
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
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
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
          ) : null}

          <div className="absolute bottom-3 left-3 max-w-[86%]">
            {offerLabel ? (
              <div
                className={`inline-flex flex-col gap-0.5 rounded-xl bg-white/88 px-2 py-1 shadow-sm backdrop-blur-md ${
                  ultraCompact ? "max-w-[92px]" : compact ? "max-w-[120px]" : "max-w-[150px]"
                }`}
              >
                <span
                  className={`font-black uppercase tracking-[0.18em] text-red-600 ${
                    ultraCompact ? "text-[8px]" : compact ? "text-[9px]" : "text-[10px]"
                  }`}
                >
                  {offerLabel}
                </span>
                <span
                  className={`font-extrabold leading-none text-red-700 ${
                    ultraCompact ? "text-[9px]" : compact ? "text-[10px]" : "text-[11px]"
                  }`}
                >
                  {offerValue}
                </span>
              </div>
            ) : (
              <div
                className={`rounded-xl border border-white/20 bg-white/92 font-extrabold shadow-sm backdrop-blur-md ${
                  ultraCompact ? "px-2 py-1 text-xs" : compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
                } text-zinc-900`}
              >
                <span>{formatMoney(Number(listing.price) || 0)}</span>
              </div>
            )}
          </div>
        </div>

        <div className={ultraCompact ? "px-2 py-2" : compact ? "space-y-1.5 px-3 py-3" : "space-y-3 px-4 py-4"}>
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

          {!ultraCompact ? (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                {statusLabel}
              </span>
              <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-zinc-600">
                {listing.category || "Uncategorized"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
