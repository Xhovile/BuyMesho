import { useEffect, useRef } from "react";
import type { Listing } from "../types";
import { getSEOForListing, resetSEOMetaTags, updateSEOMetaTags, type SEOConfig } from "../lib/seo";
import { trackPublicPageView } from "../lib/analytics";

/**
 * Custom hook to dynamically inject and manage SEO meta tags & Product JSON-LD schema
 * for product pages and custom views. Automatically restores default meta tags when unmounted.
 */
export function useListingSEO(listing: Listing | null, sellerName?: string) {
  const trackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!listing) {
      trackedPathRef.current = null;
      updateSEOMetaTags({
        title: "Listing unavailable | BuyMesho",
        description: "This BuyMesho marketplace listing is unavailable or could not be loaded.",
        url: typeof window !== "undefined" ? window.location.href : undefined,
        noIndex: true,
      });

      return () => {
        resetSEOMetaTags();
      };
    }

    const seoConfig = getSEOForListing(listing, sellerName);
    updateSEOMetaTags(seoConfig);

    if (typeof window !== "undefined" && !seoConfig.noIndex) {
      const urlListingId = new URLSearchParams(window.location.search).get("listing")?.trim();
      const listingPath = `/listing?listing=${encodeURIComponent(String(listing.id))}`;

      if (urlListingId === String(listing.id) && trackedPathRef.current !== listingPath) {
        trackPublicPageView({
          pathname: listingPath,
          route: "listing_details",
        });
        trackedPathRef.current = listingPath;
      }
    }

    return () => {
      resetSEOMetaTags();
    };
  }, [listing, sellerName]);
}

/**
 * Custom hook to apply general custom SEO config
 */
export function usePageSEO(config: Partial<SEOConfig>) {
  useEffect(() => {
    updateSEOMetaTags(config);

    return () => {
      resetSEOMetaTags();
    };
  }, [config.title, config.description, config.image, config.url]);
}
