import { cloneElement, ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import Header from "./Header";
import { useAccountProfile } from "../hooks/useAccountProfile";
import { useAuthUser } from "../hooks/useAuthUser";
import type { HeaderChip } from "../constants";
import {
  BECOME_SELLER_PATH,
  EVENTS_CREATE_PATH,
  EVENTS_MANAGE_PATH,
  EVENTS_PATH,
  EXPLORE_PATH,
  navigateToCreateListing,
  navigateToMarketChip,
  navigateToPath,
  navigateToProfile,
  replaceExploreStateInUrl,
  getMarketChipFromPath,
} from "../lib/appNavigation";

type MarketplaceShellProps = {
  children: ReactNode;
};

const CATEGORY_CHIP_BY_KEY: Record<string, HeaderChip> = {
  phones: "Gadgets",
  fashion: "Fashion",
  books: "Academics",
  food: "Food",
  beauty: "Beauty",
};

function isPersistentMarketplacePath(pathname: string, search: string) {
  if (pathname === "/category") return true;
  if (!(pathname === EXPLORE_PATH || pathname.startsWith(`${EXPLORE_PATH}/`))) return false;

  const params = new URLSearchParams(search);
  if (pathname === EVENTS_PATH && params.has("event")) return false;
  if (pathname === EVENTS_CREATE_PATH || pathname === EVENTS_MANAGE_PATH) return false;

  return true;
}

function getCategoryChip(search: string): HeaderChip {
  const category = new URLSearchParams(search).get("category") || "phones";
  return CATEGORY_CHIP_BY_KEY[category] || "Gadgets";
}

function getContentKey(pathname: string, search: string) {
  if (pathname === "/category") {
    return `category:${new URLSearchParams(search).get("category") || "phones"}`;
  }

  if (pathname === EXPLORE_PATH || pathname.startsWith(`${EXPLORE_PATH}/`)) {
    return `explore:${pathname}`;
  }

  return "marketplace";
}

export default function MarketplaceShell({ children }: MarketplaceShellProps) {
  const { user: firebaseUser } = useAuthUser();
  const { profile } = useAccountProfile();
  const [location, setLocation] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));
  const [searchValue, setSearchValue] = useState(() => {
    return new URLSearchParams(window.location.search).get("search") || "";
  });

  useEffect(() => {
    const handleRouteChange = () => {
      const nextLocation = {
        pathname: window.location.pathname,
        search: window.location.search,
      };
      setLocation(nextLocation);
      setSearchValue(new URLSearchParams(nextLocation.search).get("search") || "");
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  const isMarketplace = useMemo(
    () => isPersistentMarketplacePath(location.pathname, location.search),
    [location.pathname, location.search]
  );

  const activeChip = useMemo<HeaderChip>(() => {
    if (location.pathname === "/category") {
      return getCategoryChip(location.search);
    }
    return getMarketChipFromPath(location.pathname);
  }, [location.pathname, location.search]);

  const handleSearch = (value: string) => {
    setSearchValue(value);

    if (!location.pathname.startsWith(`${EXPLORE_PATH}/`) && location.pathname !== EXPLORE_PATH) {
      return;
    }

    replaceExploreStateInUrl({
      search: value.trim(),
      page: 1,
    });
  };

  const handleAddListing = () => {
    if (firebaseUser && profile?.is_seller) {
      navigateToCreateListing();
      return;
    }

    navigateToPath(BECOME_SELLER_PATH);
  };

  const contentKey = getContentKey(location.pathname, location.search);
  const keyedChildren = isMarketplace && isReactElement(children)
    ? cloneElement(children, { key: contentKey })
    : children;

  return (
    <div className={isMarketplace ? "min-h-screen buymesho-marketplace-shell" : "min-h-screen"}>
      {isMarketplace ? (
        <>
          <Header
            searchValue={searchValue}
            onSearch={handleSearch}
            onAddListing={handleAddListing}
            onProfileClick={navigateToProfile}
            userProfile={profile}
            firebaseUser={firebaseUser}
            activeChip={activeChip}
            subtitle={activeChip.toLowerCase()}
            onChipChange={navigateToMarketChip}
          />

          <style>{`
            .buymesho-marketplace-shell .buymesho-marketplace-route-content > .min-h-screen > nav {
              display: none !important;
            }
          `}</style>
        </>
      ) : null}

      <div className={isMarketplace ? "buymesho-marketplace-route-content" : undefined}>
        {keyedChildren}
      </div>
    </div>
  );
}

function isReactElement(value: ReactNode): value is ReactElement {
  return !!value && typeof value === "object" && "type" in value && "props" in value;
}
