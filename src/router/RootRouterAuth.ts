import { useEffect } from "react";
import {
  EVENTS_CREATE_PATH,
  EVENTS_MANAGE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  navigateToLoginWithReturnPath,
  navigateToPath,
  type AppRoute,
  VERIFY_EMAIL_PATH,
} from "../lib/appNavigation";
import type { User } from "firebase/auth";

type RootRouterAuthGuardProps = {
  authLoading: boolean;
  firebaseUser: User | null;
  route: AppRoute;
  locationPath: string;
  locationSearch: string;
};

export function useRootRouterAuthGuard({
  authLoading,
  firebaseUser,
  route,
  locationPath,
  locationSearch,
}: RootRouterAuthGuardProps) {
  useEffect(() => {
    if (authLoading) return;

    const protectedRoutes: AppRoute[] = [
      "profile",
      "settings",
      "edit_profile",
      "edit_account",
      "account_setup",
      "become_seller",
      "change_password",
      "change_email",
      "my_listings",
      "seller_dashboard",
      "seller_payouts",
      "messages",
      "event_creator_dashboard",
      "tickets",
      "admin",
      "admin_messages",
      "admin_events",
      "admin_payments",
      "admin_transaction_inspector",
      "admin_payouts",
      "admin_reports",
      "admin_seller_applications",
      "admin_moderation_queue",
      "admin_audit",
      "admin_balance",
      "admin_setup",
      "admin_payout_destinations",
    ];
    const requiresAuth =
      locationPath === EVENTS_CREATE_PATH ||
      locationPath === EVENTS_MANAGE_PATH ||
      locationPath.startsWith("/payments") ||
      locationPath === "/buyer-payments" ||
      locationPath === "/cart" ||
      locationPath.startsWith("/orders/") ||
      locationPath === "/transaction-json";
    const isVerified = !!firebaseUser?.emailVerified;

    if (!firebaseUser) {
      if (route === "verify_email") navigateToPath(LOGIN_PATH);
      if (protectedRoutes.includes(route) || requiresAuth) {
        navigateToLoginWithReturnPath(`${locationPath}${locationSearch}`);
      }
      return;
    }

    if (!isVerified) {
      if (protectedRoutes.includes(route) || requiresAuth) navigateToPath(VERIFY_EMAIL_PATH);
      return;
    }

    if (route === "verify_email") navigateToPath(HOME_PATH);
  }, [authLoading, firebaseUser, route, locationPath, locationSearch]);
}
