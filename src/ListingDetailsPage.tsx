import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Listing, RatingSummary } from "./types";
import { apiFetch } from "./lib/api";
import { EXPLORE_PATH, LOGIN_PATH, REPORT_PATH, navigateBackOrPath, navigateToEditListing, navigateToPath } from "./lib/appNavigation";
import { buildListingShareUrl, getListingParamsFromUrl, syncListingParamsInUrl } from "./lib/listingUrl";
import { getListingItemConfig } from "./listingSchemas";
import { useAuthUser } from "./hooks/useAuthUser";
import { fetchListingById } from "./lib/listings";
import { isListingSaved, subscribeToSavedListingChanges, toggleSavedListingId } from "./lib/savedListings";
import ListingActionsMenu from "./components/ListingActionsMenu";
import FeedbackModal from "./components/FeedbackModal";
import ListingGallery from "./components/listingDetails/ListingGallery";
import ListingSummary from "./components/listingDetails/ListingSummary";
import ListingSpecsBlock, { type ListingSpecsGroup } from "./components/listingDetails/ListingSpecsBlock";
import ListingTrustBlock from "./components/listingDetails/ListingTrustBlock";
import ListingExploreBlock from "./components/listingDetails/ListingExploreBlock";
import ListingReviewsBlock from "./components/listingDetails/ListingReviewsBlock";
import ListingSectionTabs from "./components/listingDetails/ListingSectionTabs";
import ListingDetailsBlock from "./components/listingDetails/ListingDetailsBlock";
import ListingHeaderBar from "./components/listingDetails/ListingHeaderBar";
import ListingStatusPanel from "./components/listingDetails/ListingStatusPanel";

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

const specValue = (value: unknown) =>
  Array.isArray(value)
    ? value.length
      ? value.join(", ")
      : "—"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : value === null || value === undefined || value === ""
        ? "—"
        : String(value);

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
        setRelatedListings(relatedResult.status === "fulfilled" && Array.isArray(relatedResult.value) ? relatedResult.value : []);
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
    return Array.isArray(listing.photos) && listing.photos.length > 0 ? listing.photos : [`https://picsum.photos/seed/${listing.id}/900/900`];
  }, [listing]);

  const currentGalleryIndex = Math.min(Math.max(routeState.imageIndex || 0, 0), Math.max(galleryImages.length - 1, 0));

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

  const groupedSpecs = useMemo<ListingSpecsGroup[]>(() => {
    if (!listing?.spec_values || !itemConfig) return [];

    return itemConfig.fieldGroups
      .map((group) => {
        const rows = group.keys
          .map((key) => {
            const field = itemConfig.schema.fields.find((f) => f.key === key);
            if (!field) return null;
            const raw = listing.spec_values?.[key];
            if (raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && !raw.length)) return null;
            return { key, label: field.label, value: specValue(raw) };
          })
          .filter(Boolean);

        return rows.length ? { title: group.title, rows: rows as Array<{ key: string; label: string; value: string }> } : null;
      })
      .filter(Boolean) as ListingSpecsGroup[];
  }, [listing, itemConfig]);

  const availableQuantity = listing ? Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0)) : 0;
  const currentImage = galleryImages[currentGalleryIndex] || galleryImages[0] || "";
  const visibleRelated = relatedListings.slice(0, 18);
  const sameCampusListings = visibleRelated.filter((item) => item.university === listing?.university && item.id !== listing?.id);
  const sameCategoryListings = visibleRelated.filter((item) => item.category === listing?.category && item.id !== listing?.id);
  const sellerOtherListings = visibleRelated.filter((item) => item.seller_uid === listing?.seller_uid && item.id !== listing?.id);

  useEffect(() => {
    const targets: Array<[SectionKey, HTMLElement | null]> = [
      ["details", detailsRef.current],
      ["explore", exploreRef.current],
      ["reviews", reviewsRef.current],
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const match = targets.find(([, el]) => el === visible.target);
          if (match) setActiveSection(match[0]);
        }
      },
      { threshold: [0.15, 0.3, 0.5], rootMargin: "-20% 0px -60% 0px" }
    );

    targets.forEach(([, el]) => el && observer.observe(el));
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
        await (navigator as any).share({ title: `BuyMesho: ${listing.name}`, text: shareText, url: shareUrl });
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
    setSaved(toggleSavedListingId(listing.id, firebaseUser?.uid));
  };

  const handleDetailEdit = (item: Listing) => navigateToEditListing(item.id);

  const handleDetailDelete = async (id: number) => {
    if (!window.confirm("Delete this listing?")) return;
    try {
      await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
      navigateBackOrPath(EXPLORE_PATH);
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to delete listing.");
    }
  };

  const handleDetailToggleStatus = async (item: Listing) => {
    const nextStatus = item.status === "sold" ? "available" : "sold";
    try {
      await apiFetch(`/api/listings/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      setListing((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to update listing status.");
    }
  };

  const handleDetailRecordSale = async (item: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    try {
      const result = (await apiFetch(`/api/listings/${item.id}/record-sale`, { method: "POST", body: JSON.stringify({ quantity }) })) as ListingActionResponse;
      if (result?.listing) setListing((prev) => (prev ? { ...prev, ...result.listing } : prev));
      openShareNotice("Sale recorded successfully.");
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to record sale.");
    }
  };

  const handleDetailRestock = async (item: Listing, quantity: number) => {
    if (!quantity || quantity <= 0) return;
    try {
      const result = (await apiFetch(`/api/listings/${item.id}/restock`, { method: "POST", body: JSON.stringify({ quantity }) })) as ListingActionResponse;
      if (result?.listing) setListing((prev) => (prev ? { ...prev, ...result.listing } : prev));
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
      if (!current.includes(listingIdToHide)) localStorage.setItem("hiddenListingIds", JSON.stringify([...current, listingIdToHide]));
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
      if (!current.includes(sellerUid)) localStorage.setItem("hiddenSellerUids", JSON.stringify([...current, sellerUid]));
    } catch {
      localStorage.setItem("hiddenSellerUids", JSON.stringify([sellerUid]));
    }
    navigateBackOrPath(EXPLORE_PATH);
  };

  const handlePrevImage = () => {
    if (!listing || galleryImages.length <= 1) return;
    const prevIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
    syncListingParamsInUrl(listing.id, prevIndex);
    setRouteState((prevState) => ({ ...prevState, imageIndex: prevIndex }));
  };

  const handleNextImage = () => {
    if (!listing || galleryImages.length <= 1) return;
    const nextIndex = (currentGalleryIndex + 1) % galleryImages.length;
    syncListingParamsInUrl(listing.id, nextIndex);
    setRouteState((prevState) => ({ ...prevState, imageIndex: nextIndex }));
  };

  const scrollToSection = (section: SectionKey) => {
    const element = section === "details" ? detailsRef.current : section === "explore" ? exploreRef.current : reviewsRef.current;
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleContactSeller = async () => {
    if (!listing) return;
    if (!firebaseUser) return navigateToPath(LOGIN_PATH);

    try {
      await fetch(`/api/listings/${listing.id}/whatsapp-click`, { method: "POST", headers: { "Content-Type": "application/json" } });
    } catch (error) {
      console.error("Failed to track WhatsApp click", error);
    }

    window.open(`https://wa.me/${listing.whatsapp_number}?text=${encodeURIComponent(`Hi, I'm interested in your \"${listing.name}\" on BuyMesho. Is it still available?\n\nListing: ${buildListingShareUrl(listing.id, currentGalleryIndex)}`)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <ListingHeaderBar />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:pt-8">
        {loading ? (
          <ListingStatusPanel loading hasListing={!!listing} />
        ) : !listing ? (
          <ListingStatusPanel loading={false} hasListing={false} onRetry={() => navigateBackOrPath(EXPLORE_PATH)} />
        ) : (
          <>
<section className="grid gap-8 xl:grid-cols-[140px_minmax(0,1fr)] xl:items-start">
  <div className="xl:sticky xl:top-24 xl:self-start xl:max-w-[160px]">
    <ListingGallery
      listingName={listing.name}
      galleryImages={galleryImages}
      currentGalleryIndex={currentGalleryIndex}
      currentImage={currentImage}
      videoUrl={listing.video_url}
      isFullscreen={isFullscreen}
      saved={saved}
      onToggleSaved={handleToggleSaved}
      onOpenFullscreen={() => setIsFullscreen(true)}
      onCloseFullscreen={() => setIsFullscreen(false)}
      onPrevImage={handlePrevImage}
      onNextImage={handleNextImage}
      onSelectImage={(idx) => {
        syncListingParamsInUrl(listing.id, idx);
        setRouteState((prev) => ({ ...prev, imageIndex: idx }));
      }}
      actionsMenu={
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
      }
    />
  </div>

  <div className="space-y-6">
    <ListingSummary
      listing={listing}
      seller={seller}
      availableQuantity={availableQuantity}
      isLoggedIn={!!firebaseUser}
      onContactSeller={handleContactSeller}
      onShare={handleShare}
    />
    <ListingDetailsBlock
      description={listing.description}
      sellerNote={seller?.bio?.trim() || "No seller note has been added yet."}
      deliveryNote="Contact the seller on WhatsApp to confirm collection, delivery, or campus handover details."
    />
  </div>
</section>

<ListingSectionTabs activeSection={activeSection} onNavigate={scrollToSection} />

 <section ref={detailsRef} id="details" className="scroll-mt-32 pt-10">
  <div className="space-y-6">
    <ListingSpecsBlock groups={groupedSpecs} />
    <ListingTrustBlock listing={listing} seller={seller} />
  </div>
 </section>

            <section ref={exploreRef} id="explore" className="scroll-mt-32 pt-12">
              <ListingExploreBlock sameCampusListings={sameCampusListings} sameCategoryListings={sameCategoryListings} sellerOtherListings={sellerOtherListings} />
            </section>

            <section ref={reviewsRef} id="reviews" className="scroll-mt-32 pt-12">
              <ListingReviewsBlock ratingSummary={ratingSummary} />
            </section>
          </>
        )}
      </main>

      <FeedbackModal open={shareNoticeOpen} type="info" title="Notice" message={shareNoticeMessage} onClose={() => setShareNoticeOpen(false)} />
    </div>
  );
}
