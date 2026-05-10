import type { HeaderChip } from "../constants";

export type AppRoute =
  | "home"
  | "category"
  | "explore"
  | "saved"
  | "hidden"
  | "settings"
  | "privacy"
  | "terms"
  | "safety"
  | "report"
  | "seller"
  | "listing_details"
  | "messages"
  | "create"
  | "edit"
  | "login"
  | "signup"
  | "forgot_password"
  | "profile"
  | "verify_email"
  | "edit_profile"
  | "edit_account"
  | "become_seller"
  | "change_password"
  | "change_email"
  | "email_action"
  | "my_listings"
  | "admin"
  | "admin_payments"
  | "admin_reports"
  | "admin_seller_applications"
  | "payment_return";

export const HOME_PATH = "/";
export const EXPLORE_PATH = "/explore";
export const SAVED_PATH = "/saved";
export const HIDDEN_PATH = "/hidden";
export const SETTINGS_PATH = "/settings";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
export const SAFETY_PATH = "/safety";
export const REPORT_PATH = "/report";
export const SELLER_PATH = "/seller";
export const LISTING_PATH = "/listing";
export const MESSAGES_PATH = "/messages";
export const CREATE_PATH = "/create";
export const EDIT_PATH = "/edit";
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const PROFILE_PATH = "/profile";
export const VERIFY_EMAIL_PATH = "/verify-email";
export const EDIT_PROFILE_PATH = "/edit-profile";
export const EDIT_ACCOUNT_PATH = "/edit-account";
export const BECOME_SELLER_PATH = "/become-seller";
export const CHANGE_PASSWORD_PATH = "/change-password";
export const CHANGE_EMAIL_PATH = "/change_email";
export const EMAIL_ACTION_PATH = "/email-action";
export const MY_LISTINGS_PATH = "/my-listings";
export const ADMIN_PATH = "/admin";
export const ADMIN_PAYMENTS_PATH = "/admin/payments";
export const ADMIN_REPORTS_PATH = "/admin/reports";
export const ADMIN_SELLER_APPLICATIONS_PATH = "/admin/seller-applications";
export const PAYMENT_RETURN_PATH = "/payment/return";
export const BUYER_PAYMENTS_PATH = "/buyer-payments";
export const CART_PATH = "/cart";

export const MARKET_CHIP_PATHS: Record<HeaderChip, string> = {
  All: EXPLORE_PATH,
  Deals: `${EXPLORE_PATH}/deals`,
  "Lay-by": `${EXPLORE_PATH}/lay-by`,
  Events: `${EXPLORE_PATH}/events`,
  Wholesale: `${EXPLORE_PATH}/wholesale`,
  Accommodation: `${EXPLORE_PATH}/accommodation`,
};

const APP_HISTORY_STATE_KEY = "__buymesho";
const AUTH_RETURN_PATH_STORAGE_KEY = "__buymesho_auth_return_path";

const markAppHistoryState = () => ({ [APP_HISTORY_STATE_KEY]: true });

const sanitizeInternalReturnPath = (value: string | null | undefined) => {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

export const isAppHistoryState = () => {
  const state = window.history.state;
  return !!(state && typeof state === "object" && (state as Record<string, unknown>)[APP_HISTORY_STATE_KEY]);
};

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

const writeExploreStateToUrl = (url: URL, state: Partial<ExploreQueryState>) => {
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

  if (mode === "push") {
    window.history.pushState(markAppHistoryState(), "", url.toString());
  } else {
    window.history.replaceState(markAppHistoryState(), "", url.toString());
  }
};

export const replaceExploreStateInUrl = (state: Partial<ExploreQueryState>) => {
  syncExploreStateInUrl(state, "replace");
};

export const pushExploreStateInUrl = (state: Partial<ExploreQueryState>) => {
  syncExploreStateInUrl(state, "push");
};

export const navigateToMarketChip = (chip: HeaderChip) => {
  navigateToPath(MARKET_CHIP_PATHS[chip]);
};

export const getAppRouteFromLocation = (
  location: Pick<Location, "pathname" | "search">
): AppRoute => {
  const params = new URLSearchParams(location.search);

  if (location.pathname === MESSAGES_PATH) {
    return "messages";
  }

  if (location.pathname === LISTING_PATH && params.has("listing")) {
    return "listing_details";
  }

  if (location.pathname === EDIT_PATH && params.has("id")) {
    return "edit";
  }

  if (location.pathname === "/category" && params.has("category")) {
    return "category";
  }

  if (location.pathname === CREATE_PATH) {
    return "create";
  }

  if (location.pathname === LOGIN_PATH) {
    return "login";
  }

  if (location.pathname === SIGNUP_PATH) {
    return "signup";
  }

  if (location.pathname === FORGOT_PASSWORD_PATH) {
    return "forgot_password";
  }

  if (location.pathname === PROFILE_PATH) {
    return "profile";
  }

  if (location.pathname === VERIFY_EMAIL_PATH) {
    return "verify_email";
  }

  if (location.pathname === EDIT_PROFILE_PATH) {
    return "edit_profile";
  }

  if (location.pathname === EDIT_ACCOUNT_PATH) {
    return "edit_account";
  }

  if (location.pathname === BECOME_SELLER_PATH) {
    return "become_seller";
  }

  if (location.pathname === CHANGE_PASSWORD_PATH) {
    return "change_password";
  }
  
  if (location.pathname === CHANGE_EMAIL_PATH) {
    return "change_email";
  }

  if (location.pathname === EMAIL_ACTION_PATH) {
    return "email_action";
  }
  
  if (location.pathname === MY_LISTINGS_PATH) {
    return "my_listings";
  }

  if (location.pathname === ADMIN_PATH) {
    return "admin";
  }

  if (location.pathname === ADMIN_PAYMENTS_PATH) {
    return "admin_payments";
  }

  if (location.pathname === ADMIN_REPORTS_PATH) {
    return "admin_reports";
  }

  if (location.pathname === ADMIN_SELLER_APPLICATIONS_PATH) {
    return "admin_seller_applications";
  }

  if (location.pathname === PAYMENT_RETURN_PATH) {
    return "payment_return";
  }

  if (location.pathname === SELLER_PATH && params.has("uid")) {
    return "seller";
  }

  if (location.pathname === PRIVACY_PATH) {
    return "privacy";
  }

  if (location.pathname === TERMS_PATH) {
    return "terms";
  }

  if (location.pathname === SAFETY_PATH) {
    return "safety";
  }

  if (location.pathname === REPORT_PATH) {
    return "report";
  }

  if (location.pathname === SETTINGS_PATH) {
    return "settings";
  }

  if (location.pathname === PRIVACY_PATH) {
    return "privacy";
  }

  if (location.pathname === TERMS_PATH) {
    return "terms";
  }

  if (location.pathname === SAFETY_PATH) {
    return "safety";
  }

  if (location.pathname === REPORT_PATH) {
    return "report";
  }

  if (location.pathname === SAVED_PATH) {
    return "saved";
  }

  if (location.pathname === HIDDEN_PATH) {
    return "hidden";
  }

  if (location.pathname === EXPLORE_PATH || location.pathname.startsWith(`${EXPLORE_PATH}/`)) {
    return "explore";
  }

  return "home";
};

export const navigateToPath = (path: string) => {
  const url = new URL(window.location.href);
  url.pathname = path;

  if (path !== EXPLORE_PATH && path !== LISTING_PATH) {
    url.searchParams.delete("listing");
    url.searchParams.delete("image");
  }

  if (path !== SELLER_PATH) {
    url.searchParams.delete("uid");
  }

  if (path !== EDIT_PATH) {
    url.searchParams.delete("id");
  }

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/**
 * Returns the post-authentication route and clears any one-time return target.
 */
export const consumeAuthReturnPath = (fallbackPath: string = PROFILE_PATH) => {
  const params = new URLSearchParams(window.location.search);
  const queryReturnPath = sanitizeInternalReturnPath(params.get("returnTo"));
  if (queryReturnPath) {
    params.delete("returnTo");
    const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", cleaned);
    sessionStorage.removeItem(AUTH_RETURN_PATH_STORAGE_KEY);
    return queryReturnPath;
  }

  const storedReturnPath = sanitizeInternalReturnPath(sessionStorage.getItem(AUTH_RETURN_PATH_STORAGE_KEY));
  sessionStorage.removeItem(AUTH_RETURN_PATH_STORAGE_KEY);
  return storedReturnPath ?? fallbackPath;
};

export type SettingsSection = "privacy" | "terms" | "safety" | "report";

export const navigateToSettingsSection = (section: SettingsSection) => {
  const url = new URL(window.location.href);
  url.pathname = SETTINGS_PATH;
  url.searchParams.set("section", section);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateBackOrPath = (fallbackPath: string) => {
  if (isAppHistoryState()) {
    window.history.back();
    return;
  }

  navigateToPath(fallbackPath);
};

export const navigateToExplore = (state?: Partial<ExploreQueryState>) => {
  const url = new URL(window.location.href);
  url.pathname = EXPLORE_PATH;
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");
  writeExploreStateToUrl(url, state || {});

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToExploreWithCategory = (category: string) => {
  const url = new URL(window.location.href);
  url.pathname = "/category";
  url.searchParams.set("category", category);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToListingDetails = (
  listingId: string | number,
  imageIndex: number = 0
) => {
  const url = new URL(window.location.href);
  url.pathname = LISTING_PATH;
  url.searchParams.set("listing", String(listingId));
  url.searchParams.set("image", String(imageIndex));
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToSellerProfile = (uid: string) => {
  const url = new URL(window.location.href);
  url.pathname = SELLER_PATH;
  url.searchParams.set("uid", uid);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("id");

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToCreateListing = () => {
  const url = new URL(window.location.href);
  url.pathname = CREATE_PATH;
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToEditListing = (listingId: string | number) => {
  const url = new URL(window.location.href);
  url.pathname = EDIT_PATH;
  url.searchParams.set("id", String(listingId));
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");

  window.history.pushState(markAppHistoryState(), "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToProfile = () => navigateToPath(PROFILE_PATH);
export const navigateToLogin = () => navigateToPath(LOGIN_PATH);
export const navigateToSignup = () => navigateToPath(SIGNUP_PATH);
export const navigateToForgotPassword = () => navigateToPath(FORGOT_PASSWORD_PATH);
export const navigateToEditProfile = () => navigateToPath(EDIT_PROFILE_PATH);
export const navigateToEditAccount = () => navigateToPath(EDIT_ACCOUNT_PATH);
export const navigateToBecomeSeller = () => navigateToPath(BECOME_SELLER_PATH);
export const navigateToChangePassword = () => navigateToPath(CHANGE_PASSWORD_PATH);
export const navigateToMyListings = () => navigateToPath(MY_LISTINGS_PATH);
export const navigateToAdmin = () => navigateToPath(ADMIN_PATH);
export const navigateToAdminPayments = () => navigateToPath(ADMIN_PAYMENTS_PATH);
export const navigateToAdminReports = () => navigateToPath(ADMIN_REPORTS_PATH);
export const navigateToAdminSellerApplications = () => navigateToPath(ADMIN_SELLER_APPLICATIONS_PATH);
export const navigateToBuyerPayments = () => navigateToPath(BUYER_PAYMENTS_PATH);
export const navigateToCart = () => navigateToPath(CART_PATH);
export const ORDER_TRACKING_BASE_PATH = "/orders";

export const buildOrderTrackingPath = (reference: string) =>
  `${ORDER_TRACKING_BASE_PATH}/${encodeURIComponent(reference)}`;

export const buildOrderDisputePath = (reference: string) =>
  `${ORDER_TRACKING_BASE_PATH}/${encodeURIComponent(reference)}/dispute`;

export const navigateToOrderTracking = (reference: string) =>
  navigateToPath(buildOrderTrackingPath(reference));

export const navigateToOrderDispute = (reference: string) =>
  navigateToPath(buildOrderDisputePath(reference));
export const getSellerUidFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
};

export const getEditListingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("id");
  return value ? Number(value) : null;
};/ UPDATED FILE WITH ORDER NAVIGATION HELPERS ADDED
