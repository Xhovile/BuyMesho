import type { Listing } from "../../types";
import { navigateToListingDetails, navigateToSellerProfile } from "../../lib/appNavigation";
import { RelatedRailCard, SectionHeading } from "./ListingDetailsShared";

const RELATED_LIMIT = 20;

export default function ListingExploreBlock({
  sameCampusListings,
  sameCategoryListings,
  sellerOtherListings,
}: {
  sameCampusListings: Listing[];
  sameCategoryListings: Listing[];
  sellerOtherListings: Listing[];
}) {
  const renderRelated = (title: string, items: Listing[], empty: string) => {
    const visibleItems = items.slice(0, RELATED_LIMIT);

    return (
      <div className="space-y-3 border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>
          <p className="text-sm text-zinc-500">{visibleItems.length} listings</p>
        </div>

        {visibleItems.length ? (
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-flow-col grid-rows-2 gap-3 auto-cols-[minmax(15rem,18rem)] sm:auto-cols-[minmax(16.5rem,19rem)]">
              {visibleItems.map((item) => (
                <RelatedRailCard
                  key={item.id}
                  item={item}
                  onOpenDetails={(listing) => navigateToListingDetails(listing.id)}
                  onOpenSeller={navigateToSellerProfile}
                />
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

  return (
    <div className="space-y-6">
      <SectionHeading title="Related" />
      {renderRelated("Same campus", sameCampusListings, "No same-campus listings are available right now.")}
      {renderRelated("Same category", sameCategoryListings, "No same-category listings are available right now.")}
      {renderRelated("Seller’s other listings", sellerOtherListings, "This seller does not have any other visible listings yet.")}
    </div>
  );
}
