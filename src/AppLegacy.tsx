import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./components/ConfirmModal";
import FeedbackModal from "./components/FeedbackModal";
import Header from "./components/Header";
import EditListingModal from "./components/EditListingModal";
import ReportListingModal from "./components/ReportListingModal";
import HeroSection from "./sections/HeroSection";
import MarketSection, {
  type MarketSectionActions,
  type MarketSectionFilters,
  type MarketSectionPagination,
  type MarketSectionSetFilters,
} from "./sections/MarketSection";
import { Listing } from "./types";
import {
  getExploreStateFromLocation,
  navigateToCreateListing,
  navigateToLogin,
  navigateToListingDetails,
  navigateToPath,
  PRIVACY_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  TERMS_PATH,
  navigateToProfile,
  replaceExploreStateInUrl,
  pushExploreStateInUrl,
} from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";

const CATEGORY_QUERY_TO_CANONICAL: Record<string, string> = {
  phones: "Electronics & Gadgets",
  fashion: "Fashion & Clothing",
  books: "Academic Services",
  services: "Academic Services",
};

export default function App() {
  const initialExploreState = getExploreStateFromLocation(window.location);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialExploreState.search);
  const [selectedUniv, setSelectedUniv] = useState(initialExploreState.university);
  const [selectedCat, setSelectedCat] = useState(
    CATEGORY_QUERY_TO_CANONICAL[initialExploreState.category] ??
      initialExploreState.category
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    initialExploreState.subcategory
  );
  const [selectedItemType, setSelectedItemType] = useState(initialExploreState.itemType);
  const [selectedStatus, setSelectedStatus] = useState(initialExploreState.status);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string | string[] | boolean>>(
    initialExploreState.specFilters
  );
  const [sortBy, setSortBy] = useState(initialExploreState.sortBy);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [reportListingId, setReportListingId] = useState<number | null>(null);
  const [savedListingIds, setSavedListingIds] = useState<number[]>([]);
  const [selectedCondition, setSelectedCondition] = useState(
    initialExploreState.condition
  );
  const [hideSoldOut, setHideSoldOut] = useState(initialExploreState.hideSoldOut);
  const [minPrice, setMinPrice] = useState(initialExploreState.minPrice);
  const [maxPrice, setMaxPrice] = useState(initialExploreState.maxPrice);
  const [currentPage, setCurrentPage] = useState(initialExploreState.page);
  const [pageSize] = useState(12);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [urlSyncCounter, setUrlSyncCounter] = useState(0);
  const hasMountedPageResetRef = useRef(false);
  const hasMountedSpecResetRef = useRef(false);
  const syncingFromUrlRef = useRef(false);
  const hasMountedUrlSyncRef = useRef(false);
  const previousSyncStateRef = useRef<{
    search: string;
    selectedUniv: string;
    selectedCat: string;
    selectedSubcategory: string;
    selectedItemType: string;
    selectedStatus: string;
    selectedCondition: string;
    hideSoldOut: boolean;
    minPrice: string;
    maxPrice: string;
    sortBy: string;
    currentPage: number;
    selectedSpecFilters: Record<string, string | string[] | boolean>;
  } | null>(null);
  const serializedSpecFilters = useMemo(
    () => JSON.stringify(selectedSpecFilters),
    [selectedSpecFilters]
  );

  const [hiddenSellerUids, setHiddenSellerUids] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("hiddenSellerUids");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  });

  const [hiddenListingIds, setHiddenListingIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("hiddenListingIds");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x) => Number.isInteger(x)) : [];
    } catch {
      return [];
    }
  });

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: (() => void) | null;
  } | null>(null);

  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);

  const { user: firebaseUser } = useAuthUser();
  const { profile: userProfile } = useAccountProfile();
  const savedStorageKey = firebaseUser ? `savedListingIds:${firebaseUser.uid}` : "savedListingIds:guest";

  const handleListItem = () => {
    navigateToCreateListing();
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCat(cat);
  };

  useEffect(() => {
    if (!hasMountedPageResetRef.current) {
      hasMountedPageResetRef.current = true;
      return;
    }
    if (syncingFromUrlRef.current) return;
    setCurrentPage(1);
  }, [selectedUniv, selectedCat, selectedSubcategory, selectedItemType, selectedStatus, selectedCondition, hideSoldOut, minPrice, maxPrice, search, sortBy, serializedSpecFilters]);

  useEffect(() => {
    if (!hasMountedSpecResetRef.current) {
      hasMountedSpecResetRef.current = true;
      return;
    }
    if (syncingFromUrlRef.current) return;
    setSelectedSpecFilters({});
  }, [selectedCat, selectedSubcategory, selectedItemType]);

  useEffect(() => {
    if (syncingFromUrlRef.current) return;
    const syncPayload = {
      search,
      university: selectedUniv,
      category: selectedCat,
      subcategory: selectedSubcategory,
      itemType: selectedItemType,
      status: selectedStatus,
      condition: selectedCondition,
      sortBy,
      minPrice,
      maxPrice,
      hideSoldOut,
      page: currentPage,
      specFilters: selectedSpecFilters,
    };

    const previous = previousSyncStateRef.current;
    const changedKeys = previous
      ? (
          [
            previous.search !== syncPayload.search ? "search" : null,
            previous.selectedUniv !== syncPayload.university ? "university" : null,
            previous.selectedCat !== syncPayload.category ? "category" : null,
            previous.selectedSubcategory !== syncPayload.subcategory ? "subcategory" : null,
            previous.selectedItemType !== syncPayload.itemType ? "itemType" : null,
            previous.selectedStatus !== syncPayload.status ? "status" : null,
            previous.selectedCondition !== syncPayload.condition ? "condition" : null,
            previous.hideSoldOut !== syncPayload.hideSoldOut ? "hideSoldOut" : null,
            previous.minPrice !== syncPayload.minPrice ? "minPrice" : null,
            previous.maxPrice !== syncPayload.maxPrice ? "maxPrice" : null,
            previous.sortBy !== syncPayload.sortBy ? "sortBy" : null,
            previous.currentPage !== syncPayload.page ? "page" : null,
            JSON.stringify(previous.selectedSpecFilters) !== JSON.stringify(syncPayload.specFilters)
              ? "specFilters"
              : null,
          ].filter(Boolean) as string[]
        )
      : [];

    const searchOnlyChange =
      changedKeys.length > 0 &&
      changedKeys.every((key) => key === "search" || key === "page") &&
      (!changedKeys.includes("page") || syncPayload.page === 1);

    if (!hasMountedUrlSyncRef.current) {
      hasMountedUrlSyncRef.current = true;
      previousSyncStateRef.current = {
        search,
        selectedUniv,
        selectedCat,
        selectedSubcategory,
        selectedItemType,
        selectedStatus,
        selectedCondition,
        hideSoldOut,
        minPrice,
        maxPrice,
        sortBy,
        currentPage,
        selectedSpecFilters,
      };
      replaceExploreStateInUrl(syncPayload);
      return;
    }

    if (searchOnlyChange) {
      replaceExploreStateInUrl(syncPayload);
    } else {
      pushExploreStateInUrl(syncPayload);
    }

    previousSyncStateRef.current = {
      search,
      selectedUniv,
      selectedCat,
      selectedSubcategory,
      selectedItemType,
      selectedStatus,
      selectedCondition,
      hideSoldOut,
      minPrice,
      maxPrice,
      sortBy,
      currentPage,
      selectedSpecFilters,
    };
  }, [
    search,
    selectedUniv,
    selectedCat,
    selectedSubcategory,
    selectedItemType,
    selectedStatus,
    serializedSpecFilters,
    sortBy,
    selectedCondition,
    hideSoldOut,
    minPrice,
    maxPrice,
    currentPage,
  ]);

  useEffect(() => {
    const syncStateFromUrl = () => {
      const urlState = getExploreStateFromLocation(window.location);
      syncingFromUrlRef.current = true;
      setSearch(urlState.search);
      setSelectedUniv(urlState.university);
      setSelectedCat(
        CATEGORY_QUERY_TO_CANONICAL[urlState.category] ?? urlState.category
      );
      setSelectedSubcategory(urlState.subcategory);
      setSelectedItemType(urlState.itemType);
      setSelectedStatus(urlState.status);
      setSelectedSpecFilters(urlState.specFilters);
      setSortBy(urlState.sortBy);
      setSelectedCondition(urlState.condition);
      setHideSoldOut(urlState.hideSoldOut);
      setMinPrice(urlState.minPrice);
      setMaxPrice(urlState.maxPrice);
      setCurrentPage(urlState.page);
      setUrlSyncCounter((value) => value + 1);
    };

    window.addEventListener("popstate", syncStateFromUrl);
    return () => window.removeEventListener("popstate", syncStateFromUrl);
  }, []);

  useEffect(() => {
    if (urlSyncCounter > 0) {
      syncingFromUrlRef.current = false;
      previousSyncStateRef.current = {
        search,
        selectedUniv,
        selectedCat,
        selectedSubcategory,
        selectedItemType,
        selectedStatus,
        selectedCondition,
        hideSoldOut,
        minPrice,
        maxPrice,
        sortBy,
        currentPage,
        selectedSpecFilters,
      };
    }
  }, [
    urlSyncCounter,
    search,
    selectedUniv,
    selectedCat,
    selectedSubcategory,
    selectedItemType,
    selectedStatus,
    selectedCondition,
    hideSoldOut,
    minPrice,
    maxPrice,
    sortBy,
    currentPage,
    serializedSpecFilters,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(savedStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      setSavedListingIds(Array.isArray(parsed) ? parsed.filter((x) => Number.isInteger(x)) : []);
    } catch {
      setSavedListingIds([]);
    }
  }, [savedStorageKey]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 700);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedUniv) params.append("university", selectedUniv);
      if (selectedCat) params.append("category", selectedCat);
      if (selectedSubcategory) params.append("subcategory", selectedSubcategory);
      if (selectedItemType) params.append("itemType", selectedItemType);
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedCondition) params.append("condition", selectedCondition);
      if (hideSoldOut) params.append("hideSoldOut", "1");
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (search) params.append("search", search);
      if (sortBy) params.append("sortBy", sortBy);
      if (Object.keys(selectedSpecFilters).length > 0) params.append("specFilters", JSON.stringify(selectedSpecFilters));
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setListings(Array.isArray(data.items) ? data.items : []);
      setTotalResults(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));
    } catch (err) {
      console.error("Fetch listings error:", err);
      setListings([]);
      setTotalResults(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedUniv, selectedCat, selectedSubcategory, selectedItemType, selectedStatus, selectedCondition, hideSoldOut, minPrice, maxPrice, search, sortBy, currentPage, pageSize, serializedSpecFilters]);

  const showFeedback = (type: "success" | "error" | "info", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  const askConfirm = ({
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    danger = false,
    onConfirm,
  }: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmState({ open: true, title, message, confirmText, cancelText, danger, onConfirm });
  };

  const hideSellerLocal = (uid: string) => {
    if (!uid || typeof uid !== "string") return;
    setHiddenSellerUids((prev) => {
      if (prev.includes(uid)) return prev;
      const next = [...prev, uid];
      localStorage.setItem("hiddenSellerUids", JSON.stringify(next));
      return next;
    });
  };

  const hideListingLocal = (listingId: number) => {
    if (!Number.isInteger(listingId)) return;
    setHiddenListingIds((prev) => {
      if (prev.includes(listingId)) return prev;
      const next = [...prev, listingId];
      localStorage.setItem("hiddenListingIds", JSON.stringify(next));
      return next;
    });
  };

  const toggleSavedListing = (listingId: number) => {
    if (!firebaseUser) {
      navigateToLogin();
      return;
    }

    setSavedListingIds((prev) => {
      const next = prev.includes(listingId) ? prev.filter((id) => id !== listingId) : [...prev, listingId];
      localStorage.setItem(savedStorageKey, JSON.stringify(next));
      return next;
    });
  };

  const performDeleteListing = async (listingId: number) => {
    try {
      await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });
      fetchListings();
      showFeedback("success", "Listing deleted", "The listing was deleted successfully.");
    } catch (err: any) {
      showFeedback("error", "Delete failed", err?.message || "We could not delete the listing.");
    }
  };

  const handleUpdateListing = async (listingId: number, updated: Partial<Listing>) => {
    const existing = listings.find((l) => l.id === listingId);
    if (!existing) {
      showFeedback("error", "Listing not found", "Refresh the page and try again.");
      return;
    }

    const payload = {
      name: updated.name ?? existing.name,
      price: Number(updated.price ?? existing.price),
      description: updated.description ?? existing.description ?? "",
      category: updated.category ?? existing.category,
      subcategory: updated.subcategory ?? existing.subcategory ?? null,
      item_type: updated.item_type ?? existing.item_type ?? null,
      spec_values: updated.spec_values ?? existing.spec_values ?? {},
      university: updated.university ?? existing.university,
      photos: updated.photos ?? existing.photos ?? [],
      video_url: updated.video_url ?? existing.video_url ?? null,
      whatsapp_number: updated.whatsapp_number ?? existing.whatsapp_number,
      status: updated.status ?? existing.status ?? "available",
      condition: updated.condition ?? existing.condition ?? "used",
      quantity: Number(updated.quantity ?? existing.quantity ?? 1),
      sold_quantity: Number(updated.sold_quantity ?? existing.sold_quantity ?? 0),
    };

    try {
      await apiFetch(`/api/listings/${listingId}`, { method: "PUT", body: JSON.stringify(payload) });
      fetchListings();
      showFeedback("success", "Listing updated", "Your listing was updated successfully.");
      setEditingListing(null);
    } catch (err: any) {
      showFeedback("error", "Update failed", err?.message || "We could not update the listing.");
    }
  };

  const marketFilters: MarketSectionFilters = {
    selectedUniv,
    selectedCat,
    selectedSubcategory,
    selectedItemType,
    selectedSpecFilters,
    selectedStatus,
    selectedCondition,
    hideSoldOut,
    minPrice,
    maxPrice,
    sortBy,
  };

  const marketSetFilters: MarketSectionSetFilters = {
    setSelectedUniv,
    setSelectedCat: handleCategoryChange,
    setSelectedSubcategory,
    setSelectedItemType,
    setSelectedSpecFilters,
    setSelectedStatus,
    setSelectedCondition,
    setHideSoldOut,
    setMinPrice,
    setMaxPrice,
    setSortBy,
  };

  const marketPagination: MarketSectionPagination = {
    currentPage,
    setCurrentPage,
    totalPages,
    totalListingsCount: totalResults,
  };

  const marketActions: MarketSectionActions = {
    onReport: (listingId) => setReportListingId(listingId),
    onDelete: (listingId) => {
      askConfirm({
        title: "Delete listing",
        message: "Are you sure you want to delete this listing?",
        confirmText: "Delete",
        danger: true,
        onConfirm: () => {
          setConfirmState(null);
          void performDeleteListing(listingId);
        },
      });
    },
    onEdit: setEditingListing,
    onHideSeller: hideSellerLocal,
    onHideListing: hideListingLocal,
    onToggleStatus: (listing) =>
      void handleUpdateListing(listing.id, {
        ...listing,
        status: listing.status === "sold" ? "available" : "sold",
      }),
    onToggleSave: toggleSavedListing,
    requireLoginForContact: navigateToLogin,
    onOpenDetails: (listing) => navigateToListingDetails(listing.id),
    onOpenSeller: (uid) => navigateToPath(`/seller/${encodeURIComponent(uid)}`),
  };

  return (
    <div className="min-h-screen pb-20 bg-zinc-100">
      <Header
        searchValue={search}
        onSearch={setSearch}
        onAddListing={handleListItem}
        onProfileClick={navigateToProfile}
        userProfile={userProfile}
        firebaseUser={firebaseUser}
      />

      <main className="max-w-7xl mx-auto px-4">
        <HeroSection onListItem={handleListItem} />
        <MarketSection
          loading={loading}
          listings={listings}
          hiddenSellerUids={hiddenSellerUids}
          hiddenListingIds={hiddenListingIds}
          filters={marketFilters}
          setFilters={marketSetFilters}
          pagination={marketPagination}
          firebaseUserUid={firebaseUser?.uid}
          isLoggedIn={!!firebaseUser}
          savedListingIds={savedListingIds}
          actions={marketActions}
        />
      </main>

      <footer className="mt-20 border-t border-zinc-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-900 rounded-xl flex items-center justify-center text-white font-extrabold text-sm">B</div>
            <span className="text-sm font-bold text-zinc-900">
              <span className="text-red-900">Buy</span>
              <span className="text-zinc-700">Mesho</span> Malawi
            </span>
          </div>
          <div className="flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <button type="button" onClick={() => navigateToPath(PRIVACY_PATH)} className="hover:text-primary transition-colors">Privacy</button>
            <button type="button" onClick={() => navigateToPath(TERMS_PATH)} className="hover:text-primary transition-colors">Terms</button>
            <button type="button" onClick={() => navigateToPath(SAFETY_PATH)} className="hover:text-primary transition-colors">Safety</button>
            <button type="button" onClick={() => navigateToPath(REPORT_PATH)} className="hover:text-primary transition-colors">Report</button>
          </div>
          <div className="text-xs font-bold text-zinc-300">© 2026 Crafted for Students</div>
        </div>
      </footer>

      {reportListingId !== null && <ReportListingModal listingId={reportListingId} onClose={() => setReportListingId(null)} />}

      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={(updated) => handleUpdateListing(editingListing.id, updated)}
          showFeedback={showFeedback}
        />
      )}

      {confirmState && (
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          confirmText={confirmState.confirmText}
          cancelText={confirmState.cancelText}
          danger={confirmState.danger}
          onCancel={() => setConfirmState(null)}
          onConfirm={() => confirmState.onConfirm?.()}
        />
      )}

      {feedback && (
        <FeedbackModal
          open={feedback.open}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[90] h-12 w-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-400/30 flex items-center justify-center transition-all active:scale-95"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
