import { Loader2, Search } from "lucide-react";
import type { Listing } from "../types";
import FilterSection from "../components/FilterSection";
import ListingCard from "../components/ListingCard";

type MarketSectionProps = {
  loading: boolean;
  listings: Listing[];
  hiddenSellerUids: string[];
  selectedUniv: string;
  setSelectedUniv: (v: string) => void;
  selectedCat: string;
  setSelectedCat: (v: string) => void;
  selectedCondition: string;
  setSelectedCondition: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  currentPage: number;
  setCurrentPage: (v: number) => void;
  totalPages: number;
  totalListingsCount: number;
  firebaseUserUid?: string;
  isLoggedIn: boolean;
  savedListingIds: number[];
  onReport: (id: number) => void;
  onDelete: (id: number) => void;
  onOpenProfile: (uid: string) => void;
  onEdit: (listing: Listing) => void;
  onOpenDetails: (listing: Listing, startIndex?: number) => void;
  onHideSeller: (uid: string) => void;
  onToggleStatus: (listing: Listing) => void;
  onToggleSave: (listingId: number) => void;
  requireLoginForContact: () => void;
};

export default function MarketSection({
  loading,
  listings,
  hiddenSellerUids,
  selectedUniv,
  setSelectedUniv,
  selectedCat,
  setSelectedCat,
  selectedCondition,
  setSelectedCondition,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  sortBy,
  setSortBy,
  currentPage,
  setCurrentPage,
  totalPages,
  totalListingsCount,
  firebaseUserUid,
  isLoggedIn,
  savedListingIds,
  onReport,
  onDelete,
  onOpenProfile,
  onEdit,
  onOpenDetails,
  onHideSeller,
  onToggleStatus,
  onToggleSave,
  requireLoginForContact,
}: MarketSectionProps) {
  const visibleListings = listings.filter(
    (l) => !hiddenSellerUids.includes(l.seller_uid)
  );

  const startItem =
    visibleListings.length > 0 ? (currentPage - 1) * 12 + 1 : 0;
  const endItem =
    visibleListings.length > 0
      ? startItem + visibleListings.length - 1
      : 0;

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, currentPage - 3),
    Math.min(totalPages, currentPage + 2)
  );

  return (
    <>
      <FilterSection
        selectedUniv={selectedUniv}
        setSelectedUniv={setSelectedUniv}
        selectedCat={selectedCat}
        setSelectedCat={setSelectedCat}
        selectedCondition={selectedCondition}
        setSelectedCondition={setSelectedCondition}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          Recent Listings
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </h3>

        <div className="text-xs font-bold text-zinc-400">
          {totalListingsCount > 0
            ? `Showing ${startItem}-${endItem} of ${totalListingsCount} items`
            : "Showing 0 items"}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-500 font-medium">Loading marketplace...</p>
        </div>
      ) : visibleListings.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onReport={onReport}
                currentUid={firebaseUserUid}
                onDelete={onDelete}
                onOpenProfile={onOpenProfile}
                onEdit={onEdit}
                onOpenDetails={onOpenDetails}
                onHideSeller={onHideSeller}
                onToggleStatus={onToggleStatus}
                isSaved={savedListingIds.includes(listing.id)}
                onToggleSave={onToggleSave}
                isLoggedIn={isLoggedIn}
                requireLoginForContact={requireLoginForContact}
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
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
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
          <p className="text-zinc-500">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </>
  );
 }
