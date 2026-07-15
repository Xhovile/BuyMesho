import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Listing, RatingSummary } from "../types";
import { apiFetch } from "../lib/api";
import {
  EXPLORE_PATH,
  REPORT_PATH,
  navigateBackOrPath,
  navigateToEditListing,
  navigateToLoginWithReturnPath,
} from "../lib/appNavigation";
import { buildListingShareUrl, getListingParamsFromUrl, syncListingParamsInUrl } from "../lib/listingUrl";
import { getListingItemConfig } from "../listingSchemas";
import { useAuthUser } from "./useAuthUser";
import { fetchListingById } from "../lib/listings";
import { isListingSaved, subscribeToSavedListingChanges, toggleSavedListingId } from "../lib/savedListings";
import { navigateToConversation } from "../lib/messagesNavigation";
import { startConversationFromListing } from "../lib/messages";
import {
  hideListingId,
  hideSellerUid,
  readHiddenListingIds,
  readHiddenSellerUids,
  type ListingActionResponse,
  type SectionKey,
  type SellerProfile,
  specValue,
} from "../components/listingDetails/listingDetailsUtils";
import { useBuyerCartSync } from "./useBuyerCartSync";
import { setBuyerCartItem } from "../lib/buyerState";

export type ListingDetailsPageState = {
  firebaseUser: ReturnType<typeof useAuthUser>["user"];
  listing: Listing | null;
  seller: SellerProfile | null;
  ratingSummary: RatingSummary | null;
  ratingLoading: boolean;
  ratingSubmitting: boolean;
  relatedListings: Listing[];
  loading: boolean;
  isFullscreen: boolean;
  saved: boolean;
  shareNoticeOpen: boolean;
  shareNoticeMessage: string;
  activeSection: SectionKey;
  checkoutOpen: boolean;
  authPromptOpen: boolean;
  authPromptAction: "message" | "buy" | "cart" | null;
  hiddenSellerUids: string[];
  hiddenListingIds: number[];
  detailsRef: RefObject<HTMLElement | null>;
  exploreRef: RefObject<HTMLElement | null>;
  reviewsRef: RefObject<HTMLElement | null>;
  listingId: string;
  galleryImages: string[];
  currentGalleryIndex: number;
  currentImage: string;
  itemConfig: ReturnType<typeof getListingItemConfig> | null;
  groupedSpecs: Array<{ title: string; rows: Array<{ key: string; label: string; value: string }> }>;
  availableQuantity: number;
  visibleRelated: Listing[];
  sameCampusListings: Listing[];
  sameCategoryListings: Listing[];
  sellerOtherListings: Listing[];
  showOffersBlock: boolean;
  setCheckoutOpen: (open: boolean) => void;
  openShareNotice: (message: string) => void;
  closeShareNotice: () => void;
  openAuthPrompt: (action: "message" | "buy" | "cart") => void;
  closeAuthPrompt: () => void;
  continueToAuth: () => void;
  handleShare: () => Promise<void>;
  handleToggleSaved: () => void;
  handleDetailEdit: (item: Listing) => void;
  handleDetailDelete: (id: number) => Promise<void>;
  handleDetailToggleStatus: (item: Listing) => Promise<void>;
  handleDetailRecordSale: (item: Listing, quantity: number) => Promise<void>;
  handleDetailRestock: (item: Listing, quantity: number) => Promise<void>;
  handleDetailHideListing: (listingIdToHide: number) => void;
  handleDetailHideSeller: (sellerUid?: string) => void;
  handlePrevImage: () => void;
  handleNextImage: () => void;
  scrollToSection: (section: SectionKey) => void;
  handleBuyNow: () => void;
  handleAddToCart: () => Promise<void>;
  handleMessageSeller: () => Promise<void>;
  refreshRatingSummary: (sellerUid: string) => Promise<void>;
  handleRateSeller: (stars: number) => Promise<void>;
  handleRemoveRating: () => Promise<void>;
  onSelectImage: (idx: number) => void;
  onToggleFullscreen: (open: boolean) => void;
  onRetry: () => void;
  reportPath: string;
  isLoggedIn: boolean;
};

export function useListingDetailsPage(): ListingDetailsPageState {
  const { user: firebaseUser } = useAuthUser();
  const { items: buyerCartItems } = useBuyerCartSync();
  const [routeState, setRouteState] = useState(() => getListingParamsFromUrl());
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [relatedListings, setRelatedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareNoticeOpen, setShareNoticeOpen] = useState(false);
  const [shareNoticeMessage, setShareNoticeMessage] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("details");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [authPromptAction, setAuthPromptAction] = useState<"message" | "buy" | "cart" | null>(null);
  const [hiddenSellerUids, setHiddenSellerUids] = useState<string[]>(() => readHiddenSellerUids());
  const [hiddenListingIds, setHiddenListingIds] = useState<number[]>(() => readHiddenListingIds());

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

  useEffect(() => {
    if (!listing?.seller_uid) return;
    void refreshRatingSummary(listing.seller_uid);
  }, [listing?.seller_uid, firebaseUser?.uid]);

  useEffect(() => {
    const syncHiddenCollections = () => {
      setHiddenSellerUids(readHiddenSellerUids());
      setHiddenListingIds(readHiddenListingIds());
    };

    return subscribeToHiddenCollectionsChanges(syncHiddenCollections);
  }, []);

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
            const raw = listing.spec_values?.[key];
            if (raw === null || raw === undefined || raw === "" || (Array.isArray(raw) && !raw.length)) return null;
            return { key, label: field.label, value: specValue(raw) };
          })
          .filter(Boolean);

        return rows.length ? { title: group.title, rows: rows as Array<{ key: string; label: string; value: string }> } : null;
      })
      .filter(Boolean) as Array<{ title: string; rows: Array<{ key: string; label: string; value: string }> }>;
  }, [listing, itemConfig]);

  const availableQuantity = listing
    ? Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0))
    : 0;
  const currentImage = galleryImages[currentGalleryIndex] || galleryImages[0] || "";

  const hiddenSellerSet = useMemo(() => new Set(hiddenSellerUids), [hiddenSellerUids]);
  const hiddenListingSet = useMemo(() => new Set(hiddenListingIds), [hiddenListingIds]);

  const visibleRelated = relatedListings
    .filter((item) => {
      const listingIdValue = Number(item.id);
      const hiddenByListingId = Number.isInteger(listingIdValue) && hiddenListingSet.has(listingIdValue);
      const hiddenBySeller = !!item.seller_uid && hiddenSellerSet.has(item.seller_uid);
      return !hiddenByListingId && !hiddenBySeller;
    })
    .slice(0, 18);

  const sameCampusListings = visibleRelated.filter(
    (item) => item.university === listing?.university && item.id !== listing?.id
  );
  const sameCategoryListings = visibleRelated.filter(
    (item) => item.category === listing?.category && item.id !== listing?.id
  );
  const sellerOtherListings = visibleRelated.filter(
    (item) => item.seller_uid === listing?.seller_uid && item.id !== listing?.id
  );
  const showOffersBlock = listing?.listing_mode === "deal" || listing?.listing_mode === "wholesale";

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

  const closeShareNotice = () => setShareNoticeOpen(false);

  const openAuthPrompt = (action: "message" | "buy" | "cart") => {
    setAuthPromptAction(action);
    setAuthPromptOpen(true);
  };

  const closeAuthPrompt = () => {
    setAuthPromptOpen(false);
    setAuthPromptAction(null);
  };

  const continueToAuth = () => {
    closeAuthPrompt();
    navigateToLoginWithReturnPath();
  };

  const handleShare = async () => {
    if (!listing) return;
    const shareUrl = buildListingShareUrl(listing.id, currentGalleryIndex);
    const shareText = `BuyMesho Listing\n${listing.name}\nPrice: MK ${Number(listing.price).toLocaleString()}\nCampus: ${listing.university}\n\nOpen this listing: ${shareUrl}`;

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
      if (result?.listing) setListing((prev) => (prev ? { ...prev, ...result.listing } : prev));
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
      if (result?.listing) setListing((prev) => (prev ? { ...prev, ...result.listing } : prev));
      openShareNotice("Listing restocked successfully.");
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to restock listing.");
    }
  };

  const handleDetailHideListing = (listingIdToHide: number) => {
    hideListingId(listingIdToHide);
    navigateBackOrPath(EXPLORE_PATH);
  };

  const handleDetailHideSeller = (sellerUid?: string) => {
    if (!sellerUid) return;
    hideSellerUid(sellerUid);
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
    const element =
      section === "details"
        ? detailsRef.current
        : section === "explore"
          ? exploreRef.current
          : reviewsRef.current;
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleBuyNow = () => {
    if (!firebaseUser) {
      openAuthPrompt("buy");
      return;
    }
    setCheckoutOpen(true);
  };

  const handleAddToCart = async () => {
    if (!listing) return;

    if (!firebaseUser) {
      openAuthPrompt("cart");
      return;
    }

    const isOwner = firebaseUser.uid === listing.seller_uid;
    const maxQty = Math.max(0, Number(listing.quantity ?? 1) - Number(listing.sold_quantity ?? 0));
    if (isOwner || listing.status === "sold" || maxQty <= 0) return;

    const existingItem = buyerCartItems.find((item) => String(item.listingId) === String(listing.id));
    const nextQuantity = Math.min(maxQty, (existingItem?.quantity ?? 0) + 1);
    const unitPrice = Number(listing.price);

    try {
      await setBuyerCartItem({
        listingId: String(listing.id),
        listingTitle: listing.name,
        listingImage: listing.photos?.[0] ?? null,
        listingDescription: listing.description ?? null,
        university: listing.university ?? null,
        quantity: nextQuantity,
        unitPrice,
        totalPrice: unitPrice * nextQuantity,
        availableQuantity: maxQty,
        addedAt: new Date().toISOString(),
      });

      openShareNotice(
        nextQuantity === existingItem?.quantity
          ? "This listing is already at the available cart quantity."
          : "Added to cart."
      );
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to add this item to cart.");
    }
  };

  const handleMessageSeller = async () => {
    if (!listing) return;
    if (!firebaseUser) {
      openAuthPrompt("message");
      return;
    }

    try {
      const conversation = await startConversationFromListing(listing.id);
      navigateToConversation(conversation.id);
    } catch (error: any) {
      openShareNotice(error?.message || "Failed to open conversation.");
    }
  };

  const refreshRatingSummary = async (sellerUid: string) => {
    setRatingLoading(true);
    try {
      const summary = await apiFetch(`/api/users/${sellerUid}/rating-summary`);
      setRatingSummary(summary);
    } catch (error) {
      console.error("Failed to load rating summary", error);
      setRatingSummary(null);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleRateSeller = async (stars: number) => {
    if (!listing?.seller_uid || !firebaseUser) return;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return;
    setRatingSubmitting(true);
    try {
      await apiFetch(`/api/users/${listing.seller_uid}/rating`, {
        method: "POST",
        body: JSON.stringify({ stars }),
      });
      await refreshRatingSummary(listing.seller_uid);
    } catch (error) {
      console.error("Failed to save seller rating", error);
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleRemoveRating = async () => {
    if (!listing?.seller_uid || !firebaseUser) return;
    setRatingSubmitting(true);
    try {
      await apiFetch(`/api/users/${listing.seller_uid}/rating`, {
        method: "DELETE",
      });
      await refreshRatingSummary(listing.seller_uid);
    } catch (error) {
      console.error("Failed to remove seller rating", error);
    } finally {
      setRatingSubmitting(false);
    }
  };

  return {
    firebaseUser,
    listing,
    seller,
    ratingSummary,
    ratingLoading,
    ratingSubmitting,
    relatedListings,
    loading,
    isFullscreen,
    saved,
    shareNoticeOpen,
    shareNoticeMessage,
    activeSection,
    checkoutOpen,
    authPromptOpen,
    authPromptAction,
    hiddenSellerUids,
    hiddenListingIds,
    detailsRef,
    exploreRef,
    reviewsRef,
    listingId,
    galleryImages,
    currentGalleryIndex,
    currentImage,
    itemConfig,
    groupedSpecs,
    availableQuantity,
    visibleRelated,
    sameCampusListings,
    sameCategoryListings,
    sellerOtherListings,
    showOffersBlock,
    setCheckoutOpen,
    openShareNotice,
    closeShareNotice,
    openAuthPrompt,
    closeAuthPrompt,
    continueToAuth,
    handleShare,
    handleToggleSaved,
    handleDetailEdit,
    handleDetailDelete,
    handleDetailToggleStatus,
    handleDetailRecordSale,
    handleDetailRestock,
    handleDetailHideListing,
    handleDetailHideSeller,
    handlePrevImage,
    handleNextImage,
    scrollToSection,
    handleBuyNow,
    handleAddToCart,
    handleMessageSeller,
    refreshRatingSummary,
    handleRateSeller,
    handleRemoveRating,
    onSelectImage: (idx: number) => {
      if (!listing) return;
      syncListingParamsInUrl(listing.id, idx);
      setRouteState((prev) => ({ ...prev, imageIndex: idx }));
    },
    onToggleFullscreen: (open: boolean) => setIsFullscreen(open),
    onRetry: () => navigateBackOrPath(EXPLORE_PATH),
    reportPath: `${REPORT_PATH}?listingId=${encodeURIComponent(listingId)}`,
    isLoggedIn: !!firebaseUser,
  };
}
