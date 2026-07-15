import ListingDetailsContent from "./components/listingDetails/ListingDetailsContent";
import { useListingDetailsPage } from "./hooks/useListingDetailsPage";

export default function ListingDetailsPage() {
  const page = useListingDetailsPage();
  return <ListingDetailsContent page={page} />;
}
