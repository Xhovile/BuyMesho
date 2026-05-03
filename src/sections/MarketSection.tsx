import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Funnel, Loader2, Search } from "lucide-react";
import type { Listing } from "../types";
import FilterSection from "../components/FilterSection";
import ListingCard from "../components/ListingCard";
import type { HeaderChip } from "../constants";

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
  pageSize: number;
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
  activeChip?: HeaderChip;
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
  activeChip = "All",
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

  const { currentPage, setCurrentPage, totalPages, totalListingsCount, pageSize } = pagination;

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

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const matchesChip = (listing: Listing) => {
  if (activeChip === "Deals") {
    return (
      listing.listing_mode === "deal" ||
      Boolean(
        (listing.original_price && listing.original_price > listing.price) ||
          (listing.discount_percent && listing.discount_percent > 0)
      )
    );
  }

  if (activeChip === "Wholesale") {
    return (
      listing.listing_mode === "wholesale" ||
      Boolean(listing.is_wholesale) ||
      Boolean(listing.pack_size && listing.pack_size > 1)
    );
  }

  return true;
};

  const visibleListings = listings.filter((listing) => {
    const notHidden =
      !hiddenSellerUids.includes(listing.seller_uid) &&
      !hiddenListingIds.includes(listing.id);

    if (!notHidden) return false;
    if (!matchesChip(listing)) return false;

    return true;
  });

  const startItem = visibleListings.length > 0 ? (currentPage - 1) * pageSize + 1 : 0;
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
        showMoreFilters={showMoreFilters}
        setShowMoreFilters={setShowMoreFilters}
      />

      <div className="mb-2 grid grid-cols-[1fr_auto] items-end gap-2">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Listings
          </p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-zinc-900 sm:text-xl">
            Recent listings
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setShowMoreFilters((prev) => !prev)}
          className="inline-flex h-[48px] items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-sm font-extrabold text-zinc-900 shadow-sm md:hidden"
        >
          <Funnel className="h-4 w-4" />
          Filters
        </button>

        <div className="col-span-2 text-xs font-bold text-zinc-400">
          {visibleListings.length > 0
            ? `Showing ${startItem}–${endItem} of ${totalListingsCount} listings`
            : `Showing 0 of ${totalListingsCount} listings`}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="font-medium text-zinc-500">Loading marketplace...</p>
        </div>
      ) : visibleListings.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 disabled:opacity-50"
              >
                Prev
              </button>

              {pageNumbers.map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold ${
                    currentPage === pageNum
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100">
            <Search className="h-8 w-8 text-zinc-300" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900">No listings found</h3>
          <p className="text-zinc-500">
            {hasActiveFilters
              ? "Your current filters may be too restrictive. Remove one filter or clear all to broaden results."
              : "Try adjusting your search terms or check again later for new listings."}
          </p>
          {hasActiveFilters && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-800"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
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
