import type { Dispatch, SetStateAction } from "react";
import { Loader2, Search } from "lucide-react";
import type { Listing } from "../types";
import FilterSection from "../components/FilterSection";
import ListingCard from "../components/ListingCard";

export type MarketSectionFilters = {
  selectedUniv: string;
  selectedCat: string;
  selectedSubcategory: string;
  selectedItemType: string;
  selectedSpecFilters: Record<string, string | string[] | boolean>;
  selectedStatus: string;
  selectedCondition: string;
  hideSoldOut: boolean;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
};

export type MarketSectionSetFilters = {
  setSelectedUniv: (v: string) => void;
  setSelectedCat: (v: string) => void;
  setSelectedSubcategory: (v: string) => void;
  setSelectedItemType: (v: string) => void;
  setSelectedSpecFilters: Dispatch<SetStateAction<Record<string, string | string[] | boolean>>>;
  setSelectedStatus: (v: string) => void;
  setSelectedCondition: (v: string) => void;
  setHideSoldOut: (v: boolean) => void;
  setMinPrice: (v: string) => void;
  setMaxPrice: (v: string) => void;
  setSortBy: (v: string) => void;
};

export type MarketSectionPagination = {
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  totalListingsCount: number;
};

export type MarketSectionActions = {
  onReport: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (listing: Listing) => void;
  onHideSeller: (uid: string) => void;
  onHideListing: (listingId: number) => void;
  onToggleStatus: (listing: Listing) => void;
  onToggleSave: (listingId: number) => void;
  requireLoginForContact: () => void;
  onOpenDetails: (listing: Listing) => void;
  onOpenSeller: (uid: string) => void;
};

type MarketSectionProps = {
  loading: boolean;
  listings: Listing[];
  hiddenSellerUids: string[];
  hiddenListingIds: number[];
  filters: MarketSectionFilters;
  setFilters: MarketSectionSetFilters;
  pagination: MarketSectionPagination;
  firebaseUserUid?: string;
  isLoggedIn: boolean;
  savedListingIds: number[];
  actions: MarketSectionActions;
};

export default function MarketSection({
  loading,
  listings,
  hiddenSellerUids,
  hiddenListingIds,
  filters,
  setFilters,
  pagination,
  firebaseUserUid,
  isLoggedIn,
  savedListingIds,
  actions,
}: MarketSectionProps) {
  const {
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
  } = filters;
  const {
    setSelectedUniv,
    setSelectedCat,
    setSelectedSubcategory,
    setSelectedItemType,
    setSelectedSpecFilters,
    setSelectedStatus,
    setSelectedCondition,
    setHideSoldOut,
    setMinPrice,
    setMaxPrice,
    setSortBy,
  } = setFilters;
  const { currentPage, setCurrentPage, totalPages, totalListingsCount } = pagination;
  const {
    onReport,
    onDelete,
    onEdit,
    onHideSeller,
    onHideListing,
    onToggleStatus,
    onToggleSave,
    requireLoginForContact,
    onOpenDetails,
    onOpenSeller,
  } = actions;

  const visibleListings = listings.filter(
    (listing) =>
      !hiddenSellerUids.includes(listing.seller_uid) &&
      !hiddenListingIds.includes(listing.id)
  );

  const startItem = visibleListings.length > 0 ? (currentPage - 1) * 12 + 1 : 0;
  const endItem = visibleListings.length > 0 ? startItem + visibleListings.length - 1 : 0;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, currentPage - 3),
    Math.min(totalPages, currentPage + 2)
  );

  const hasActiveFilters =
    Boolean(selectedUniv) ||
    Boolean(selectedCat) ||
    Boolean(selectedSubcategory) ||
    Boolean(selectedItemType) ||
    Boolean(selectedStatus) ||
    Boolean(selectedCondition) ||
    hideSoldOut ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    sortBy !== "newest" ||
    Object.keys(selectedSpecFilters).length > 0;

  const clearAllFilters = () => {
    setSelectedUniv("");
    setSelectedCat("");
    setSelectedSubcategory("");
    setSelectedItemType("");
    setSelectedStatus("");
    setSelectedCondition("");
    setHideSoldOut(false);
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
    setSelectedSpecFilters({});
    setCurrentPage(1);
  };

  return (
    <>
      <FilterSection
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
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedCondition={selectedCondition}
        setSelectedCondition={setSelectedCondition}
        hideSoldOut={hideSoldOut}
        setHideSoldOut={setHideSoldOut}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Listings
          </p>
          <h3 className="mt-2 text-xl font-bold text-zinc-900 flex items-center gap-2">
            Recent listings
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </h3>
        </div>

        <div className="text-xs font-bold text-zinc-400">
          {visibleListings.length > 0
            ? `Showing ${startItem}–${endItem} of ${totalListingsCount} listings`
            : `Showing 0 of ${totalListingsCount} listings`}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-500 font-medium">Loading marketplace...</p>
        </div>
      ) : visibleListings.length > 0 ? (
        <>
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
  {visibleListings.map((listing) => (
    <ListingCard
      key={listing.id}
      listing={listing}
      onReport={onReport}
      currentUid={firebaseUserUid}
      onDelete={onDelete}
      onEdit={onEdit}
      onHideSeller={onHideSeller}
      onHideListing={onHideListing}
      onToggleStatus={onToggleStatus}
      isSaved={savedListingIds.includes(listing.id)}
      onToggleSave={onToggleSave}
      isLoggedIn={isLoggedIn}
      requireLoginForContact={requireLoginForContact}
      onOpenDetails={onOpenDetails}
      onOpenSeller={onOpenSeller}
      compact
      ultraCompact
      showActionsMenu={false}
    />
  ))}
</div>

          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-sm font-bold text-zinc-700 disabled:opacity-50"
              >
                Prev
              </button>

              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border ${
                    currentPage === pageNum
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white text-zinc-700 border-zinc-200"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-sm font-bold text-zinc-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">No listings found</h3>
          <p className="text-zinc-500">
            {hasActiveFilters
              ? "Your current filters may be too restrictive. Remove one filter or clear all to broaden results."
              : "Try adjusting your search terms or check again later for new listings."}
          </p>
          {hasActiveFilters && (
            <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={clearAllFilters}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Start from first page
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
