import type { HeaderChip } from "../constants";
import {
  ADMIN_AUDIT_PATH,
  ADMIN_BALANCE_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_PATH,
  ADMIN_PAYOUT_DESTINATIONS_PATH,
  ADMIN_PAYOUTS_PATH,
  ADMIN_PAYMENTS_PATH,
  ADMIN_REPORTS_PATH,
  ADMIN_SELLER_APPLICATIONS_PATH,
  ADMIN_SETUP_PATH,
  BECOME_SELLER_PATH,
  CHANGE_EMAIL_PATH,
  CHANGE_PASSWORD_PATH,
  CREATE_PATH,
  EDIT_ACCOUNT_PATH,
  EDIT_PATH,
  EDIT_PROFILE_PATH,
  EMAIL_ACTION_PATH,
  EXPLORE_PATH,
  FORGOT_PASSWORD_PATH,
  HIDDEN_PATH,
  LISTING_PATH,
  LOGIN_PATH,
  MARKET_CHIP_PATHS,
  MESSAGES_PATH,
  MY_LISTINGS_PATH,
  PAYMENT_RETURN_PATH,
  PRIVACY_PATH,
  PROFILE_PATH,
  REPORT_PATH,
  SAVED_PATH,
  SAFETY_PATH,
  SELLER_DASHBOARD_PATH,
  SELLER_PATH,
  SELLER_PAYOUTS_PATH,
  SETTINGS_PATH,
  SIGNUP_PATH,
  TERMS_PATH,
  VERIFY_EMAIL_PATH,
  type AppRoute,
} from "./appNavigation.paths";

export type ExploreQueryState = {
  search: string;
  university: string;
  category: string;
  subcategory: string;
  itemType: string;
  status: string;
  condition: string;
  sortBy: string;
  minPrice: string;
  maxPrice: string;
  hideSoldOut: boolean;
  page: number;
  specFilters: Record<string, string | string[] | boolean>;
};

const EXPLORE_QUERY_KEYS = [
  "search",
  "university",
  "category",
  "subcategory",
  "itemType",
  "status",
  "condition",
  "sortBy",
  "minPrice",
  "maxPrice",
  "hideSoldOut",
  "page",
  "specFilters",
] as const;

const DEFAULT_EXPLORE_QUERY_STATE: ExploreQueryState = {
  search: "",
  university: "",
  category: "",
  subcategory: "",
  itemType: "",
  status: "",
  condition: "",
  sortBy: "newest",
  minPrice: "",
  maxPrice: "",
  hideSoldOut: false,
  page: 1,
  specFilters: {},
};

const parsePositiveIntegerParam = (value: string | null, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
};

const parseBooleanParam = (value: string | null) => value === "1" || value === "true";

const parseSpecFiltersParam = (value: string | null) => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string | string[] | boolean>;
    }
  } catch {
    return {};
  }
  return {};
};

export const getExploreStateFromLocation = (
  location: Pick<Location, "search">
): ExploreQueryState => {
  const params = new URLSearchParams(location.search);
  return {
    search: params.get("search") || DEFAULT_EXPLORE_QUERY_STATE.search,
    university: params.get("university") || DEFAULT_EXPLORE_QUERY_STATE.university,
    category: params.get("category") || DEFAULT_EXPLORE_QUERY_STATE.category,
    subcategory: params.get("subcategory") || DEFAULT_EXPLORE_QUERY_STATE.subcategory,
    itemType: params.get("itemType") || DEFAULT_EXPLORE_QUERY_STATE.itemType,
    status: params.get("status") || DEFAULT_EXPLORE_QUERY_STATE.status,
    condition: params.get("condition") || DEFAULT_EXPLORE_QUERY_STATE.condition,
    sortBy: params.get("sortBy") || DEFAULT_EXPLORE_QUERY_STATE.sortBy,
    minPrice: params.get("minPrice") || DEFAULT_EXPLORE_QUERY_STATE.minPrice,
    maxPrice: params.get("maxPrice") || DEFAULT_EXPLORE_QUERY_STATE.maxPrice,
    hideSoldOut: parseBooleanParam(params.get("hideSoldOut")),
    page: parsePositiveIntegerParam(params.get("page"), DEFAULT_EXPLORE_QUERY_STATE.page),
    specFilters: parseSpecFiltersParam(params.get("specFilters")),
  };
};

export const getMarketChipFromPath = (pathname: string): HeaderChip => {
  if (pathname === MARKET_CHIP_PATHS.Deals) return "Deals";
  if (pathname === MARKET_CHIP_PATHS["Lay-by"]) return "Lay-by";
  if (pathname === MARKET_CHIP_PATHS.Events) return "Events";
  if (pathname === MARKET_CHIP_PATHS.Wholesale) return "Wholesale";
  if (pathname === MARKET_CHIP_PATHS.Sellers) return "Sellers";
  if (pathname === MARKET_CHIP_PATHS.Innovation) return "Innovation";
  if (pathname === MARKET_CHIP_PATHS.Accommodation) return "Accommodation";
  return "All";
};

export const getMarketChipFromLocation = (
  location: Pick<Location, "pathname">
): HeaderChip => getMarketChipFromPath(location.pathname);

export const getMarketPathFromLocation = (pathname: string) => {
  if (pathname === EXPLORE_PATH) return EXPLORE_PATH;
  if (pathname.startsWith(`${EXPLORE_PATH}/`)) return pathname;
  return EXPLORE_PATH;
};

export const writeExploreStateToUrl = (url: URL, state: Partial<ExploreQueryState>) => {
  EXPLORE_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));

  if (state.search) url.searchParams.set("search", state.search);
  if (state.university) url.searchParams.set("university", state.university);
  if (state.category) url.searchParams.set("category", state.category);
  if (state.subcategory) url.searchParams.set("subcategory", state.subcategory);
  if (state.itemType) url.searchParams.set("itemType", state.itemType);
  if (state.status) url.searchParams.set("status", state.status);
  if (state.condition) url.searchParams.set("condition", state.condition);
  if (state.sortBy && state.sortBy !== "newest") url.searchParams.set("sortBy", state.sortBy);
  if (state.minPrice) url.searchParams.set("minPrice", state.minPrice);
  if (state.maxPrice) url.searchParams.set("maxPrice", state.maxPrice);
  if (state.hideSoldOut) url.searchParams.set("hideSoldOut", "1");
  if (state.page && state.page > 1) url.searchParams.set("page", String(state.page));
  if (state.specFilters && Object.keys(state.specFilters).length > 0) {
    url.searchParams.set("specFilters", JSON.stringify(state.specFilters));
  }
};

const pushUrl = (url: URL, replace = false) => {
  if (replace) {
    window.history.replaceState({ __buymesho: true }, "", url.toString());
  } else {
    window.history.pushState({ __buymesho: true }, "", url.toString());
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

const syncExploreStateInUrl = (
  state: Partial<ExploreQueryState>,
  mode: "replace" | "push" = "replace"
) => {
  const url = new URL(window.location.href);
  url.pathname = getMarketPathFromLocation(window.location.pathname);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");
  writeExploreStateToUrl(url, state);
  pushUrl(url, mode === "replace");
};

export const replaceExploreStateInUrl = (state: Partial<ExploreQueryState>) => {
  syncExploreStateInUrl(state, "replace");
};

export const pushExploreStateInUrl = (state: Partial<ExploreQueryState>) => {
  syncExploreStateInUrl(state, "push");
};

export const navigateToMarketChip = (chip: HeaderChip) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.pathname = MARKET_CHIP_PATHS[chip];
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");
  pushUrl(url);
};

export const navigateToExploreWithCategory = (category: string) => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.pathname = "/category";
  url.searchParams.set("category", category);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");
  pushUrl(url);
};

export const getAppRouteFromLocation = (
  location: Pick<Location, "pathname" | "search">
): AppRoute => {
  const params = new URLSearchParams(location.search);

  if (location.pathname === MESSAGES_PATH) return "messages";
  if (location.pathname === LISTING_PATH && params.has("listing")) return "listing_details";
  if (location.pathname === EDIT_PATH && params.has("id")) return "edit";
  if (location.pathname === "/category" && params.has("category")) return "category";
  if (location.pathname === CREATE_PATH) return "create";
  if (location.pathname === LOGIN_PATH) return "login";
  if (location.pathname === SIGNUP_PATH) return "signup";
  if (location.pathname === FORGOT_PASSWORD_PATH) return "forgot_password";
  if (location.pathname === PROFILE_PATH) return "profile";
  if (location.pathname === VERIFY_EMAIL_PATH) return "verify_email";
  if (location.pathname === EDIT_PROFILE_PATH) return "edit_profile";
  if (location.pathname === EDIT_ACCOUNT_PATH) return "edit_account";
  if (location.pathname === BECOME_SELLER_PATH) return "become_seller";
  if (location.pathname === CHANGE_PASSWORD_PATH) return "change_password";
  if (location.pathname === CHANGE_EMAIL_PATH) return "change_email";
  if (location.pathname === EMAIL_ACTION_PATH) return "email_action";
  if (location.pathname === MY_LISTINGS_PATH) return "my_listings";
  if (location.pathname === SELLER_PAYOUTS_PATH) return "seller_payouts";
  if (location.pathname === SELLER_DASHBOARD_PATH) return "seller_dashboard";
  if (location.pathname === ADMIN_PATH) return "admin";
  if (location.pathname === ADMIN_PAYMENTS_PATH) return "admin_payments";
  if (location.pathname === ADMIN_PAYOUTS_PATH) return "admin_payouts";
  if (location.pathname === ADMIN_REPORTS_PATH) return "admin_reports";
  if (location.pathname === ADMIN_SELLER_APPLICATIONS_PATH) return "admin_seller_applications";
  if (location.pathname === ADMIN_MODERATION_QUEUE_PATH) return "admin_moderation_queue";
  if (location.pathname === ADMIN_AUDIT_PATH) return "admin_audit";
  if (location.pathname === ADMIN_SETUP_PATH) return "admin_setup";
  if (location.pathname === ADMIN_BALANCE_PATH) return "admin_balance";
  if (location.pathname === PAYMENT_RETURN_PATH) return "payment_return";
  if (location.pathname === SELLER_PATH && params.has("uid")) return "seller";
  if (location.pathname === PRIVACY_PATH) return "privacy";
  if (location.pathname === TERMS_PATH) return "terms";
  if (location.pathname === SAFETY_PATH) return "safety";
  if (location.pathname === REPORT_PATH) return "report";
  if (location.pathname === SETTINGS_PATH) return "settings";
  if (location.pathname === SAVED_PATH) return "saved";
  if (location.pathname === HIDDEN_PATH) return "hidden";
  if (location.pathname === EXPLORE_PATH || location.pathname.startsWith(`${EXPLORE_PATH}/`)) return "explore";
  if (location.pathname === ADMIN_PAYOUT_DESTINATIONS_PATH) return "admin_payout_destinations";
  return "home";
};
