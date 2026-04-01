import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "./components/ConfirmModal";
import FeedbackModal from "./components/FeedbackModal";
import Header from "./components/Header";
import EditListingModal from "./components/EditListingModal";
import ReportListingModal from "./components/ReportListingModal";
import HeroSection from "./sections/HeroSection";
import MarketSection from "./sections/MarketSection";
import { Listing } from "./types";
import {
  BECOME_SELLER_PATH,
  navigateToCreateListing,
  navigateToLogin,
  navigateToPath,
  navigateToProfile,
} from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { apiFetch } from "./lib/api";

export default function App() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUniv, setSelectedUniv] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [selectedItemType, setSelectedItemType] = useState("");
  const [selectedSpecFilters, setSelectedSpecFilters] = useState<Record<string, string | string[] | boolean>>({});
  const [sortBy, setSortBy] = useState("newest");
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [reportListingId, setReportListingId] = useState<number | null>(null);
  const [savedListingIds, setSavedListingIds] = useState<number[]>([]);
  const [selectedCondition, setSelectedCondition] = useState("");
  const [hideSoldOut, setHideSoldOut] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const handleStartSelling = () => {
    if (!firebaseUser) {
      navigateToLogin();
      return;
    }

    if (!userProfile?.is_seller) {
      navigateToPath(BECOME_SELLER_PATH);
      return;
    }

    navigateToCreateListing();
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUniv, selectedCat, selectedSubcategory, selectedItemType, selectedCondition, hideSoldOut, minPrice, maxPrice, search, sortBy, selectedSpecFilters]);

  useEffect(() => {
    setSelectedSpecFilters({});
  }, [selectedCat, selectedSubcategory, selectedItemType]);

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
  }, [selectedUniv, selectedCat, selectedSubcategory, selectedItemType, selectedCondition, hideSoldOut, minPrice, maxPrice, search, sortBy, currentPage, pageSize, selectedSpecFilters]);

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

  return (
    <div className="min-h-screen pb-20 bg-zinc-100">
      <Header
        onSearch={setSearch}
        onAddListing={handleStartSelling}
        onProfileClick={navigateToProfile}
        userProfile={userProfile}
        firebaseUser={firebaseUser}
      />

      <main className="max-w-7xl mx-auto px-4">
        <HeroSection onStartSelling={handleStartSelling} />
        <MarketSection
          loading={loading}
          listings={listings}
          hiddenSellerUids={hiddenSellerUids}
          hiddenListingIds={hiddenListingIds}
          selectedUniv={selectedUniv}
          setSelectedUniv={setSelectedUniv}
          selectedCat={selectedCat}
          setSelectedCat={setSelectedCat}
          selectedSubcategory={selectedSubcategory}
          setSelectedSubcategory={setSelectedSubcategory}
          selectedItemType={selectedItemType}
          setSelectedItemType={setSelectedItemType}
          selectedSpecFilters={selectedSpecFilters}
          setSelectedSpecFilters={setSelectedSpecFilters}
          sortBy={sortBy}
          setSortBy={setSortBy}
          firebaseUserUid={firebaseUser?.uid}
          isLoggedIn={!!firebaseUser}
          savedListingIds={savedListingIds}
          onReport={(listingId) => setReportListingId(listingId)}
          onDelete={(listingId) => {
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
          }}
          onEdit={setEditingListing}
          onHideSeller={hideSellerLocal}
          onHideListing={hideListingLocal}
          onToggleStatus={(listing) => void handleUpdateListing(listing.id, { ...listing, status: listing.status === "sold" ? "available" : "sold" })}
          onToggleSave={toggleSavedListing}
          requireLoginForContact={navigateToLogin}
          selectedCondition={selectedCondition}
          setSelectedCondition={setSelectedCondition}
          hideSoldOut={hideSoldOut}
          setHideSoldOut={setHideSoldOut}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          totalListingsCount={totalResults}
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
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
            <button type="button" onClick={() => navigateToPath("/settings")} className="hover:text-primary transition-colors">Privacy</button>
            <button type="button" onClick={() => navigateToPath("/settings")} className="hover:text-primary transition-colors">Terms</button>
            <button type="button" onClick={() => navigateToPath("/settings")} className="hover:text-primary transition-colors">Safety</button>
            <button type="button" onClick={() => navigateToPath("/settings")} className="hover:text-primary transition-colors">Contact</button>
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
