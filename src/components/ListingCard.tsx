import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import type { Listing } from "../types";
import ListingActionsMenu from "./ListingActionsMenu";

function navigateToListingDetails(listingId: number) {
  window.location.assign(`/listing/${encodeURIComponent(String(listingId))}`);
}

function navigateToSellerProfile(sellerUid: string) {
  window.location.assign(`/seller/${encodeURIComponent(sellerUid)}`);
}
type ListingCardProps = {
  listing: Listing;
  onReport: (id: number) => any;
  currentUid?: string;
  onDelete?: (id: number) => void;
  onEdit?: (listing: Listing) => void;
  onHideSeller?: (uid: string) => void;
  onHideListing?: (listingId: number) => void;
  onToggleStatus?: (listing: Listing) => void;
  isSaved?: boolean;
  onToggleSave?: (listingId: number) => void;
  requireLoginForContact?: () => void;
  isLoggedIn?: boolean;
  compact?: boolean;
  showActionsMenu?: boolean;
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
  showActionsMenu = true,
}: ListingCardProps) {
  const sellerUid = listing.seller_uid;

  const handleOpenProfile = () => {
    if (sellerUid) {
      navigateToSellerProfile(sellerUid);
    }
  };

  const handleOpenDetails = (startIndex = 0) => {
    navigateToListingDetails(listing.id, startIndex);
  };

  const availableQuantity = Math.max(
    0,
    Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0)
  );

  const sellerName = listing.business_name || "Seller";
  const sellerInitials = sellerName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const statusLabel =
    listing.status !== "sold" && availableQuantity > 0
      ? `${availableQuantity} left`
      : "Sold out";

  const description =
    listing.description && listing.description.trim().length > 0
      ? listing.description.trim()
      : "";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -3 }}
      className="group relative"
    >
      <div className="absolute -inset-1.5 rounded-[28px] bg-white/60 blur-xl opacity-0 group-hover:opacity-100 transition pointer-events-none" />

      <div
        className={`relative overflow-hidden rounded-[28px] border border-zinc-200/80 bg-white shadow-[0_10px_30px_rgba(24,24,27,0.06)] transition-all ${
          compact ? "hover:shadow-[0_14px_40px_rgba(24,24,27,0.09)]" : "hover:shadow-[0_16px_46px_rgba(24,24,27,0.12)]"
        }`}
      >
        <div className="px-4 pt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenProfile}
            className="flex min-w-0 items-center gap-3 text-left"
          >
            <div className="relative shrink-0">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-100 text-[10px] font-black text-zinc-600 shadow-sm">
                {listing.business_logo ? (
                  <img
                    src={listing.business_logo}
                    alt={sellerName}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  sellerInitials
                )}
              </div>
              {listing.is_verified ? (
                <div className="absolute -bottom-1.5 -right-1.5 rounded-full bg-white p-0.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 fill-blue-50 text-blue-500" />
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-zinc-800">{sellerName}</p>
              <p className="text-[10px] font-medium text-zinc-400">Open seller page</p>
            </div>
          </button>

          <span className="shrink-0 max-w-[120px] truncate rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold text-zinc-600">
            {listing.university}
          </span>
        </div>

        <div className="relative mt-4 aspect-[1/1] overflow-hidden bg-zinc-100">
          <button
            type="button"
            onClick={() => handleOpenDetails(0)}
            className="h-full w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <img
              src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/600/600`}
              alt={listing.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
          </button>

          {listing.video_url ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="rounded-xl bg-white/90 px-4 py-2 text-sm font-bold text-zinc-900 shadow-sm backdrop-blur-md">
                ▶ Play
              </span>
            </div>
          ) : null}

          {listing.status === "sold" ? (
            <>
              <div className="pointer-events-none absolute inset-0 bg-black/30" />
              <div className="absolute right-4 top-4">
                <span className="rounded-xl bg-red-900 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
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
              onToggleSave={onToggleSave}
              requireLoginForContact={requireLoginForContact}
            />
          ) : null}

          <div className="absolute bottom-4 left-4">
            <div className="rounded-xl border border-white/20 bg-white/92 px-3 py-1.5 text-sm font-extrabold text-zinc-900 shadow-sm backdrop-blur-md">
              MK {listing.price.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center rounded-md bg-primary/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
              {listing.category}
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

          <h3 className="line-clamp-1 text-[17px] font-bold tracking-tight text-zinc-900 group-hover:text-primary">
            {listing.name}
          </h3>

          {!compact && description ? (
            <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-zinc-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
