import { useEffect, useMemo, useState, type ReactNode } from "react";
import Header from "./Header";
import CategoryPage from "../CategoryPage";
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

  const isCategoryRoute = location.pathname === "/category" && isMarketplace;

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

          {isCategoryRoute ? (
            <style>{`
              .buymesho-category-route .buymesho-category-hero-badge {
                display: none !important;
              }

              .buymesho-category-route .buymesho-category-home-button {
                display: none !important;
              }

              .buymesho-category-route .buymesho-category-sell-button {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                border: 0;
                border-radius: 1rem;
                background: rgb(24 24 27);
                padding: 0.75rem 1.25rem;
                font-size: 0.875rem;
                font-weight: 800;
                line-height: 1.25rem;
                color: white;
                box-shadow: 0 16px 32px -14px rgba(0,0,0,0.45);
                transition: transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
              }

              .buymesho-category-route .buymesho-category-sell-button:hover {
                transform: translateY(-2px);
                background: rgb(39 39 42);
                box-shadow: 0 20px 40px -14px rgba(0,0,0,0.5);
              }

              .buymesho-category-route .buymesho-category-sell-button:active {
                transform: translateY(0);
              }

              .buymesho-category-route .buymesho-category-sell-button svg {
                display: none;
              }

              .buymesho-category-route .buymesho-category-sell-button::before {
                content: "+";
                display: inline-block;
                font-size: 1.125rem;
                font-weight: 400;
                line-height: 1;
              }
            `}</style>
          ) : null}
        </>
      ) : null}

      <div className={`${isMarketplace ? "buymesho-marketplace-route-content" : ""}${isCategoryRoute ? " buymesho-category-route" : ""}`}>
        {isCategoryRoute ? <CategoryPage key={location.search} /> : children}
      </div>
    </div>
  );
}
