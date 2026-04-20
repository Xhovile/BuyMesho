import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Lock,
  Maximize2,
  MessageCircle,
  Minimize2,
  ShieldCheck,
  Store,
} from "lucide-react";
import type { Listing, RatingSummary } from "./types";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  REPORT_PATH,
  navigateToListingDetails,
  navigateToPath,
  navigateToSellerProfile,
  navigateBackOrPath,
  navigateToEditListing,
} from "./lib/appNavigation";
import {
  buildListingShareUrl,
  getListingParamsFromUrl,
  syncListingParamsInUrl,
} from "./lib/listingUrl";
import { getListingItemConfig } from "./listingSchemas";
import { useAuthUser } from "./hooks/useAuthUser";
import { fetchListingById } from "./lib/listings";
import {
  isListingSaved,
  subscribeToSavedListingChanges,
  toggleSavedListingId,
} from "./lib/savedListings";
import ListingActionsMenu from "./components/ListingActionsMenu";

type SellerProfile = {
  uid?: string;
  business_name?: string;
  business_logo?: string;
  university?: string;
  bio?: string;
  is_verified?: boolean;
  join_date?: string;
  whatsapp_number?: string;
  profile_views?: number;
};

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatSpecValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function FullscreenToggleIcon({ isFullscreen }: { isFullscreen: boolean }) {
  return (
    <span className="relative h-5 w-5">
      <Maximize2
        className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
          isFullscreen ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        }`}
      />
      <Minimize2
        className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
          isFullscreen ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        }`}
      />
    </span>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/70 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-zinc-900">{value}</p>
    </div>
  );
}

export default function ListingDetailsPage() {
  const { user: firebaseUser } = useAuthUser();
  const [routeState, setRouteState] = useState(() => getListingParamsFromUrl());
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSpecGroupTitle, setActiveSpecGroupTitle] = useState<string>("");
  const [showSpecTabsLeftHint, setShowSpecTabsLeftHint] = useState(false);
  const [showSpecTabsRightHint, setShowSpecTabsRightHint] = useState(false);
  const specTabsRef = useRef<HTMLDivElement | null>(null);

  const listingId = routeState.listing || "";

  useEffect(() => {
    const syncRouteState = () => setRouteState(getListingParamsFromUrl());
    window.addEventListener("popstate", syncRouteState);
    return () => window.removeEventListener("popstate", syncRouteState);
  }, []);

  useEffect(() => {
    const syncSavedState = () => {
      if (!listingId) {
        setSaved(false);
        return;
      }
      setSaved(isListingSaved(listingId, firebaseUser?.uid));
    };

    syncSavedState();
    return subscribeToSavedListingChanges(syncSavedState);
  }, [listingId, firebaseUser?.uid]);

  useEffect(() => {
    const loadListing = async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await fetchListingById(listingId);
        setListing(found);

        if (!found) {
          setSeller(null);
          setRatingSummary(null);
          setRelatedListings([]);
          return;
        }

        try {
          await fetch(`/api/listings/${found.id}/view`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Failed to track listing view", error);
        }

        const [sellerResult, ratingResult, relatedResult] = await Promise.allSettled([
          apiFetch(`/api/users/${found.seller_uid}`),
          apiFetch(`/api/users/${found.seller_uid}/rating-summary`),
          apiFetch(`/api/listings/${found.id}/related?limit=20`),
        ]);

        setSeller(sellerResult.status === "fulfilled" ? sellerResult.value : null);
        setRatingSummary(ratingResult.status === "fulfilled" ? ratingResult.value : null);
        setRelatedListings(
          relatedResult.status === "fulfilled" && Array.isArray(relatedResult.value)
            ? relatedResult.value
            : []
        );
      } catch (error) {
        console.error("Failed to load listing details page", error);
        setListing(null);
        setSeller(null);
        setRatingSummary(null);
        setRelatedListings([]);
      } finally {
        setLoading(false);
      }
    };

    void loadListing();
  }, [listingId]);

  const galleryImages = useMemo(() => {
    if (!listing) return [];
    return Array.isArray(listing.photos) && listing.photos.length > 0
      ? listing.photos
      : [`https://picsum.photos/seed/${listing.id}/900/900`];
  }, [listing]);

  const currentGalleryIndex = Math.min(
    Math.max(routeState.imageIndex || 0, 0),
    Math.max(galleryImages.length - 1, 0)
  );

  useEffect(() => {
    if (!listing || galleryImages.length === 0) return;
    if (currentGalleryIndex !== (routeState.imageIndex || 0)) {
      syncListingParamsInUrl(listing.id, currentGalleryIndex);
    }
  }, [listing, galleryImages.length, currentGalleryIndex, routeState.imageIndex]);

  const itemConfig = useMemo(() => {
    if (!listing?.category || !listing.subcategory || !listing.item_type) return null;
    return getListingItemConfig(listing.category, listing.subcategory, listing.item_type);
  }, [listing]);

  const groupedSpecs = useMemo(() => {
    if (!listing?.spec_values || !itemConfig) return [];

    return itemConfig.fieldGroups
      .map((group) => {
        const rows = group.keys
          .map((key) => {
            const field = itemConfig.schema.fields.find((f) => f.key === key);
            if (!field) return null;
            const rawValue = listing.spec_values?.[key];
            if (
              rawValue === null ||
              rawValue === undefined ||
              rawValue === "" ||
              (Array.isArray(rawValue) && rawValue.length === 0)
            ) {
              return null;
            }
            return { key, label: field.label, value: formatSpecValue(rawValue) };
          })
          .filter(Boolean);

        if (!rows.length) return null;
        return {
          title: group.title,
          rows: rows as Array<{ key: string; label: string; value: string }>,
        };
      })
      .filter(Boolean) as Array<{
      title: string;
      rows: Array<{ key: string; label: string; value: string }>;
    }>;
  }, [listing, itemConfig]);

  const availableQuantity = listing
    ? Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
    : 0;

  const currentImage = galleryImages[currentGalleryIndex] || galleryImages[0] || "";
  const visibleRelatedListings = relatedListings.slice(0, 10);

  useEffect(() => {
    if (!groupedSpecs.length) {
      setActiveSpecGroupTitle("");
      return;
    }

    if (!groupedSpecs.some((group) => group.title === activeSpecGroupTitle)) {
      setActiveSpecGroupTitle(groupedSpecs[0].title);
    }
  }, [groupedSpecs, activeSpecGroupTitle]);

  useEffect(() => {
    const container = specTabsRef.current;
    if (!container) {
      setShowSpecTabsLeftHint(false);
      setShowSpecTabsRightHint(false);
      return;
    }

    const checkOverflow = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth + 2;
      const canScrollLeft = container.scrollLeft > 2;
      const canScrollRight = container.scrollLeft + container.clientWidth < container.scrollWidth - 2;
      setShowSpecTabsLeftHint(hasOverflow && canScrollLeft);
      setShowSpecTabsRightHint(hasOverflow && canScrollRight);
    };

    checkOverflow();
    container.addEventListener("scroll", checkOverflow);
    window.addEventListener("resize", checkOverflow);
    return () => {
      container.removeEventListener("scroll", checkOverflow);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [groupedSpecs]);

  const activeSpecGroup = useMemo(
    () => groupedSpecs.find((group) => group.title === activeSpecGroupTitle) || groupedSpecs[0] || null,
    [groupedSpecs, activeSpecGroupTitle]
  );

  const handleShare = async () => {
    if (!listing) return;
    const shareUrl = buildListingShareUrl(listing.id, currentGalleryIndex);
    const shareText = `BuyMesho Listing\n${listing.name}\nPrice: MK ${Number(listing.price).toLocaleString()}\nCampus: ${listing.university}`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `BuyMesho: ${listing.name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n\nOpen this listing: ${shareUrl}`);
      alert("Share text copied.");
    } catch {
      prompt("Copy to share:", `${shareText}\n\nOpen this listing: ${shareUrl}`);
    }
  };

  const handleToggleSaved = () => {
    if (!listing) return;
    const nextSaved = toggleSavedListingId(listing.id, firebaseUser?.uid);
    setSaved(nextSaved);
  };

  const handleDetailEdit = () => {
    if (!listing) return;
    navigateToEditListing(listing.id);
  };

  const handleDetailDelete = async (listingIdToDelete: number) => {
    const ok = window.confirm("Delete this listing?");
    if (!ok) return;

    try {
      await apiFetch(`/api/listings/${listingIdToDelete}`, { method: "DELETE" });
      navigateBackOrPath(EXPLORE_PATH);
    } catch (error: any) {
      alert(error?.message || "Failed to delete listing.");
    }
  };

  const handleDetailToggleStatus = async (item: Listing) => {
    const nextStatus = item.status === "sold" ? "available" : "sold";

    try {
      await apiFetch(`/api/listings/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setListing((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (error: any) {
      alert(error?.message || "Failed to update listing status.");
    }
  };

  const handleDetailHideListing = (listingIdToHide: number) => {
    try {
      const raw = localStorage.getItem("hiddenListingIds");
      const parsed = raw ? JSON.parse(raw) : [];
      const current = Array.isArray(parsed) ? parsed.filter((x) => Number.isInteger(x)) : [];
      if (!current.includes(listingIdToHide)) {
        localStorage.setItem("hiddenListingIds", JSON.stringify([...current, listingIdToHide]));
      }
    } catch {
      localStorage.setItem("hiddenListingIds", JSON.stringify([listingIdToHide]));
    }
    navigateBackOrPath(EXPLORE_PATH);
  };

  const handleDetailHideSeller = (sellerUid?: string) => {
    if (!sellerUid) return;
    try {
      const raw = localStorage.getItem("hiddenSellerUids");
      const parsed = raw ? JSON.parse(raw) : [];
      const current = Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
      if (!current.includes(sellerUid)) {
        localStorage.setItem("hiddenSellerUids", JSON.stringify([...current, sellerUid]));
      }
    } catch {
      localStorage.setItem("hiddenSellerUids", JSON.stringify([sellerUid]));
    }
    navigateBackOrPath(EXPLORE_PATH);
  };

  const handleScrollSpecTabsLeft = () => {
    const container = specTabsRef.current;
    if (!container) return;
    container.scrollBy({ left: -180, behavior: "smooth" });
  };

  const handleScrollSpecTabsRight = () => {
    const container = specTabsRef.current;
    if (!container) return;
    container.scrollBy({ left: 180, behavior: "smooth" });
  };

  const handlePrevImage = () => {
    if (!listing || galleryImages.length <= 1) return;
    const prevIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
    syncListingParamsInUrl(listing.id, prevIndex);
    setRouteState((prev) => ({ ...prev, imageIndex: prevIndex }));
  };

  const handleNextImage = () => {
    if (!listing || galleryImages.length <= 1) return;
    const nextIndex = (currentGalleryIndex + 1) % galleryImages.length;
    syncListingParamsInUrl(listing.id, nextIndex);
    setRouteState((prev) => ({ ...prev, imageIndex: nextIndex }));
  };

  const handleContactSeller = async () => {
    if (!listing) return;

    if (!firebaseUser) {
      navigateToPath("/login");
      return;
    }

    try {
      await fetch(`/api/listings/${listing.id}/whatsapp-click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to track WhatsApp click", error);
    }

    window.open(
      `https://wa.me/${listing.whatsapp_number}?text=${encodeURIComponent(
        `Hi, I'm interested in your "${listing.name}" on BuyMesho. Is it still available?\n\nListing: ${buildListingShareUrl(
          listing.id,
          currentGalleryIndex
        )}`
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const moreFromSeller = () => {
    if (seller?.uid) navigateToSellerProfile(seller.uid);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Listing details</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateBackOrPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-[2rem] border border-zinc-200 bg-white p-10 text-zinc-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading listing details...
          </div>
        ) : !listing ? (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900">Listing not found</h1>
            <p className="mt-3 text-sm text-zinc-500">This listing could not be loaded or may no longer be available.</p>
            <button
              type="button"
              onClick={() => navigateBackOrPath(EXPLORE_PATH)}
              className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-black hover:bg-zinc-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div>
                <div className="flex items-center justify-between gap-3 pb-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
                    <span>{listing.category || "Listing"}</span>
                    <span className="h-1 w-1 rounded-full bg-zinc-300" />
                    <span>{listing.university || "Campus"}</span>
                  </div>
                  <ListingActionsMenu
                    listing={listing}
                    currentUid={firebaseUser?.uid}
                    isLoggedIn={!!firebaseUser}
                    isSaved={saved}
                    variant="detail"
                    onReport={() => navigateToPath(REPORT_PATH)}
                    onDelete={handleDetailDelete}
                    onEdit={handleDetailEdit}
                    onHideSeller={handleDetailHideSeller}
                    onHideListing={handleDetailHideListing}
                    onToggleStatus={handleDetailToggleStatus}
                    onToggleSave={handleToggleSaved}
                    requireLoginForContact={() => navigateToPath("/login")}
                  />
                </div>

                <div className="relative overflow-hidden border border-zinc-200 bg-zinc-50">
                  <div className="relative aspect-[4/3] bg-zinc-100">
                    <img src={currentImage} alt={listing.name} className="h-full w-full object-contain" />

                    <button
                      type="button"
                      onClick={() => setIsFullscreen(true)}
                      className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm hover:bg-white"
                      aria-label="Open fullscreen"
                    >
                      <FullscreenToggleIcon isFullscreen={false} />
                    </button>

                    {galleryImages.length > 1 ? (
                      <>
                        <button
                          type="button"
                          onClick={handlePrevImage}
                          className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm hover:bg-white"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleNextImage}
                          className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm hover:bg-white"
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                        <div className="absolute bottom-4 right-4 rounded-full bg-black/75 px-3 py-1.5 text-xs font-bold text-white">
                          {currentGalleryIndex + 1} / {galleryImages.length}
                        </div>
                      </>
                    ) : null}
                  </div>

                  {galleryImages.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto border-t border-zinc-200 bg-white p-3">
                      {galleryImages.map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => {
                            syncListingParamsInUrl(listing.id, idx);
                            setRouteState((prev) => ({ ...prev, imageIndex: idx }));
                          }}
                          className={`h-16 w-16 shrink-0 overflow-hidden border ${
                            idx === currentGalleryIndex ? "border-zinc-900" : "border-zinc-200"
                          }`}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="space-y-4">
                <div className="border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Listing</p>
                      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">{listing.name}</h1>
                      <p className="mt-3 text-3xl font-black tracking-tight text-zinc-900">
                        MK {Number(listing.price).toLocaleString()}
                      </p>
                      <p className="mt-1 text-base font-extrabold text-zinc-900">Listed by {listing.business_name}</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleSaved}
                      className={`h-11 w-11 rounded-full border flex items-center justify-center transition-all shadow-sm ${
                        saved
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                      aria-label={saved ? "Remove from saved" : "Save item"}
                    >
                      <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {listing.subcategory ? (
                      <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-700">
                        {listing.subcategory}
                      </span>
                    ) : null}
                    {listing.item_type ? (
                      <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-700">
                        {listing.item_type}
                      </span>
                    ) : null}
                    {listing.condition ? (
                      <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-700">
                        {listing.condition}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide ${
                        listing.status === "sold" || availableQuantity === 0
                          ? "bg-zinc-200 text-zinc-600"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {listing.status === "sold" || availableQuantity === 0 ? "Sold out" : `${availableQuantity} left`}
                    </span>
                    <button
                      type="button"
                      onClick={handleContactSeller}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      {firebaseUser ? <MessageCircle className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {firebaseUser ? "Contact on WhatsApp" : "Log in to Contact"}
                    </button>
                  </div>
                </div>

                <div className="border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller</p>
                  <div className="mt-3 flex items-start gap-4">
                    <button
                      type="button"
                      onClick={() => seller?.uid && navigateToSellerProfile(seller.uid)}
                      className="h-16 w-16 shrink-0 overflow-hidden border border-zinc-200 bg-zinc-100"
                    >
                      {seller?.business_logo ? (
                        <img
                          src={seller.business_logo}
                          alt={seller.business_name || listing.business_name || "Seller"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-black text-zinc-500">
                          {(seller?.business_name || listing.business_name || "S")
                            .trim()
                            .split(/\s+/)
                            .filter((w) => w.length > 0)
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xl font-black tracking-tight text-zinc-900">
                          {seller?.business_name || listing.business_name}
                        </h2>
                        {seller?.is_verified || listing.is_verified ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : null}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{seller?.university || listing.university}</p>
                      <p className="mt-1 text-sm text-zinc-500">Joined {formatDate(seller?.join_date)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={moreFromSeller}
                      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-extrabold text-zinc-800 hover:bg-zinc-50"
                    >
                      <Store className="h-4 w-4" />
                      More from this seller
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600">
                      <Eye className="h-3.5 w-3.5" />
                      {seller?.profile_views ?? 0} profile views
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <StatPill label="Rating" value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"} />
                    <StatPill label="Reviews" value={String(ratingSummary?.ratingCount ?? 0)} />
                    <StatPill label="Views" value={String(listing.views_count ?? 0)} />
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Description</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{listing.description}</p>
              </div>

              <div className="border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Specifications</p>
                {groupedSpecs.length > 0 ? (
                  <div className="mt-5">
                    <div className="relative mb-3 h-9">
                      <div ref={specTabsRef} className="flex h-full items-center gap-2 overflow-x-auto pb-1 px-6">
                        {groupedSpecs.map((group) => (
                          <button
                            key={group.title}
                            type="button"
                            onClick={() => setActiveSpecGroupTitle(group.title)}
                            className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition ${
                              activeSpecGroup?.title === group.title
                                ? "border-zinc-900 bg-zinc-900 text-white"
                                : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                            }`}
                          >
                            {group.title}
                          </button>
                        ))}
                      </div>
                      {showSpecTabsLeftHint ? (
                        <button
                          type="button"
                          onClick={handleScrollSpecTabsLeft}
                          className="absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-sm"
                          aria-label="Scroll specification groups left"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      ) : null}
                      {showSpecTabsRightHint ? (
                        <button
                          type="button"
                          onClick={handleScrollSpecTabsRight}
                          className="absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-sm"
                          aria-label="Scroll specification groups right"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="divide-y divide-zinc-200 border border-zinc-200 bg-zinc-50">
                      {(activeSpecGroup?.rows || []).map((row) => (
                        <div key={row.key} className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-4 px-4 py-3">
                          <p className="border-r border-zinc-200 pr-4 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                            {row.label}
                          </p>
                          <p className="break-words text-right text-sm font-semibold text-zinc-900">
                            {row.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-500">
                    No structured specifications were added for this listing.
                  </div>
                )}
              </div>
            </section>

            <section className="border-t border-zinc-200 pt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Related</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">You may also want these</h2>
                </div>
                <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-600">
                  {visibleRelatedListings.length} item{visibleRelatedListings.length === 1 ? "" : "s"}
                </div>
              </div>

              {visibleRelatedListings.length > 0 ? (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {visibleRelatedListings.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigateToListingDetails(item.id, 0)}
                      className="group overflow-hidden border border-zinc-200 bg-white text-left shadow-sm transition-all hover:shadow-md"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                        <img
                          src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="line-clamp-1 text-base font-extrabold text-zinc-900">{item.name}</h3>
                        <p className="mt-1.5 line-clamp-2 text-xs text-zinc-500">{item.description}</p>
                        <p className="mt-3 text-xl font-black tracking-tight text-zinc-900">
                          MK {Number(item.price).toLocaleString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5 border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
                  No related listings available right now.
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {isFullscreen && listing ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/95 p-4" onClick={() => setIsFullscreen(false)}>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-200 hover:scale-105 hover:bg-white/20"
            aria-label="Exit fullscreen"
          >
            <FullscreenToggleIcon isFullscreen />
          </button>
          <div className="flex h-full w-full max-w-[95vw] max-h-[90vh] items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={currentImage} alt={listing.name} className="max-h-full max-w-full rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
