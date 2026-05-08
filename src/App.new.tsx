import { useEffect } from "react";
import LegacyExploreApp from "./AppLegacy";
import { getListingParamsFromUrl } from "./lib/listingUrl";
import { EXPLORE_PATH, navigateToListingDetails } from "./lib/appNavigation";

type AppProps = {
  locationPath?: string;
};

export default function App(_props: AppProps) {
  useEffect(() => {
    const redirectLegacyExploreListing = () => {
      const { listing, imageIndex } = getListingParamsFromUrl();
      if (window.location.pathname === EXPLORE_PATH && listing) {
        navigateToListingDetails(listing, imageIndex);
      }
    };

    redirectLegacyExploreListing();
    window.addEventListener("popstate", redirectLegacyExploreListing);

    return () => {
      window.removeEventListener("popstate", redirectLegacyExploreListing);
    };
  }, []);

  return <LegacyExploreApp />;
}
