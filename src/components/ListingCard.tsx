
const ListingCard = ({
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
}: {
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
}) => {
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
    // keep it simple; later we can replace with a nicer toast
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
     // fallback: copy share text
     await navigator.clipboard.writeText(shareText);
     safeAlert("✅ Share text copied. Paste it on WhatsApp or anywhere.");
   } catch {
     // last fallback
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
      {/* Blurred halo (makes edges feel soft where they meet the background) */}
      <div className="absolute -inset-2 rounded-[28px] bg-white/60 blur-xl opacity-70 group-hover:opacity-100 transition pointer-events-none" />

      <div className="relative bg-amber-50/70 rounded-3xl border border-zinc-200/70 overflow-hidden shadow-lg shadow-zinc-400/20 hover:shadow-xl hover:shadow-zinc-500/25 transition-all">
      {/* Seller header (moved ABOVE the post for marketing) */}
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

  {/* Actions menu (owner + non-owner) */}
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
