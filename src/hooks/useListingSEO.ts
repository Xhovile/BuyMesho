import { useEffect } from "react";
import type { Listing } from "../types";
import { getSEOForListing, resetSEOMetaTags, updateSEOMetaTags, type SEOConfig } from "../lib/seo";

/**
 * Custom hook to dynamically inject and manage SEO meta tags & Product JSON-LD schema
 * for product pages and custom views. Automatically restores default meta tags when unmounted.
 */
export function useListingSEO(listing: Listing | null, sellerName?: string) {
  useEffect(() => {
    if (!listing) return;

    const seoConfig = getSEOForListing(listing, sellerName);
    updateSEOMetaTags(seoConfig);

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
