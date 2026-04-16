import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, MoreVertical, ShieldCheck, Share2 } from "lucide-react";
import type { Listing } from "../types";
import { buildListingShareUrl } from "../lib/listingUrl";

type ListingActionsMenuProps = {
  listing: Listing;
  currentUid?: string;
  isLoggedIn?: boolean;
  isSaved?: boolean;
  variant?: "card" | "detail";
  onReport: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (listing: Listing) => void;
  onHideSeller?: (uid: string) => void;
  onHideListing?: (listingId: number) => void;
  onToggleStatus?: (listing: Listing) => void;
  onToggleSave?: (listingId: number) => void;
  requireLoginForContact?: () => void;
};

export default function ListingActionsMenu({
  listing,
  currentUid,
  isLoggedIn,
  isSaved,
  variant = "card",
  onReport,
  onDelete,
  onEdit,
  onHideSeller,
  onHideListing,
  onToggleStatus,
  onToggleSave,
  requireLoginForContact,
}: ListingActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const sellerUid = listing.seller_uid;
  const isOwner = !!currentUid && !!sellerUid && currentUid === sellerUid;

  const wrapperClassName =
    variant === "detail"
      ? "fixed top-20 right-4 z-[95]"
      : "absolute right-3 top-3 z-20";

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (wrapperRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  const safeAlert = (msg: string) => {
    alert(msg);
  };

  const trackWhatsAppClick = async () => {
    try {
      await fetch(`/api/listings/${listing.id}/whatsapp-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to track WhatsApp click", error);
    }
  };

  const handleCopyWhatsApp = async () => {
    if (!isLoggedIn) {
      setOpen(false);
      requireLoginForContact?.();
      return;
    }

    const number = listing.whatsapp_number || "";
    if (!number) {
      safeAlert("No WhatsApp number found.");
      return;
    }

    try {
      await navigator.clipboard.writeText(number);
      safeAlert("WhatsApp number copied.");
    } catch {
      prompt("Copy WhatsApp number:", number);
    } finally {
      setOpen(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = buildListingShareUrl(listing.id, 0);
    const shareText = `BuyMesho Listing\n${listing.name}\nPrice: MK ${Number(listing.price).toLocaleString()}\nCampus: ${listing.university}\nWhatsApp: ${listing.whatsapp_number}\n\nOpen this listing: ${shareUrl}`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `BuyMesho: ${listing.name}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        safeAlert("Share text copied.");
      }
    } catch {
      prompt("Copy to share:", shareText);
    } finally {
      setOpen(false);
    }
  };

  const handleSaveToggle = () => {
    if (!isLoggedIn) {
      setOpen(false);
      requireLoginForContact?.();
      return;
    }

    onToggleSave?.(listing.id);
    setOpen(false);
  };

  const menuLabel = useMemo(() => (isOwner ? "Listing actions" : "More options"), [isOwner]);

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="h-10 w-10 rounded-full border border-zinc-200 bg-white/95 backdrop-blur-md text-zinc-700 shadow-sm hover:bg-white flex items-center justify-center transition-all"
        aria-label={menuLabel}
        aria-expanded={open}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {open ? (
        <div
          className={`absolute ${variant === "detail" ? "right-0 top-12 w-72" : "right-0 top-12 w-56"} overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl`}
        >
          <div className="border-b border-zinc-100 px-4 py-3 text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">
            {isOwner ? "Owner tools" : "Actions"}
          </div>

          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onEdit?.(listing);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Edit listing
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onToggleStatus?.(listing);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                {listing.status === "sold" ? "Mark as available" : "Mark as sold"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onDelete?.(listing.id);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete listing
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSaveToggle}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                  {isSaved ? "Remove from saved" : "Save item"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onReport(listing.id);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Report listing
              </button>
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Copy WhatsApp number
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share listing
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onHideListing?.(listing.id);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Hide this listing
              </button>
              <div className="h-px bg-zinc-100" />
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (sellerUid) onHideSeller?.(sellerUid);
                }}
                className="block w-full px-4 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
                disabled={!sellerUid}
              >
                Hide this seller
              </button>
            </>
          )}

          {variant === "detail" && !isOwner ? (
            <div className="border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
              Use this menu for quick account actions.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
