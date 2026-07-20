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
  | "seller_dashboard"
  | "seller_payouts"
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
  | "admin_payouts"
  | "admin_reports"
  | "admin_seller_applications"
  | "admin_moderation_queue"
  | "admin_audit"
  | "admin_balance"
  | "admin_setup"
  | "payment_return";

export const ADMIN_PAYOUT_DESTINATIONS_PATH = "/admin/payouts/destinations";
export const HOME_PATH = "/";
export const EXPLORE_PATH = "/explore";
export const EVENTS_PATH = "/explore/events";
export const EVENTS_CREATE_PATH = "/explore/events/create";
export const SAVED_PATH = "/saved";
export const HIDDEN_PATH = "/hidden";
export const SETTINGS_PATH = "/settings";
export const PRIVACY_PATH = "/privacy";
export const TERMS_PATH = "/terms";
export const SAFETY_PATH = "/safety";
export const REPORT_PATH = "/report";
export const SELLER_PATH = "/seller";
export const SELLER_DASHBOARD_PATH = "/seller-dashboard";
export const SELLER_PAYOUTS_PATH = "/seller/payouts";
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
export const ADMIN_PAYOUTS_PATH = "/admin/payouts";
export const ADMIN_REPORTS_PATH = "/admin/reports";
export const ADMIN_SELLER_APPLICATIONS_PATH = "/admin/seller-applications";
export const ADMIN_MODERATION_QUEUE_PATH = "/admin/moderation-queue";
export const ADMIN_AUDIT_PATH = "/admin/audit";
export const ADMIN_BALANCE_PATH = "/admin/balance";
export const ADMIN_SETUP_PATH = "/admin/setup";
export const PAYMENT_RETURN_PATH = "/payment/return";
export const PAYMENTS_HUB_PATH = "/payments";
export const PAYMENT_METHOD_PATH = "/payments/payment-method";
export const TRACK_ORDER_PATH = "/payments/track-order";
export const DISPUTES_PATH = "/payments/disputes";
export const BUYER_PAYMENTS_PATH = "/buyer-payments";
export const CART_PATH = "/cart";

export const MARKET_CHIP_PATHS: Record<HeaderChip, string> = {
  All: EXPLORE_PATH,
  Deals: `${EXPLORE_PATH}/deals`,
  "Lay-by": `${EXPLORE_PATH}/lay-by`,
  Events: `${EXPLORE_PATH}/events`,
  Wholesale: `${EXPLORE_PATH}/wholesale`,
  Sellers: `${EXPLORE_PATH}/sellers`,
  Innovation: `${EXPLORE_PATH}/innovation`,
  Accommodation: `${EXPLORE_PATH}/accommodation`,
};

const APP_HISTORY_STATE_KEY = "__buymesho";
const AUTH_RETURN_PATH_STORAGE_KEY = "__buymesho_auth_return_path";

function hasWindow(): boolean {
  return typeof window !== "undefined";
}

export function navigateToPath(path: string) {
  if (!hasWindow()) return;
  window.history.pushState({ [APP_HISTORY_STATE_KEY]: true }, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function navigateBackOrPath(path: string) {
  if (!hasWindow()) return;
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  navigateToPath(path);
}

export function navigateToHome() {
  navigateToPath(HOME_PATH);
}

export function navigateToExplore() {
  navigateToPath(EXPLORE_PATH);
}

export function navigateToSaved() {
  navigateToPath(SAVED_PATH);
}

export function navigateToHidden() {
  navigateToPath(HIDDEN_PATH);
}

export function navigateToSettings() {
  navigateToPath(SETTINGS_PATH);
}

export function navigateToPrivacy() {
  navigateToPath(PRIVACY_PATH);
}

export function navigateToTerms() {
  navigateToPath(TERMS_PATH);
}

export function navigateToSafety() {
  navigateToPath(SAFETY_PATH);
}

export function navigateToReport() {
  navigateToPath(REPORT_PATH);
}

export function navigateToSeller() {
  navigateToPath(SELLER_PATH);
}

export function navigateToSellerDashboard() {
  navigateToPath(SELLER_DASHBOARD_PATH);
}

export function navigateToSellerPayouts() {
  navigateToPath(SELLER_PAYOUTS_PATH);
}

export function navigateToListingDetails(listingId: string | number) {
  navigateToPath(`${LISTING_PATH}/${listingId}`);
}

export function navigateToMessages() {
  navigateToPath(MESSAGES_PATH);
}

export function navigateToCreateListing() {
  navigateToPath(CREATE_PATH);
}

export function navigateToEditListing(listingId: string | number) {
  navigateToPath(`${EDIT_PATH}/${listingId}`);
}

export function navigateToLogin() {
  navigateToPath(LOGIN_PATH);
}

export function navigateToLoginWithReturnPath(returnPath?: string) {
  if (hasWindow() && returnPath) {
    window.localStorage.setItem(AUTH_RETURN_PATH_STORAGE_KEY, returnPath);
  }
  navigateToPath(LOGIN_PATH);
}

export function getStoredAuthReturnPath(): string | null {
  if (!hasWindow()) return null;
  return window.localStorage.getItem(AUTH_RETURN_PATH_STORAGE_KEY);
}

export function clearStoredAuthReturnPath() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(AUTH_RETURN_PATH_STORAGE_KEY);
}

export function navigateToSignup() {
  navigateToPath(SIGNUP_PATH);
}

export function navigateToForgotPassword() {
  navigateToPath(FORGOT_PASSWORD_PATH);
}

export function navigateToProfile() {
  navigateToPath(PROFILE_PATH);
}

export function navigateToVerifyEmail() {
  navigateToPath(VERIFY_EMAIL_PATH);
}

export function navigateToEditProfile() {
  navigateToPath(EDIT_PROFILE_PATH);
}

export function navigateToEditAccount() {
  navigateToPath(EDIT_ACCOUNT_PATH);
}

export function navigateToBecomeSeller() {
  navigateToPath(BECOME_SELLER_PATH);
}

export function navigateToChangePassword() {
  navigateToPath(CHANGE_PASSWORD_PATH);
}

export function navigateToChangeEmail() {
  navigateToPath(CHANGE_EMAIL_PATH);
}

export function navigateToEmailAction() {
  navigateToPath(EMAIL_ACTION_PATH);
}

export function navigateToMyListings() {
  navigateToPath(MY_LISTINGS_PATH);
}

export function navigateToAdmin() {
  navigateToPath(ADMIN_PATH);
}

export function navigateToAdminPayments() {
  navigateToPath(ADMIN_PAYMENTS_PATH);
}

export function navigateToAdminPayouts() {
  navigateToPath(ADMIN_PAYOUTS_PATH);
}

export function navigateToAdminPayoutDestinations() {
  navigateToPath(ADMIN_PAYOUT_DESTINATIONS_PATH);
}

export function navigateToAdminReports() {
  navigateToPath(ADMIN_REPORTS_PATH);
}

export function navigateToAdminSellerApplications() {
  navigateToPath(ADMIN_SELLER_APPLICATIONS_PATH);
}

export function navigateToAdminModerationQueue() {
  navigateToPath(ADMIN_MODERATION_QUEUE_PATH);
}

export function navigateToAdminAudit() {
  navigateToPath(ADMIN_AUDIT_PATH);
}

export function navigateToAdminBalance() {
  navigateToPath(ADMIN_BALANCE_PATH);
}

export function navigateToAdminSetup() {
  navigateToPath(ADMIN_SETUP_PATH);
}

export function navigateToPaymentReturn() {
  navigateToPath(PAYMENT_RETURN_PATH);
}

export function navigateToPaymentsHub() {
  navigateToPath(PAYMENTS_HUB_PATH);
}

export function navigateToPaymentMethod() {
  navigateToPath(PAYMENT_METHOD_PATH);
}

export function navigateToTrackOrder() {
  navigateToPath(TRACK_ORDER_PATH);
}

export function navigateToDisputes() {
  navigateToPath(DISPUTES_PATH);
}

export function navigateToBuyerPayments() {
  navigateToPath(BUYER_PAYMENTS_PATH);
}

export function navigateToCart() {
  navigateToPath(CART_PATH);
}

export function getAppRouteFromLocation(pathname: string = hasWindow() ? window.location.pathname : HOME_PATH): AppRoute {
  if (pathname === HOME_PATH) return "home";
  if (pathname.startsWith("/category")) return "category";
  if (pathname.startsWith(EXPLORE_PATH)) return "explore";
  if (pathname === SAVED_PATH) return "saved";
  if (pathname === HIDDEN_PATH) return "hidden";
  if (pathname === SETTINGS_PATH) return "settings";
  if (pathname === PRIVACY_PATH) return "privacy";
  if (pathname === TERMS_PATH) return "terms";
  if (pathname === SAFETY_PATH) return "safety";
  if (pathname === REPORT_PATH) return "report";
  if (pathname === SELLER_PATH) return "seller";
  if (pathname === SELLER_DASHBOARD_PATH) return "seller_dashboard";
  if (pathname === SELLER_PAYOUTS_PATH || pathname === ADMIN_PAYOUT_DESTINATIONS_PATH) return "seller_payouts";
  if (pathname.startsWith(`${LISTING_PATH}/`)) return "listing_details";
  if (pathname === MESSAGES_PATH) return "messages";
  if (pathname === CREATE_PATH) return "create";
  if (pathname.startsWith(EDIT_PATH)) return "edit";
  if (pathname === LOGIN_PATH) return "login";
  if (pathname === SIGNUP_PATH) return "signup";
  if (pathname === FORGOT_PASSWORD_PATH) return "forgot_password";
  if (pathname === PROFILE_PATH) return "profile";
  if (pathname === VERIFY_EMAIL_PATH) return "verify_email";
  if (pathname === EDIT_PROFILE_PATH) return "edit_profile";
  if (pathname === EDIT_ACCOUNT_PATH) return "edit_account";
  if (pathname === BECOME_SELLER_PATH) return "become_seller";
  if (pathname === CHANGE_PASSWORD_PATH) return "change_password";
  if (pathname === CHANGE_EMAIL_PATH) return "change_email";
  if (pathname === EMAIL_ACTION_PATH) return "email_action";
  if (pathname === MY_LISTINGS_PATH) return "my_listings";
  if (pathname === ADMIN_PATH) return "admin";
  if (pathname === ADMIN_PAYMENTS_PATH) return "admin_payments";
  if (pathname === ADMIN_PAYOUTS_PATH) return "admin_payouts";
  if (pathname === ADMIN_REPORTS_PATH) return "admin_reports";
  if (pathname === ADMIN_SELLER_APPLICATIONS_PATH) return "admin_seller_applications";
  if (pathname === ADMIN_MODERATION_QUEUE_PATH) return "admin_moderation_queue";
  if (pathname === ADMIN_AUDIT_PATH) return "admin_audit";
  if (pathname === ADMIN_BALANCE_PATH) return "admin_balance";
  if (pathname === ADMIN_SETUP_PATH) return "admin_setup";
  if (pathname === PAYMENT_RETURN_PATH) return "payment_return";
  if (pathname === EVENTS_PATH || pathname === EVENTS_CREATE_PATH) return "explore";
  return "home";
}
