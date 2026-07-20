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
