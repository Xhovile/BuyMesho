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
  AUTH_RETURN_PATH_STORAGE_KEY,
  BECOME_SELLER_PATH,
  BUYER_PAYMENTS_PATH,
  CART_PATH,
  CHANGE_EMAIL_PATH,
  CHANGE_PASSWORD_PATH,
  CREATE_PATH,
  DISPUTES_PATH,
  EDIT_ACCOUNT_PATH,
  EDIT_PATH,
  EDIT_PROFILE_PATH,
  EMAIL_ACTION_PATH,
  EXPLORE_PATH,
  FORGOT_PASSWORD_PATH,
  HIDDEN_PATH,
  HOME_PATH,
  isAppHistoryState,
  LISTING_PATH,
  LOGIN_PATH,
  markAppHistoryState,
  MESSAGES_PATH,
  MY_LISTINGS_PATH,
  ORDER_TRACKING_BASE_PATH,
  PAYMENT_METHOD_PATH,
  PAYMENT_RETURN_PATH,
  PAYMENTS_HUB_PATH,
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
  TRACK_ORDER_PATH,
  VERIFY_EMAIL_PATH,
  sanitizeInternalReturnPath,
} from "./appNavigation.paths";
import { writeExploreStateToUrl, type ExploreQueryState } from "./appNavigation.query";

const hasWindow = () => typeof window !== "undefined";

const getCurrentAppPath = () =>
  `${window.location.pathname}${window.location.search}${window.location.hash}`;

export function navigateToPath(path: string, options?: { replace?: boolean }) {
  if (!hasWindow()) return;
  const url = new URL(path, window.location.href);

  if (url.pathname !== EXPLORE_PATH && url.pathname !== LISTING_PATH) {
    url.searchParams.delete("listing");
    url.searchParams.delete("image");
  }

  if (url.pathname !== SELLER_PATH) {
    url.searchParams.delete("uid");
  }

  if (url.pathname !== EDIT_PATH) {
    url.searchParams.delete("id");
  }

  if (options?.replace) {
    window.history.replaceState(markAppHistoryState(), "", url.toString());
  } else {
    window.history.pushState(markAppHistoryState(), "", url.toString());
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export const navigateBackOrPath = (fallbackPath: string) => {
  if (!hasWindow()) return;
  if (isAppHistoryState()) {
    window.history.back();
    return;
  }
  navigateToPath(fallbackPath);
};

export const consumeAuthReturnPath = (fallbackPath: string = PROFILE_PATH) => {
  if (!hasWindow()) return fallbackPath;
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

export const storeAuthReturnPath = (path?: string) => {
  if (!hasWindow()) return;
  const sanitized = sanitizeInternalReturnPath(path ?? getCurrentAppPath());
  if (!sanitized) return;
  sessionStorage.setItem(AUTH_RETURN_PATH_STORAGE_KEY, sanitized);
};

export const navigateToLoginWithReturnPath = (returnPath?: string) => {
  storeAuthReturnPath(returnPath);
  navigateToPath(LOGIN_PATH);
};

export const navigateToSignupWithReturnPath = (returnPath?: string) => {
  storeAuthReturnPath(returnPath);
  navigateToPath(SIGNUP_PATH);
};

export const navigateToHome = () => navigateToPath(HOME_PATH);
export const navigateToExplore = (state?: Partial<ExploreQueryState>) => {
  if (!hasWindow()) return;
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
export const navigateToSaved = () => navigateToPath(SAVED_PATH);
export const navigateToHidden = () => navigateToPath(HIDDEN_PATH);
export const navigateToSettings = () => navigateToPath(SETTINGS_PATH);
export const navigateToPrivacy = () => navigateToPath(PRIVACY_PATH);
export const navigateToTerms = () => navigateToPath(TERMS_PATH);
export const navigateToSafety = () => navigateToPath(SAFETY_PATH);
export const navigateToReport = () => navigateToPath(REPORT_PATH);
export const navigateToSeller = () => navigateToPath(SELLER_PATH);

export const navigateToSellerProfile = (uid: string) => {
  if (!hasWindow()) return;
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

export const getSellerUidFromUrl = () => {
  if (!hasWindow()) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
};

export const navigateToSellerDashboard = () => navigateToPath(SELLER_DASHBOARD_PATH);
export const navigateToSellerPayouts = () => navigateToPath(SELLER_PAYOUTS_PATH);
export const navigateToListingDetails = (listingId: string | number, imageIndex: number = 0) => {
  if (!hasWindow()) return;
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

export const navigateToMessages = () => navigateToPath(MESSAGES_PATH);
export const navigateToCreateListing = () => navigateToPath(CREATE_PATH);
export const navigateToEditListing = (listingId: string | number) => {
  if (!hasWindow()) return;
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

export const getEditListingIdFromUrl = () => {
  if (!hasWindow()) return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get("id");
  return value ? Number(value) : null;
};

export const navigateToProfile = () => navigateToPath(PROFILE_PATH);
export const navigateToLogin = () => navigateToPath(LOGIN_PATH);
export const navigateToSignup = () => navigateToPath(SIGNUP_PATH);
export const navigateToForgotPassword = () => navigateToPath(FORGOT_PASSWORD_PATH);
export const navigateToVerifyEmail = () => navigateToPath(VERIFY_EMAIL_PATH);
export const navigateToEditProfile = () => navigateToPath(EDIT_PROFILE_PATH);
export const navigateToEditAccount = () => navigateToPath(EDIT_ACCOUNT_PATH);
export const navigateToBecomeSeller = () => navigateToPath(BECOME_SELLER_PATH);
export const navigateToChangePassword = () => navigateToPath(CHANGE_PASSWORD_PATH);
export const navigateToChangeEmail = () => navigateToPath(CHANGE_EMAIL_PATH);
export const navigateToEmailAction = () => navigateToPath(EMAIL_ACTION_PATH);
export const navigateToMyListings = () => navigateToPath(MY_LISTINGS_PATH);
export const navigateToAdmin = () => navigateToPath(ADMIN_PATH);
export const navigateToAdminPayments = () => navigateToPath(ADMIN_PAYMENTS_PATH);
export const navigateToAdminPayouts = () => navigateToPath(ADMIN_PAYOUTS_PATH);
export const navigateToAdminPayoutDestinations = () => navigateToPath(ADMIN_PAYOUT_DESTINATIONS_PATH);
export const navigateToAdminReports = () => navigateToPath(ADMIN_REPORTS_PATH);
export const navigateToAdminSellerApplications = () => navigateToPath(ADMIN_SELLER_APPLICATIONS_PATH);
export const navigateToAdminModerationQueue = () => navigateToPath(ADMIN_MODERATION_QUEUE_PATH);
export const navigateToAdminAudit = () => navigateToPath(ADMIN_AUDIT_PATH);
export const navigateToAdminBalance = () => navigateToPath(ADMIN_BALANCE_PATH);
export const navigateToAdminSetup = () => navigateToPath(ADMIN_SETUP_PATH);
export const navigateToPaymentReturn = () => navigateToPath(PAYMENT_RETURN_PATH);
export const navigateToPaymentsHub = () => navigateToPath(PAYMENTS_HUB_PATH);
export const navigateToPaymentMethod = () => navigateToPath(PAYMENT_METHOD_PATH);
export const navigateToTrackOrder = () => navigateToPath(TRACK_ORDER_PATH);
export const navigateToOrderTracking = (reference?: string) => {
  if (!reference) {
    navigateToPath(TRACK_ORDER_PATH);
    return;
  }
  navigateToPath(`${ORDER_TRACKING_BASE_PATH}/${encodeURIComponent(reference)}`);
};
export const navigateToDisputes = () => navigateToPath(DISPUTES_PATH);
export const navigateToBuyerPayments = () => navigateToPath(BUYER_PAYMENTS_PATH);
export const navigateToCart = () => navigateToPath(CART_PATH);
export const navigateToOrderDispute = (reference: string) => navigateToPath(`${ORDER_TRACKING_BASE_PATH}/${encodeURIComponent(reference)}/dispute`);
