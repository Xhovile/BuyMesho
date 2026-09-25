import { useEffect } from "react";
import type { AppRoute } from "../lib/appNavigation";

const SEO_BASE_URL = "https://buymesho.app";
const HOMEPAGE_TITLE = "BuyMesho: Malawi's Secure E-commerce Platform";
const HOMEPAGE_DESCRIPTION =
  "BuyMesho is Malawi's secure e-commerce platform for discovering and buying products, services, and tickets from sellers across the country.";
const HOMEPAGE_IMAGE = `${SEO_BASE_URL}/Og-image.webp`;
const HOMEPAGE_KEYWORDS =
  "BuyMesho, Malawi e-commerce, Malawi marketplace, online shopping Malawi, buy and sell Malawi, Malawi sellers, products Malawi, services Malawi, event tickets Malawi";

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  noindex?: boolean;
  keywords?: string;
};

function upsertMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let el = document.head.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function buildSeoConfig(pathname: string, route: AppRoute): SeoConfig {
  const normalizedPathname =
    pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
  const normalizedStudioPath = normalizedPathname.toLowerCase();

  if (route === "listing_reviews") {
    return {
      title: "Listing Reviews — BuyMesho",
      description: "Read ratings and reviews for a BuyMesho marketplace listing.",
      canonicalPath: "/listing/reviews",
      noindex: true,
    };
  }

  if (normalizedStudioPath === "/xhovilestudio" || normalizedStudioPath === "/services/xhovilestudio") {
    return {
      title: "Xhovile Studio — Service Payment",
      description:
        "Submit a Graphic Design or Website Development request and continue to secure payment checkout.",
      canonicalPath: "/xhovilestudio",
    };
  }

  if (normalizedStudioPath === "/xhovilestudio/receipt" || normalizedStudioPath === "/services/xhovilestudio/receipt") {
    return {
      title: "Xhovile Studio — Payment Receipt",
      description: "View and download your Xhovile Studio payment receipt.",
      canonicalPath: "/xhovilestudio/receipt",
      noindex: true,
    };
  }

  if (normalizedStudioPath === "/xhovilestudio/admin" || normalizedStudioPath === "/services/xhovilestudio/admin") {
    return {
      title: "Xhovile Studio — Admin",
      description: "Xhovile Studio administration.",
      canonicalPath: "/xhovilestudio/admin",
      noindex: true,
    };
  }

  switch (normalizedPathname) {
    case "/":
    case "/home":
      return { title: HOMEPAGE_TITLE, description: HOMEPAGE_DESCRIPTION, canonicalPath: "/", keywords: HOMEPAGE_KEYWORDS };
    case "/install":
      return { title: "Install BuyMesho", description: "Install BuyMesho on your phone for fast access to Malawi's secure e-commerce platform.", canonicalPath: "/install" };
    case "/signup":
      return { title: "Create a BuyMesho Account", description: "Join BuyMesho to buy, sell, and manage your marketplace activity.", canonicalPath: "/signup" };
    case "/about":
      return { title: "About BuyMesho — Malawi's Secure E-commerce Platform", description: "Learn what BuyMesho is, who it serves, and how the e-commerce platform works.", canonicalPath: "/about" };
    case "/explore":
      return { title: "Explore BuyMesho Marketplace", description: "Browse listings, deals, sellers, events, and more on BuyMesho.", canonicalPath: "/explore" };
    case "/explore/deals":
      return { title: "BuyMesho Deals", description: "Find current deals and value listings on BuyMesho.", canonicalPath: "/explore/deals" };
    case "/explore/lay-by":
      return { title: "BuyMesho Lay-by", description: "Browse lay-by friendly listings on BuyMesho.", canonicalPath: "/explore/lay-by" };
    case "/explore/events":
      return { title: "BuyMesho Events", description: "Discover public events and event listings on BuyMesho.", canonicalPath: "/explore/events" };
    case "/tickets":
      return { title: "BuyMesho Tickets", description: "View your event tickets, download PDFs, and share passes on WhatsApp.", canonicalPath: "/tickets" };
    case "/explore/wholesale":
      return { title: "BuyMesho Wholesale", description: "Browse wholesale listings and supplier options on BuyMesho.", canonicalPath: "/explore/wholesale" };
    case "/explore/sellers":
      return { title: "BuyMesho Sellers", description: "Browse seller profiles on BuyMesho.", canonicalPath: "/explore/sellers" };
    case "/explore/lending":
      return { title: "BuyMesho Lending", description: "Lending on BuyMesho is coming soon.", canonicalPath: "/explore/lending", noindex: true };
    case "/privacy":
      return { title: "BuyMesho Privacy Policy", description: "Read the BuyMesho privacy policy.", canonicalPath: "/privacy" };
    case "/terms":
      return { title: "BuyMesho Terms of Service", description: "Read the BuyMesho terms of service.", canonicalPath: "/terms" };
    case "/safety":
      return { title: "BuyMesho Safety Tips", description: "Read safety tips for using BuyMesho.", canonicalPath: "/safety" };
    case "/transaction-json":
      return { title: "Transaction JSON — BuyMesho", description: "Deep-link JSON view for transaction debugging.", canonicalPath: "/transaction-json", noindex: true };
    default:
      return {
        title: "BuyMesho",
        description: "BuyMesho marketplace.",
        canonicalPath: normalizedPathname,
        noindex: true,
      };
  }
}

export function useRootRouterSeo(locationPath: string, route: AppRoute) {
  useEffect(() => {
    const seo = buildSeoConfig(locationPath, route);
    const canonicalUrl = `${SEO_BASE_URL}${seo.canonicalPath}`;

    document.title = seo.title;
    upsertMeta("description", seo.description);
    upsertMeta("robots", seo.noindex ? "noindex,nofollow" : "index,follow");
    upsertMeta("application-name", "BuyMesho");
    upsertCanonical(canonicalUrl);

    upsertMeta("og:site_name", "BuyMesho", "property");
    upsertMeta("og:title", seo.title, "property");
    upsertMeta("og:description", seo.description, "property");
    upsertMeta("og:url", canonicalUrl, "property");
    upsertMeta("og:image", HOMEPAGE_IMAGE, "property");
    upsertMeta("og:image:alt", seo.title, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("og:locale", "en_MW", "property");

    upsertMeta("twitter:card", "summary_large_image");
    upsertMeta("twitter:title", seo.title);
    upsertMeta("twitter:description", seo.description);
    upsertMeta("twitter:image", HOMEPAGE_IMAGE);
    upsertMeta("twitter:image:alt", seo.title);

    if (seo.keywords) upsertMeta("keywords", seo.keywords);
  }, [locationPath, route]);
}
