import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DISPUTES_PATH,
  ADMIN_AUDIT_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_SETUP_PATH,
  getAppRouteFromLocation,
  HOME_PATH,
  navigateToPath,
  PAYMENT_METHOD_PATH,
  TRACK_ORDER_PATH,
  type AppRoute,
  LOGIN_PATH,
  SELLER_PAYOUTS_PATH,
  SETTINGS_PATH,
  VERIFY_EMAIL_PATH,
  navigateToLoginWithReturnPath,
} from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import loaderImage from "../photos/LoaderPic.png";

const App = lazy(() => import("./App.new"));
const AdminHubPage = lazy(() => import("./AdminHubPage"));
const AdminPaymentsPage = lazy(() => import("./AdminPaymentsConsole"));
const AdminPayoutsManager = lazy(() => import("./AdminPayoutsManagerDisplay"));
const AdminReportsPage = lazy(() => import("./AdminReportsPage"));
const AdminSellerApplicationsPage = lazy(() => import("./AdminSellerApplicationsPage"));
const AdminModerationQueuePage = lazy(() => import("./AdminModerationQueuePage"));
const AdminAuditLogPage = lazy(() => import("./AdminAuditLogPage"));
const AdminSetupPage = lazy(() => import("./AdminSetupPage"));
const AdminPayoutDestinationRequestsPage = lazy(() => import("./AdminPayoutDestinationRequestsPage"));
const AdminRouteGuard = lazy(() => import("./components/AdminRouteGuard"));
const BecomeSellerPage = lazy(() => import("./BecomeSellerPage"));
const BuyerPaymentsPage = lazy(() => import("./BuyerPaymentsPage"));
const CartPage = lazy(() => import("./CartPage"));
const ChangeEmailPage = lazy(() => import("./ChangeEmailPage"));
const ChangePasswordPage = lazy(() => import("./ChangePasswordPage"));
const CategoryPage = lazy(() => import("./CategoryPage"));
const CreateListingPage = lazy(() => import("./CreateListingPage"));
const EditAccountPage = lazy(() => import("./EditAccountPage"));
const EditListingPage = lazy(() => import("./EditListingPage"));
const EditProfilePage = lazy(() => import("./EditProfilePage"));
const EmailActionPage = lazy(() => import("./EmailActionPage"));
const ForgotPasswordPage = lazy(() => import("./ForgotPasswordPage"));
const HiddenCollectionsPage = lazy(() => import("./HiddenCollectionsPage"));
const HomePage = lazy(() => import("./HomePage"));
const ListingDetailsPage = lazy(() => import("./ListingDetailsPage"));
const LoginPage = lazy(() => import("./LoginPage"));
const MarketComingSoonPage = lazy(() => import("./MarketComingSoonPage"));
const MessageThreadPage = lazy(() => import("./MessageThreadPage"));
const MessagesInboxPage = lazy(() => import("./MessagesInboxPage"));
const MyListingsPage = lazy(() => import("./MyListingsPage"));
const OrderDisputePage = lazy(() => import("./OrderDisputePage"));
const OrderTrackingPage = lazy(() => import("./OrderTrackingPage"));
const PrivacyPolicyPage = lazy(() => import("./components/PrivacyPolicyPage"));
const ProfilePage = lazy(() => import("./ProfilePage"));
const ReportProblemPage = lazy(() => import("./components/ReportProblemPage"));
const SafetyTipsPage = lazy(() => import("./components/SafetyTipsPage"));
const SavedPage = lazy(() => import("./SavedPage"));
const SettingsPage = lazy(() => import("./SettingsPage"));
const SellerProfilePage = lazy(() => import("./SellerProfilePage"));
const SellerDashboardPage = lazy(() => import("./SellerDashboardPage"));
const SellerPayoutsPage = lazy(() => import("./SellerPayoutsPage"));
const SignupPage = lazy(() => import("./SignupPage"));
const TermsPage = lazy(() => import("./components/TermsPage"));
const VerifyEmailPage = lazy(() => import("./VerifyEmailPage"));
const PaymentReturnPage = lazy(() => import("./PaymentReturnPage"));
const PaymentsHubPage = lazy(() => import("./PaymentsHubPage"));
const PaymentMethodPage = lazy(() => import("./PaymentMethodPage"));
const TrackOrderPage = lazy(() => import("./TrackOrderPage"));
const DisputesPage = lazy(() => import("./DisputesPage"));

function RouteLoader({ route }: { route: AppRoute }) {
  const useBarLoader = route === "home" || route === "explore";

  if (useBarLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex w-full max-w-xl flex-col items-center gap-6">
          <img src={loaderImage} alt="BuyMesho loading" className="h-auto w-full max-w-[280px] object-contain" />
          <div className="progress-outer w-3/4 md:w-2/3"><div className="progress-inner" /></div>
        </div>
      </div>
    );
  }

  return <div className="flex h-screen items-center justify-center bg-zinc-100/70"><Loader2 className="h-10 w-10 animate-spin text-zinc-700" /></div>;
}

export default function RootRouter() {
  const [route, setRoute] = useState<AppRoute>(() => getAppRouteFromLocation(window.location));
  const [locationSearch, setLocationSearch] = useState(() => window.location.search);
  const [locationPath, setLocationPath] = useState(() => window.location.pathname);
  const { user: firebaseUser, loading: authLoading } = useAuthUser();

  const [showScrollTop, setShowScrollTop] = useState(false);
  const threadConversationId = new URLSearchParams(locationSearch).get("conversation");
  const isMessageThread = route === "messages" && !!threadConversationId;
  const isOrderDisputePath = locationPath.startsWith("/orders/") && locationPath.endsWith("/dispute");
  const isOrderTrackingPath = locationPath.startsWith("/orders/") && !locationPath.endsWith("/dispute");

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(getAppRouteFromLocation(window.location));
      setLocationSearch(window.location.search);
      setLocationPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    void Promise.allSettled([
      import("./App.new"),
      import("./HomePage"),
      import("./CategoryPage"),
      import("./MessagesInboxPage"),
      import("./MessageThreadPage"),
      import("./MarketComingSoonPage"),
      import("./BuyerPaymentsPage"),
      import("./PaymentsHubPage"),
      import("./PaymentMethodPage"),
      import("./TrackOrderPage"),
      import("./DisputesPage"),
      import("./CartPage"),
      import("./AdminPaymentsConsole"),
      import("./AdminPayoutsManager"),
      import("./AdminModerationQueuePage"),
      import("./AdminAuditLogPage"),
      import("./AdminSetupPage"),
      import("./OrderTrackingPage"),
      import("./OrderDisputePage"),
      import("./SellerPayoutsPage"),
    ]);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const protectedRoutes: AppRoute[] = [
      "profile",
      "settings",
      "edit_profile",
      "edit_account",
      "become_seller",
      "change_password",
      "change_email",
      "my_listings",
      "seller_dashboard",
      "seller_payouts",
      "messages",
      "admin",
      "admin_payments",
      "admin_payouts",
      "admin_reports",
      "admin_seller_applications",
      "admin_moderation_queue",
      "admin_audit",
      "admin_setup",
      "admin_payout_destinations",
    ];

    const requiresAuth =
      locationPath.startsWith("/payments") ||
      locationPath === "/buyer-payments" ||
      locationPath === "/cart" ||
      locationPath.startsWith("/orders/");
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

  return (
    <>
      <Suspense fallback={<RouteLoader route={route} />}>
        {locationPath === "/explore/lay-by" || locationPath === "/explore/events" || locationPath === "/explore/accommodation" ? (
          <MarketComingSoonPage />
        ) : locationPath.startsWith("/market/coming-soon") ? (
          <MarketComingSoonPage />
        ) : locationPath.startsWith("/orders/") && locationPath.endsWith("/dispute") ? (
          <OrderDisputePage />
        ) : isOrderTrackingPath ? (
          <OrderTrackingPage />
        ) : locationPath === PAYMENT_METHOD_PATH ? (
          <PaymentMethodPage />
        ) : locationPath === TRACK_ORDER_PATH ? (
          <TrackOrderPage />
        ) : locationPath === DISPUTES_PATH ? (
          <DisputesPage />
        ) : locationPath === "/payments" ? (
          <PaymentsHubPage />
        ) : locationPath === "/buyer-payments" ? (
          <BuyerPaymentsPage />
        ) : locationPath === SELLER_PAYOUTS_PATH ? (
          <SellerPayoutsPage />
        ) : locationPath === "/cart" ? (
          <CartPage />
        ) : route === "category" ? (
          <CategoryPage />
        ) : route === "explore" ? (
          <App key={locationPath} />
        ) : route === "saved" ? (
          <SavedPage />
        ) : route === "hidden" ? (
          <HiddenCollectionsPage />
        ) : route === "settings" ? (
          <SettingsPage />
        ) : route === "privacy" ? (
          <PrivacyPolicyPage onBack={() => window.history.back()} />
        ) : route === "terms" ? (
          <TermsPage onBack={() => window.history.back()} />
        ) : route === "safety" ? (
          <SafetyTipsPage onBack={() => window.history.back()} />
        ) : route === "report" ? (
          <ReportProblemPage onBack={() => window.history.back()} isLoggedIn={false} />
        ) : route === "seller" ? (
          <SellerProfilePage />
        ) : route === "seller_dashboard" ? (
          <SellerDashboardPage />
        ) : route === "listing_details" ? (
          <ListingDetailsPage />
        ) : route === "messages" ? (
          isMessageThread ? <MessageThreadPage /> : <MessagesInboxPage />
        ) : route === "create" ? (
          <CreateListingPage />
        ) : route === "edit" ? (
          <EditListingPage />
        ) : route === "login" ? (
          <LoginPage />
        ) : route === "signup" ? (
          <SignupPage />
        ) : route === "forgot_password" ? (
          <ForgotPasswordPage />
        ) : route === "profile" ? (
          <ProfilePage />
        ) : route === "verify_email" ? (
          <VerifyEmailPage />
        ) : route === "edit_profile" ? (
          <EditProfilePage />
        ) : route === "edit_account" ? (
          <EditAccountPage />
        ) : route === "become_seller" ? (
          <BecomeSellerPage />
        ) : route === "change_password" ? (
          <ChangePasswordPage />
        ) : route === "change_email" ? (
          <ChangeEmailPage />
        ) : route === "email_action" ? (
          <EmailActionPage />
        ) : route === "my_listings" ? (
          <MyListingsPage />
        ) : route === "admin" ? (
          <AdminRouteGuard><AdminHubPage /></AdminRouteGuard>
        ) : route === "admin_payments" ? (
          <AdminRouteGuard><AdminPaymentsPage /></AdminRouteGuard>
        ) : route === "admin_payouts" ? (
          <AdminRouteGuard><AdminPayoutsManager /></AdminRouteGuard>
        ) : route === "admin_reports" ? (
          <AdminRouteGuard><AdminReportsPage /></AdminRouteGuard>
        ) : route === "admin_seller_applications" ? (
          <AdminRouteGuard><AdminSellerApplicationsPage /></AdminRouteGuard>
        ) : route === "admin_moderation_queue" || locationPath === ADMIN_MODERATION_QUEUE_PATH ? (
          <AdminRouteGuard><AdminModerationQueuePage /></AdminRouteGuard>
        ) : route === "admin_audit" || locationPath === ADMIN_AUDIT_PATH ? (
          <AdminRouteGuard><AdminAuditLogPage /></AdminRouteGuard>
        ) : route === "admin_setup" || locationPath === ADMIN_SETUP_PATH ? (
          <AdminRouteGuard><AdminSetupPage /></AdminRouteGuard>
        ) : route === "admin_payout_destinations" ? (
          <AdminRouteGuard><AdminPayoutDestinationRequestsPage /></AdminRouteGuard>
        ) : route === "payment_return" ? (
          <PaymentReturnPage />
        ) : (
          <HomePage />
        )}
      </Suspense>
      <AnimatePresence>
        {showScrollTop && (
          <motion.button type="button" initial={{ opacity: 0, y: 16, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.92 }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 h-12 w-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-400/30 flex items-center justify-center transition-all active:scale-95" aria-label="Scroll to top"><ArrowUp className="w-5 h-5" /></motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
