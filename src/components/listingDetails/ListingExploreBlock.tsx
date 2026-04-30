import type { Listing } from "../../types";
import { navigateToListingDetails, navigateToSellerProfile } from "../../lib/appNavigation";
import { RelatedRailCard, SectionHeading } from "./ListingDetailsShared";

const RELATED_LIMIT = 20;
const SELLER_LIMIT = 6;

export default function ListingExploreBlock({
  sameCampusListings,
  sameCategoryListings,
  sellerOtherListings,
}: {
  sameCampusListings: Listing[];
  sameCategoryListings: Listing[];
  sellerOtherListings: Listing[];
}) {
  const renderTwoRowRail = (title: string, items: Listing[], empty: string) => {
    const visibleItems = items.slice(0, RELATED_LIMIT);

    return (
      <div className="space-y-3 border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>
          <p className="text-sm text-zinc-500">{visibleItems.length} listings</p>
        </div>

        {visibleItems.length ? (
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-flow-col grid-rows-2 gap-3 auto-cols-[11.5rem] sm:auto-cols-[13rem]">
              {visibleItems.map((item) => (
                <div key={item.id} className="h-full">
                  <div className="sm:hidden">
                    <RelatedRailCard
                      item={item}
                      variant="mobile"
                      onOpenDetails={(listing) => navigateToListingDetails(listing.id)}
                      onOpenSeller={navigateToSellerProfile}
                    />
                  </div>
                  <div className="hidden h-full sm:block">
                    <RelatedRailCard
                      item={item}
                      variant="desktop"
                      onOpenDetails={(listing) => navigateToListingDetails(listing.id)}
                      onOpenSeller={navigateToSellerProfile}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
            {empty}
          </div>
        )}
      </div>
    );
  };

  const renderSellerRail = (title: string, items: Listing[], empty: string) => {
    const visibleItems = items.slice(0, SELLER_LIMIT);

    return (
      <div className="space-y-3 border-t border-zinc-200 pt-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>
          <p className="text-sm text-zinc-500">{visibleItems.length} listings</p>
        </div>

        {visibleItems.length ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {visibleItems.map((item) => (
              <div key={item.id} className="w-[11.5rem] shrink-0 sm:w-[13rem]">
                <div className="sm:hidden">
                  <RelatedRailCard
                    item={item}
                    variant="mobile"
                    onOpenDetails={(listing) => navigateToListingDetails(listing.id)}
                    onOpenSeller={navigateToSellerProfile}
                  />
                </div>
                <div className="hidden sm:block h-full">
                  <RelatedRailCard
                    item={item}
                    variant="desktop"
                    onOpenDetails={(listing) => navigateToListingDetails(listing.id)}
                    onOpenSeller={navigateToSellerProfile}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
            {empty}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeading title="Related" />

      {renderTwoRowRail("Same campus", sameCampusListings, "No same-campus listings are available right now.")}

      {renderTwoRowRail("Same category", sameCategoryListings, "No same-category listings are available right now.")}

      {renderSellerRail("Seller's other listings", sellerOtherListings, "This seller does not have any other visible listings yet.")}
    </div>
  );
}
