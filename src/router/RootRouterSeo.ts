import { useEffect } from "react";
import type { AppRoute } from "../lib/appNavigation";
import { getRouteSEO, updateSEOMetaTags, type RouteSEOConfig } from "../lib/seo";

export function useRootRouterSeo(locationPath: string, route: AppRoute) {
  useEffect(() => {
    const seo: RouteSEOConfig = getRouteSEO(locationPath, route);

    // Dedicated page components such as category and listing detail pages
    // own their final SEO metadata. The root router must not overwrite it.
    if (seo.managedByPage) return;

    updateSEOMetaTags({
      title: seo.title,
      description: seo.description,
      url: `https://buymesho.app${seo.canonicalPath}`,
      noIndex: seo.noIndex,
      keywords: seo.keywords
        ? seo.keywords.split(",").map((keyword) => keyword.trim()).filter(Boolean)
        : undefined,
      type: seo.type,
      image: seo.image,
      imageAlt: seo.imageAlt,
    });
  }, [locationPath, route]);
}
