import { useEffect, useState } from "react";
import {
  Bookmark,
  Lock,
  MapPin,
  MessageCircle,
  MoreVertical,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import type { Listing } from "../types";
import { buildListingShareUrl } from "../lib/listingUrl";

type ListingCardProps = {
  listing: Listing;
  onReport: (id: number) => any;
  currentUid?: string;
  onDelete?: (id: number) => void;
  onEdit?: (listing: Listing) => void;
  onHideSeller?: (uid: string) => void;
  onOpenProfile?: (uid: string) => void;
  onOpenDetails?: (listing: Listing, startIndex?: number) => void;
  onToggleStatus?: (listing: Listing) => void;
  isSaved?: boolean;
  onToggleSave?: (listingId: number) => void;
  requireLoginForContact?: () => void;
  isLoggedIn?: boolean;
};

export default function ListingCard({
  listing,
  onReport,
  currentUid,
  onDelete,
  onEdit,
  onOpenProfile,
  onHideSeller,
  onOpenDetails,
  onToggleStatus,
  isSaved,
  onToggleSave,
  requireLoginForContact,
  isLoggedIn,
}: ListingCardProps) {
  const sellerUid = listing.seller_uid;
  const isOwner = !!currentUid && !!sellerUid && sellerUid === currentUid;
  const [menuOpen, setMenuOpen] = useState(false);

  const handleOpenProfile = () => {
    if (sellerUid) onOpenProfile?.(sellerUid);
  };

  const handleOpenDetails = (startIndex = 0) => {
    onOpenDetails?.(listing, startIndex);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest?.(`[data-listing-menu="${listing.id}"]`)) return;
      setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onClick);
    };
  }, [menuOpen, listing.id]);

  const safeAlert = (msg: string) => {
    alert(msg);
  };

  const handleCopyWhatsApp = async () => {
    if (!isLoggedIn) {
      setMenuOpen(false);
      requireLoginForContact?.();
      return;
    }

    const text = listing.whatsapp_number || "";
    if (!text) return safeAlert("No WhatsApp number found.");

    try {
      await navigator.clipboard.writeText(text);
      safeAlert("✅ WhatsApp number copied.");
    } catch {
      prompt("Copy WhatsApp number:", text);
    } finally {
      setMenuOpen(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = buildListingShareUrl(listing.id);
    const shareText = `BuyMesho Listing
${listing.name}
Price: MK ${Number(listing.price).toLocaleString()}
Campus: ${listing.university}
WhatsApp: ${listing.whatsapp_number}

Open this listing: ${shareUrl}`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `BuyMesho: ${listing.name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      safeAlert("✅ Share text copied. Paste it on WhatsApp or anywhere.");
    } catch {
      prompt("Copy to share:", shareText);
    } finally {
      setMenuOpen(false);
    }
  };

  const handleReportFromMenu = () => {
    setMenuOpen(false);
    onReport(listing.id);
  };

  const handleHideSeller = () => {
    if (!sellerUid) return;
    setMenuOpen(false);
    onHideSeller?.(sellerUid);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="relative group"
    >
      <div className="absolute -inset-2 rounded-[28px] bg-white/60 blur-xl opacity-70 group-hover:opacity-100 transition pointer-events-none" />

      <div className="relative bg-amber-50/70 rounded-3xl border border-zinc-200/70 overflow-hidden shadow-lg shadow-zinc-400/20 hover:shadow-xl hover:shadow-zinc-500/25 transition-all">
        <div className="p-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleOpenProfile}
            className="flex items-center gap-2.5 text-left"
          >
            <div className="relative">
              <img
                src={listing.business_logo}
                alt={listing.business_name}
                className="w-9 h-9 rounded-xl object-cover border border-zinc-100 shadow-sm"
              />
              {listing.is_verified && (
                <div className="absolute -right-1.5 -bottom-1.5 bg-white rounded-full p-0.5 shadow-sm">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-50" />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-bold text-zinc-800 hover:underline">
                {listing.business_name}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">View profile</span>
            </div>
          </button>

          <div className="relative" data-listing-menu={listing.id}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl hover:bg-zinc-100 active:scale-95 transition"
              aria-label="Open actions menu"
              aria-expanded={menuOpen}
            >
              <MoreVertical className="w-5 h-5 text-zinc-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 bg-white border border-zinc-200 rounded-xl shadow-md w-48 overflow-hidden z-10">
                {isOwner ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onEdit?.(listing);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleStatus?.(listing);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                    >
                      {listing.status === "sold" ? "Mark as Available" : "Mark as Sold"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete?.(listing.id);
                      }}
                      className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onToggleSave?.(listing.id);
                      }}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                    >
                      {isSaved ? "Remove from Saved" : "Save Item"}
                    </button>
                    <button
                      type="button"
                      onClick={handleReportFromMenu}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                    >
                      Report listing
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyWhatsApp}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                    >
                      Copy WhatsApp number
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                    >
                      Share listing
                    </button>

                    <div className="h-px bg-zinc-100" />

                    <button
                      type="button"
                      onClick={handleHideSeller}
                      className="block w-full text-left px-4 py-2 hover:bg-zinc-50 text-sm font-semibold"
                      disabled={!sellerUid}
                    >
                      Hide this seller
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="relative aspect-[1/1] overflow-hidden bg-zinc-100">
          {listing.video_url ? (
            <button
              type="button"
              onClick={() => handleOpenDetails(0)}
              className="w-full h-full cursor-pointer relative focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <img
                src={listing.photos[0] || `https://picsum.photos/seed/${listing.id}/600/600`}
                alt={listing.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />

              <div
                className="absolute inset-0 flex items-center justify-center bg-black/30"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetails(0);
                }}
              >
                <span className="bg-white/90 backdrop-blur-md text-zinc-900 font-bold px-4 py-2 rounded-xl shadow text-sm flex items-center gap-2">
                  ▶ Play
                </span>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenDetails(0)}
              className="w-full h-full cursor-pointer relative focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              <img
                src={listing.photos[0] || `https://picsum.photos/seed/${listing.id}/600/600`}
                alt={listing.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
            </button>
          )}

          {listing.status === "sold" && (
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
          )}

          {listing.status === "sold" && (
            <div className="absolute top-4 right-4">
              <span className="bg-red-900 text-white px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                Sold
              </span>
            </div>
          )}

          {!isOwner && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave?.(listing.id);
              }}
              className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-2 rounded-xl shadow-sm hover:bg-white transition"
              aria-label={isSaved ? "Remove from saved" : "Save item"}
            >
              <Bookmark
                className={`w-4 h-4 ${isSaved ? "fill-zinc-900 text-zinc-900" : "text-zinc-700"}`}
              />
            </button>
          )}

          {listing.photos?.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDetails(0);
              }}
              className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm"
            >
              +{listing.photos.length - 1}
            </button>
          )}

          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <span className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-zinc-800 flex items-center gap-1.5 shadow-sm">
              <MapPin className="w-3 h-3 text-primary" /> {listing.university}
            </span>
          </div>

          <div className="absolute bottom-4 left-4">
            <div className="bg-white/90 backdrop-blur-md text-zinc-900 px-3 py-1.5 rounded-xl font-bold text-sm shadow-sm border border-white/20">
              MK {listing.price.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {listing.category}
            </span>

            {listing.status === "sold" ? (
              <span className="flex items-center gap-1.5 bg-zinc-200 text-zinc-500 px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider cursor-not-allowed">
                Sold Out
              </span>
            ) : isLoggedIn ? (
              <a
                href={`https://wa.me/${listing.whatsapp_number}?text=Hi, I'm interested in your ${listing.name} on BuyMesho.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all hover:shadow-lg hover:shadow-[#25D366]/20 active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Contact
              </a>
            ) : (
              <button
                type="button"
                onClick={requireLoginForContact}
                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all active:scale-95"
              >
                <Lock className="w-3.5 h-3.5" />
                Log in to Contact
              </button>
            )}
          </div>

          <h3 className="text-lg font-bold text-zinc-900 mb-1 line-clamp-1 group-hover:text-primary transition-colors">
            {listing.name}
          </h3>
          <p className="text-sm text-zinc-500 line-clamp-2 mb-5 h-10 leading-relaxed">
            {listing.description}
          </p>
        </div>
      </div>
    </motion.div>
  );
  }
