import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  getExploreStateFromLocation,
  getMarketChipFromLocation,
  navigateToCreateListing,
  navigateToLogin,
  navigateToListingDetails,
  navigateToSellerProfile,
  replaceExploreStateInUrl,
  pushExploreStateInUrl,
} from "../lib/appNavigation";
import { useAuthUser } from "./useAuthUser";
import { useAccountProfile } from "./useAccountProfile";
import { apiFetch } from "../lib/api";
import { Listing } from "../types";
import type { HeaderChip } from "../constants";
import type {
  MarketSectionActions,
  MarketSectionFilters,
  MarketSectionPagination,
  MarketSectionSetFilters,
} from "../sections/MarketSection";

const CATEGORY_QUERY_TO_CANONICAL: Record<string, string> = {
  phones: "Electronics & Gadgets",
  fashion: "Fashion & Clothing",
  books: "Academic Services",
  services: "Academic Services",
};

export type AppLegacyConfirmState = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: (() => void) | null;
};

export type AppLegacyFeedbackState = {
  open: boolean;
  type: "success" | "error" | "info";
  title: string;
  message: string;
};

export type AppLegacyState = {
  listings: Listing[];
  loading: boolean;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  selectedUniv: string;
  setSelectedUniv: Dispatch<SetStateAction<string>>;
  selectedCat: string;
  setSelectedCat: Dispatch<SetStateAction<string>>;
  selectedSubcategory: string;
  setSelectedSubcategory: Dispatch<SetStateAction<string>>;
  selectedItemType: string;
  setSelectedItemType: Dispatch<SetStateAction<string>>;
  selectedStatus: string;
  setSelectedStatus: Dispatch<SetStateAction<string>>;
  selectedSpecFilters: Record<string, string | string[] | boolean>;
  setSelectedSpecFilters: Dispatch<SetStateAction<Record<string, string | string[] | boolean>>>;
  sortBy: string;
  setSortBy: Dispatch<SetStateAction<string>>;
  editingListing: Listing | null;
  setEditingListing: Dispatch<SetStateAction<Listing | null>>;
  reportListingId: number | null;
  setReportListingId: Dispatch<SetStateAction<number | null>>;
  savedListingIds: number[];
  setSavedListingIds: Dispatch<SetStateAction<number[]>>;
  selectedCondition: string;
  setSelectedCondition: Dispatch<SetStateAction<string>>;
  hideSoldOut: boolean;
  setHideSoldOut: Dispatch<SetStateAction<boolean>>;
  minPrice: string;
  setMinPrice: Dispatch<SetStateAction<string>>;
  maxPrice: string;
  setMaxPrice: Dispatch<SetStateAction<string>>;
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  showScrollTop: boolean;
  confirmState: AppLegacyConfirmState | null;
  setConfirmState: Dispatch<SetStateAction<AppLegacyConfirmState | null>>;
  feedback: AppLegacyFeedbackState | null;
  setFeedback: Dispatch<SetStateAction<AppLegacyFeedbackState | null>>;
  hiddenSellerUids: string[];
  setHiddenSellerUids: Dispatch<SetStateAction<string[]>>;
  hiddenListingIds: number[];
  setHiddenListingIds: Dispatch<SetStateAction<number[]>>;
  firebaseUser: ReturnType<typeof useAuthUser>["user"];
  userProfile: ReturnType<typeof useAccountProfile>["profile"];
  activeChip: HeaderChip;
  handleListItem: () => void;
  showFeedback: (type: "success" | "error" | "info", title: string, message: string) => void;
  handleUpdateListing: (listingId: number, updates: Partial<Listing>) => Promise<void>;
  marketFilters: MarketSectionFilters;
  marketSetFilters: MarketSectionSetFilters;
  marketPagination: MarketSectionPagination;
  marketActions: MarketSectionActions;
};

export function useAppLegacyState(): AppLegacyState {
  const initialExploreState = getExploreStateFromLocation(window.location);
  const activeChip = getMarketChipFromLocation(window.location);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialExploreState.search);
  const [selectedUniv, setSelectedUniv] = useState(initialExploreState.university);
  const [selectedCat, setSelectedCat] = useState(
    CATEGORY_QUERY_TO_CANONICAL[initialExploreState.category] ?? initialExploreState.category
  );
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialExploreState.subcategory);
  const [selectedItemType, setSelectedItemType] = useState(initialExploreState.itemType);
  const [selectedStatus, setSelectedStatus] = useState(initialExploreState.status);
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string | string[] | boolean>>(
    initialExploreState.specFilters
  );
  const [sortBy, setSortBy] = useState(initialExploreState.sortBy);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [reportListingId, setReportListingId] = useState<number | null>(null);
  const [savedListingIds, setSavedListingIds] = useState<number[]>([]);
  const [selectedCondition, setSelectedCondition] = useState(initialExploreState.condition);
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
  const serializedSpecFilters = useMemo(() => JSON.stringify(selectedSpecFilters), [selectedSpecFilters]);

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

  const [confirmState, setConfirmState] = useState<AppLegacyConfirmState | null>(null);
  const [feedback, setFeedback] = useState<AppLegacyFeedbackState | null>(null);

  const { user: firebaseUser } = useAuthUser();
  const { profile: userProfile } = useAccountProfile();
  const savedStorageKey = firebaseUser ? `savedListingIds:${firebaseUser.uid}` : "savedListingIds:guest";

  const handleListItem = () => {
    navigateToCreateListing();
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
      setSelectedCat(CATEGORY_QUERY_TO_CANONICAL[urlState.category] ?? urlState.category);
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
      if (Object.keys(selectedSpecFilters).length > 0) {
        params.append("specFilters", JSON.stringify(selectedSpecFilters));
      }
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));

      const res = await fetch(`/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setListings(Array.isArray(data.items) ? data.items : []);

      const parsedTotal = Number(data.total || 0);
      const parsedTotalPages = Number(data.totalPages || 1);
      setTotalResults(Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0);
      setTotalPages(Number.isFinite(parsedTotalPages) && parsedTotalPages >= 1 ? parsedTotalPages : 1);
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

  const handleUpdateListing = async (listingId: number, updates: Partial<Listing>) => {
    try {
      const res = await apiFetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await fetchListings();
      setEditingListing(null);
      showFeedback("success", "Listing updated", "Your changes were saved successfully.");
    } catch (err) {
      console.error("Update listing error:", err);
      showFeedback("error", "Update failed", "We could not save your changes.");
    }
  };

  const performDeleteListing = async (listingId: number) => {
    try {
      const res = await apiFetch(`/api/listings/${listingId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      await fetchListings();
      showFeedback("success", "Listing deleted", "The listing was removed.");
    } catch (err) {
      console.error("Delete listing error:", err);
      showFeedback("error", "Delete failed", "We could not delete the listing.");
    }
  };

  const marketFilters: MarketSectionFilters = {
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
    selectedSpecFilters,
    sortBy,
  };

  const marketSetFilters: MarketSectionSetFilters = {
    setSearch,
    setSelectedUniv,
    setSelectedCat,
    setSelectedSubcategory,
    setSelectedItemType,
    setSelectedStatus,
    setSelectedCondition,
    setHideSoldOut,
    setMinPrice,
    setMaxPrice,
    setSelectedSpecFilters,
    setSortBy,
  };

  const marketPagination: MarketSectionPagination = {
    currentPage,
    setCurrentPage,
    totalPages,
    totalListingsCount: totalResults,
    pageSize,
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
    onOpenDetails: (listing) => navigateToListingDetails(listing.id),
    onOpenSeller: (uid) => navigateToSellerProfile(uid),
  };

  return {
    listings,
    loading,
    search,
    setSearch,
    selectedUniv,
    setSelectedUniv,
    selectedCat,
    setSelectedCat,
    selectedSubcategory,
    setSelectedSubcategory,
    selectedItemType,
    setSelectedItemType,
    selectedStatus,
    setSelectedStatus,
    selectedSpecFilters,
    setSelectedSpecFilters,
    sortBy,
    setSortBy,
    editingListing,
    setEditingListing,
    reportListingId,
    setReportListingId,
    savedListingIds,
    setSavedListingIds,
    selectedCondition,
    setSelectedCondition,
    hideSoldOut,
    setHideSoldOut,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    currentPage,
    setCurrentPage,
    pageSize,
    totalResults,
    totalPages,
    showScrollTop,
    confirmState,
    setConfirmState,
    feedback,
    setFeedback,
    hiddenSellerUids,
    setHiddenSellerUids,
    hiddenListingIds,
    setHiddenListingIds,
    firebaseUser,
    userProfile,
    activeChip,
    handleListItem,
    showFeedback,
    handleUpdateListing,
    marketFilters,
    marketSetFilters,
    marketPagination,
    marketActions,
  };
}
