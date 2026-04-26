import type { Listing } from "../../types";
import { navigateToListingDetails, navigateToSellerProfile } from "../../lib/appNavigation";
import { RelatedRailCard, SectionHeading } from "../../../listingDetails/ListingDetailsShared";

export default function ListingExploreBlock({
  sameCampusListings,
  sameCategoryListings,
  sellerOtherListings,
}: {
  sameCampusListings: Listing[];
  sameCategoryListings: Listing[];
  sellerOtherListings: Listing[];
}) {
  const renderRelated = (title: string, items: Listing[], empty: string) => (
    <div className="space-y-3 border-t border-zinc-200 pt-5 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">{items.length} listings</p>
      </div>
      {items.length ? (
        <div className="space-y-0">
          {items.slice(0, 6).map((item) => (
            <RelatedRailCard
              key={item.id}
              item={item}
              onOpenDetails={(listing) => navigateToListingDetails(listing.id)}
              onOpenSeller={navigateToSellerProfile}
            />
          ))}
        </div>
      ) : (
        <div className="border border-dashed border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">
          {empty}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Explore"
        title="Discover more options"
        description="Related listings stay compact and secondary so they support comparison without turning the page into a cluttered marketplace grid."
      />
      {renderRelated("Same campus", sameCampusListings, "No same-campus listings are available right now.")}
      {renderRelated("Same category", sameCategoryListings, "No same-category listings are available right now.")}
      {renderRelated("Seller’s other listings", sellerOtherListings, "This seller does not have any other visible listings yet.")}
    </div>
  );
}
