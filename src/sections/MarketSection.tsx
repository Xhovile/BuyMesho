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
  sortBy: string;
  setSortBy: (v: string) => void;
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
  sortBy,
  setSortBy,
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

  return (
    <>
      <FilterSection
        selectedUniv={selectedUniv}
        setSelectedUniv={setSelectedUniv}
        selectedCat={selectedCat}
        setSelectedCat={setSelectedCat}
        sortBy={sortBy}
        setSortBy={setSortBy}
      />

      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          Recent Listings
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        </h3>
        <div className="text-xs font-bold text-zinc-400">
          Showing {listings.length} items
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-zinc-500 font-medium">Loading marketplace...</p>
        </div>
      ) : visibleListings.length > 0 ? (
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
