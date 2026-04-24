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
  Star,
  Store,
} from "lucide-react";
import type { Listing, RatingSummary } from "./types";
import { apiFetch } from "./lib/api";
import {
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  SETTINGS_PATH,
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
import FeedbackModal from "./components/FeedbackModal";
import {
  formatDate,
  InfoPill,
  RelatedRailCard,
  SectionHeading,
  StatTile,
  TabButton,
} from "./components/listingDetails/ListingDetailsShared";

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

type ListingActionResponse = {
  success: boolean;
  listing?: Listing;
  available_quantity?: number;
};

type SectionKey = "details" | "explore" | "reviews";

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
  const [shareNoticeOpen, setShareNoticeOpen] = useState(false);
  const [shareNoticeMessage, setShareNoticeMessage] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("details");

  const detailsRef = useRef<HTMLElement | null>(null);
  const exploreRef = useRef<HTMLElement | null>(null);
  const reviewsRef = useRef<HTMLElement | null>(null);

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
  const visibleRelatedListings = relatedListings.slice(0, 18);
  const sameCampusListings = visibleRelatedListings.filter(
    (item) => item.university === listing?.university && item.id !== listing?.id
  );
  const sameCategoryListings = visibleRelatedListings.filter(
    (item) => item.category === listing?.category && item.id !== listing?.id
  );
  const sellerOtherListings = visibleRelatedListings.filter(
    (item) => item.seller_uid === listing?.seller_uid && item.id !== listing?.id
  );

  useEffect(() => {
    const targets: Array<[SectionKey, HTMLElement | null]> = [
      ["details", detailsRef.current],
      ["explore", exploreRef.current],
      ["reviews", reviewsRef.current],
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const match = targets.find(([, el]) => el === visible.target);
          if (match) setActiveSection(match[0]);
        }
      },
      { threshold: [0.15, 0.3, 0.5], rootMargin: "-20% 0px -60% 0px" }
    );

    targets.forEach(([, el]) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [listing]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isFullscreen]);

  const openShareNotice = (message: string) => {
    setShareNoticeMessage(message);
    setShareNoticeOpen(true);
  };

  const handleShare = async () => {
    if (!listing) return;
    const shareUrl = buildListingShareUrl(listing.id, currentGalleryIndex);
    const shareText = `BuyMesho Listing\n${listing.name}\nPrice: MK ${Number(listing.price).toLocaleString()}\nCampus: ${listing.university}\nWhatsApp: ${listing.whatsapp_number}\n\nOpen this listing: ${shareUrl}`;

    try {
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: `BuyMesho: ${listing.name}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      try {
        await navigator.clipboard.writeText(shareText);
        openShareNotice("Share text copied to clipboard.");
      } catch {
        openShareNotice(`Copy this manually:\n\n${shareText}`);
      }
    } catch {
      openShareNotice(`Copy this manually:\n\n${shareText}`);
    }
  };

  const handleToggleSaved = () => {
    if (!listing) return;
    const nextSaved = toggleSavedListingId(listing.id, firebaseUser?.uid);
    setSaved(nextSaved);
  };

  const handleDetailEdit = (item: Listing) => {
    navigateToEditListing(item.id);
  };

  const handleDetailDelete = async (listingIdToDelete: number) => {
    const ok = window.confirm("Delete this listing?");
    if (!ok) return;

    try {
      await apiFetch(`/api/listings/${listingIdToDelete}`, { method: "DELETE" });
      navigateBackOrPath(EXPLORE_PATH);
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to delete listing.");
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
      openShareNotice(error?.message || "Failed to update listing status.");
    }
  };

  const handleDetailRecordSale = async (item: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;

    try {
      const result = (await apiFetch(`/api/listings/${item.id}/record-sale`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      })) as ListingActionResponse;

      if (result?.listing) {
        setListing((prev) => (prev ? { ...prev, ...result.listing } : prev));
      }
      openShareNotice("Sale recorded successfully.");
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to record sale.");
    }
  };

  const handleDetailRestock = async (item: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;

    try {
      const result = (await apiFetch(`/api/listings/${item.id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity }),
      })) as ListingActionResponse;

      if (result?.listing) {
        setListing((prev) => (prev ? { ...prev, ...result.listing } : prev));
      }
      openShareNotice("Listing restocked successfully.");
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to restock listing.");
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

  const scrollToSection = (section: SectionKey) => {
    const element = section === "details" ? detailsRef.current : section === "explore" ? exploreRef.current : reviewsRef.current;
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleContactSeller = async () => {
    if (!listing) return;

    if (!firebaseUser) {
      navigateToPath(LOGIN_PATH);
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
        `Hi, I'm interested in your "${listing.name}" on BuyMesho. Is it still available?\n\nListing: ${buildListingShareUrl(listing.id, currentGalleryIndex)}`
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const renderRelatedSection = (title: string, items: Listing[], emptyMessage: string) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">{items.length} listings</p>
      </div>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <RelatedRailCard
              key={item.id}
              item={item}
              onOpenDetails={navigateToListingDetails}
              onOpenSeller={navigateToSellerProfile}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-sm text-zinc-500">
          {emptyMessage}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-900 text-xl font-extrabold text-white shadow-lg shadow-red-900/20">
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
              onClick={() => navigateToPath(SETTINGS_PATH)}
              className="hidden rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:inline-flex"
            >
              Settings
            </button>
            <button
              type="button"
              onClick={() => navigateBackOrPath(EXPLORE_PATH)}
              className="rounded-2xl border border-zinc-900 bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:pt-8">
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
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        ) : (
          <>
            <section className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-2">
                      <InfoPill>{listing.category}</InfoPill>
                      {listing.condition ? <InfoPill>{listing.condition}</InfoPill> : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleToggleSaved}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all shadow-sm ${
                          saved
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                        aria-label={saved ? "Remove from saved" : "Save item"}
                      >
                        <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                      </button>
                      <ListingActionsMenu
                        listing={listing}
                        currentUid={firebaseUser?.uid}
                        isLoggedIn={!!firebaseUser}
                        isSaved={saved}
                        variant="detail"
                        onReport={() => navigateToPath(`${REPORT_PATH}?listingId=${encodeURIComponent(listing.id)}`)}
                        onEdit={handleDetailEdit}
                        onDelete={handleDetailDelete}
                        onHideSeller={handleDetailHideSeller}
                        onHideListing={handleDetailHideListing}
                        onToggleStatus={handleDetailToggleStatus}
                        onRecordSale={handleDetailRecordSale}
                        onRestock={handleDetailRestock}
                        requireLoginForContact={() => navigateToPath(LOGIN_PATH)}
                      />
                    </div>
                  </div>

                  <div className="relative bg-zinc-100">
                    <div className="relative aspect-square sm:aspect-[4/3] xl:aspect-[5/4]">
                      <img src={currentImage} alt={listing.name} className="h-full w-full object-contain" />

                      <button
                        type="button"
                        onClick={() => setIsFullscreen(true)}
                        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow transition-transform duration-200 hover:scale-105 hover:bg-white active:scale-95"
                        aria-label="Open fullscreen"
                      >
                        <FullscreenToggleIcon isFullscreen={false} />
                      </button>

                      {galleryImages.length > 1 ? (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevImage}
                            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow hover:bg-white"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleNextImage}
                            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/90 shadow hover:bg-white"
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
                  </div>

                  {galleryImages.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto border-t border-zinc-100 px-4 py-4 sm:px-5">
                      {galleryImages.map((url, idx) => (
                        <button
                          key={`${url}-${idx}`}
                          type="button"
                          onClick={() => {
                            syncListingParamsInUrl(listing.id, idx);
                            setRouteState((prev) => ({ ...prev, imageIndex: idx }));
                          }}
                          className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border ${
                            idx === currentGalleryIndex ? "border-zinc-900" : "border-zinc-200"
                          }`}
                        >
                          <img src={url} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {listing.video_url ? (
                    <div className="border-t border-zinc-100 px-4 py-4 sm:px-5">
                      <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-black">
                        <video src={listing.video_url} controls className="w-full" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">{listing.category}</p>
                        <h1 className="text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">{listing.name}</h1>
                        <p className="text-3xl font-black tracking-tight text-zinc-900">MK {Number(listing.price).toLocaleString()}</p>
                      </div>

                      <button type="button" onClick={() => seller?.uid && navigateToSellerProfile(seller.uid)} className="flex items-center gap-3 text-left">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                          {seller?.business_logo ? (
                            <img src={seller.business_logo} alt={seller.business_name || listing.business_name || "Seller"} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xs font-black text-zinc-500">
                              {(seller?.business_name || listing.business_name || "S")
                                .trim()
                                .split(/\s+/)
                                .filter((word) => word.length > 0)
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-black tracking-tight text-zinc-900 sm:text-xl">{seller?.business_name || listing.business_name}</h2>
                            {seller?.is_verified || listing.is_verified ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : null}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">{listing.university}</p>
                        </div>
                      </button>
                    </div>

                    <div className="text-right text-sm text-zinc-500">
                      <p>
                        Joined: <span className="font-semibold text-zinc-900">{formatDate(seller?.join_date)}</span>
                      </p>
                      <p className="mt-1">
                        Profile views: <span className="font-semibold text-zinc-900">{seller?.profile_views ?? 0}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {listing.university ? <InfoPill>{listing.university}</InfoPill> : null}
                    {listing.subcategory ? <InfoPill>{listing.subcategory}</InfoPill> : null}
                    {listing.item_type ? <InfoPill>{listing.item_type}</InfoPill> : null}
                    {listing.condition ? <InfoPill>{listing.condition}</InfoPill> : null}
                    {listing.status === "sold" || availableQuantity === 0 ? <InfoPill>Sold out</InfoPill> : <InfoPill>{availableQuantity} left</InfoPill>}
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <StatTile label="Average rating" value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} />
                    <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
                    <StatTile label="Listing views" value={listing.views_count ?? 0} icon={<Eye className="h-4 w-4" />} />
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleContactSeller}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                    >
                      {firebaseUser ? <MessageCircle className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {firebaseUser ? "Contact on WhatsApp" : "Log in to Contact"}
                    </button>
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-extrabold text-zinc-800 hover:bg-zinc-50"
                    >
                      Share listing
                    </button>
                  </div>
                </section>
              </div>
            </section>

            <div className="sticky top-[73px] z-30 -mx-4 mt-8 border-y border-zinc-200 bg-white/90 px-4 backdrop-blur-sm sm:top-[77px]">
              <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto">
                <TabButton active={activeSection === "details"} onClick={() => scrollToSection("details")}>Details</TabButton>
                <TabButton active={activeSection === "explore"} onClick={() => scrollToSection("explore")}>Explore</TabButton>
                <TabButton active={activeSection === "reviews"} onClick={() => scrollToSection("reviews")}>Reviews</TabButton>
              </div>
            </div>

            <section ref={detailsRef} id="details" className="scroll-mt-32 pt-10">
              <div className="space-y-10">
                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Details"
                    title="About this listing"
                    description="The description, seller note, and delivery guidance stay in one continuous block so the page reads like a premium product page, not a dashboard."
                  />

                  <div className="space-y-5 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                    <div className="space-y-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Listing description</p>
                      <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-600">{listing.description}</p>
                    </div>

                    <div className="border-t border-zinc-200 pt-5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Seller note</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600">
                        {seller?.bio?.trim() || "No seller note has been added yet."}
                      </p>
                    </div>

                    <div className="border-t border-zinc-200 pt-5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Delivery and collection</p>
                      <p className="mt-3 text-sm leading-7 text-zinc-600">
                        Contact the seller on WhatsApp to confirm collection, delivery, or campus handover details.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Specs"
                    title="Structured specifications"
                    description="The grouped spec model stays exactly as-is. It is visible, organized, and not collapsible."
                  />

                  <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                    {groupedSpecs.length ? (
                      <div className="space-y-8">
                        {groupedSpecs.map((group, index) => (
                          <div key={group.title} className={index === 0 ? "" : "border-t border-zinc-200 pt-6"}>
                            <h3 className="text-lg font-black tracking-tight text-zinc-900">{group.title}</h3>
                            <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                              {group.rows.map((row) => (
                                <div key={row.key} className="space-y-1 border-b border-zinc-100 pb-3">
                                  <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">{row.label}</dt>
                                  <dd className="text-sm font-semibold text-zinc-900">{row.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
                        No grouped specs are available for this listing.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <SectionHeading
                    eyebrow="Trust"
                    title="Seller trust summary"
                    description="This block is intentionally quieter than the hero section. It supports confidence without competing with the CTA."
                  />

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatTile label="Seller business" value={seller?.business_name || listing.business_name} icon={<Store className="h-4 w-4" />} />
                    <StatTile label="Verification" value={seller?.is_verified || listing.is_verified ? "Verified" : "Not verified"} icon={<ShieldCheck className="h-4 w-4" />} />
                    <StatTile label="Joined" value={formatDate(seller?.join_date)} icon={<MapPin className="h-4 w-4" />} />
                    <StatTile label="Profile views" value={seller?.profile_views ?? 0} icon={<Eye className="h-4 w-4" />} />
                  </div>

                  <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <button type="button" onClick={() => seller?.uid && navigateToSellerProfile(seller.uid)} className="flex items-center gap-3 text-left">
                        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                          {seller?.business_logo ? (
                            <img src={seller.business_logo} alt={seller.business_name || listing.business_name || "Seller"} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-black text-zinc-500">
                              {(seller?.business_name || listing.business_name || "S")
                                .trim()
                                .split(/\s+/)
                                .filter((word) => word.length > 0)
                                .map((word) => word[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black tracking-tight text-zinc-900">{seller?.business_name || listing.business_name}</h3>
                            {seller?.is_verified || listing.is_verified ? <ShieldCheck className="h-4 w-4 text-blue-500" /> : null}
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {listing.university} · {listing.category}
                          </p>
                        </div>
                      </button>

                      <div className="text-right text-sm text-zinc-500">
                        <p>
                          WhatsApp clicks: <span className="font-semibold text-zinc-900">{listing.whatsapp_clicks ?? 0}</span>
                        </p>
                        <p className="mt-1">
                          Listing views: <span className="font-semibold text-zinc-900">{listing.views_count ?? 0}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <StatTile label="Rating average" value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} />
                      <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
                      <StatTile label="Campus" value={listing.university} icon={<MapPin className="h-4 w-4" />} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section ref={exploreRef} id="explore" className="scroll-mt-32 pt-12">
              <div className="space-y-8">
                <SectionHeading
                  eyebrow="Explore"
                  title="Discover more options"
                  description="Related listings stay compact and secondary so they support comparison without turning the page into a cluttered marketplace grid."
                />
                {renderRelatedSection("Same campus", sameCampusListings, "No same-campus listings are available right now.")}
                {renderRelatedSection("Same category", sameCategoryListings, "No same-category listings are available right now.")}
                {renderRelatedSection("Seller’s other listings", sellerOtherListings, "This seller does not have any other visible listings yet.")}
              </div>
            </section>

            <section ref={reviewsRef} id="reviews" className="scroll-mt-32 pt-12">
              <div className="space-y-6">
                <SectionHeading
                  eyebrow="Reviews"
                  title="Trust and feedback"
                  description="This is the final trust layer. It confirms credibility without competing with the listing summary or the WhatsApp CTA."
                />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <StatTile label="Average rating" value={ratingSummary ? ratingSummary.averageRating.toFixed(1) : "—"} icon={<Star className="h-4 w-4" />} />
                  <StatTile label="Rating count" value={ratingSummary?.ratingCount ?? 0} icon={<ShieldCheck className="h-4 w-4" />} />
                  <StatTile label="Listing views" value={listing.views_count ?? 0} icon={<Eye className="h-4 w-4" />} />
                  <StatTile label="WhatsApp clicks" value={listing.whatsapp_clicks ?? 0} icon={<MessageCircle className="h-4 w-4" />} />
                </div>

                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-500">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black tracking-tight text-zinc-900">Review feed coming soon</h3>
                      <p className="max-w-3xl text-sm leading-7 text-zinc-600">
                        The rating summary is already live. A full buyer review list can be layered in later without changing the page hierarchy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {isFullscreen && listing ? (
        <div className="fixed inset-0 z-[90] bg-black/90 p-4 sm:p-6">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-4">
            <div className="flex items-center justify-between gap-3 text-white">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">Gallery</p>
                <p className="mt-1 text-lg font-black">{listing.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
                aria-label="Close fullscreen"
              >
                <FullscreenToggleIcon isFullscreen />
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[2rem] bg-black">
              <img src={currentImage} alt={listing.name} className="h-full w-full object-contain" />
              {galleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-900 hover:bg-white"
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
          </div>
        </div>
      ) : null}

      <FeedbackModal open={shareNoticeOpen} type="info" title="Notice" message={shareNoticeMessage} onClose={() => setShareNoticeOpen(false)} />
    </div>
  );
}
