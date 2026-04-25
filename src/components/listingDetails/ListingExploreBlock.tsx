import type { Listing } from "../../types";
import { navigateToListingDetails, navigateToSellerProfile } from "../../lib/appNavigation";
import { RelatedRailCard, SectionHeading } from "./ListingDetailsShared";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black tracking-tight text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-500">{items.length} listings</p>
      </div>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <RelatedRailCard
              key={item.id}
              item={item}
              onOpenDetails={navigateToListingDetails}
              onOpenSeller={navigateToSellerProfile}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-200 bg-zinc-50/70 p-6 text-sm text-zinc-500">{empty}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
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
