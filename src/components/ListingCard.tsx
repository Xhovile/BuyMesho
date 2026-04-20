import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { Listing } from "../types";
import ListingActionsMenu from "./ListingActionsMenu";

type ListingCardProps = {
  listing: Listing;
  onReport: (id: number) => any;
  currentUid?: string;
  onDelete?: (id: number) => void;
  onEdit?: (listing: Listing) => void;
  onHideSeller?: (uid: string) => void;
  onHideListing?: (listingId: number) => void;
  onToggleStatus?: (listing: Listing) => void;
  onRecordSale?: (listing: Listing) => void;
  onRestock?: (listing: Listing) => void;
  isSaved?: boolean;
  onToggleSave?: (listingId: number) => void;
  requireLoginForContact?: () => void;
  isLoggedIn?: boolean;
  compact?: boolean;
  ultraCompact?: boolean;
  showActionsMenu?: boolean;
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
  isSaved,
  onToggleSave,
  requireLoginForContact,
  isLoggedIn,
  compact = false,
  ultraCompact = false,
  showActionsMenu = true,
  onOpenDetails,
  onOpenSeller, 
  onRecordSale, 
  onRestock, 
}: ListingCardProps) {
  const sellerUid = typeof listing.seller_uid === "string" ? listing.seller_uid : "";
  const sellerName =
    typeof listing.business_name === "string" && listing.business_name.trim()
      ? listing.business_name.trim()
      : "Seller";

  const handleOpenProfile = () => {
    if (sellerUid) onOpenSeller(sellerUid);
  };

  const handleOpenDetails = () => {
    onOpenDetails(listing);
  };

  const quantity = Number.isFinite(Number(listing.quantity)) ? Number(listing.quantity) : 1;
  const soldQuantity = Number.isFinite(Number(listing.sold_quantity))
    ? Number(listing.sold_quantity)
    : 0;

  const availableQuantity = Math.max(0, quantity - soldQuantity);
  const statusLabel = availableQuantity > 0 ? `${availableQuantity} left` : "Sold out";

  const description =
    typeof listing.description === "string" && listing.description.trim().length > 0
      ? listing.description.trim()
      : "";

  const safePriceValue = Number(listing.price);
  const safePrice = Number.isFinite(safePriceValue) ? safePriceValue : 0;

  const firstPhoto =
    Array.isArray(listing.photos) && typeof listing.photos[0] === "string" && listing.photos[0].trim()
      ? listing.photos[0]
      : `https://picsum.photos/seed/${encodeURIComponent(String(listing.id ?? "listing"))}/600/600`;

  const cardRadius = ultraCompact ? "rounded-[18px]" : "rounded-[28px]";
  const outerPadding = ultraCompact ? "px-2.5 pt-2.5" : "px-4 pt-4";
  const imageAspect = "aspect-[1/1] md:aspect-[4/5]";

  const universityLabel =
    typeof listing.university === "string" && listing.university.trim()
      ? listing.university
      : "Unknown campus";

  const categoryLabel =
    typeof listing.category === "string" && listing.category.trim()
      ? listing.category
      : "Uncategorized";

  const titleLabel =
    typeof listing.name === "string" && listing.name.trim()
      ? listing.name
      : "Untitled listing";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: ultraCompact ? -1 : -3 }}
      className="group relative"
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
                  ultraCompact ? "text-[11px]" : "text-sm"
                } font-bold text-zinc-800`}
              >
                {sellerName}
              </p>
              {listing.is_verified ? (
                <ShieldCheck className="w-3.5 h-3.5 shrink-0 fill-blue-50 text-blue-500" />
              ) : null}
            </div>
            {!ultraCompact ? (
              <p className="text-[10px] font-medium text-zinc-400">Open seller page</p>
            ) : null}
          </button>

          <span
            className={`shrink-0 truncate rounded-full bg-zinc-100 font-semibold text-zinc-600 ${
              ultraCompact
                ? "max-w-[92px] px-2 py-0.5 text-[10px]"
                : "max-w-[120px] px-3 py-1 text-[11px]"
            }`}
          >
            {universityLabel}
          </span>
        </div>

        <div className={`relative mt-3 overflow-hidden bg-zinc-100 ${imageAspect}`}>
          <button
            type="button"
            onClick={handleOpenDetails}
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
              onToggleSave={onToggleSave}
              requireLoginForContact={requireLoginForContact}
            />
          ) : null}

          <div className="absolute bottom-3 left-3">
            <div
              className={`rounded-xl border border-white/20 bg-white/92 font-extrabold text-zinc-900 shadow-sm backdrop-blur-md ${
                ultraCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
              }`}
            >
              MK {safePrice.toLocaleString()}
            </div>
          </div>
        </div>

        <div className={ultraCompact ? "px-2.5 py-2.5" : "space-y-3 px-4 py-4"}>
          <h3
            className={
              ultraCompact
                ? "line-clamp-1 text-[13px] font-extrabold tracking-tight text-zinc-900"
                : "line-clamp-1 text-[17px] font-bold tracking-tight text-zinc-900 group-hover:text-primary"
            }
          >
            {titleLabel}
          </h3>

          {!compact && !ultraCompact && description ? (
            <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}

          {!ultraCompact ? (
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
                {categoryLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  listing.status === "sold"
                    ? "cursor-not-allowed bg-zinc-200 text-zinc-500"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}   
