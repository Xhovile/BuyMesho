import { Suspense, useEffect, useState, Component, type ErrorInfo, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  DISPUTES_PATH,
  ADMIN_AUDIT_PATH,
  ADMIN_EVENTS_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_SETUP_PATH,
  ADMIN_BALANCE_PATH,
  EVENTS_CREATE_PATH,
  EVENTS_MANAGE_PATH,
  EVENTS_PATH,
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
  TICKETS_PATH,
} from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import ScrollToTopFab from "./components/ScrollToTopFab";
import loaderImage from "../photos/LoaderPic.png";

const App = React.lazy(() => import("./App.new"));
const AdminHubPage = React.lazy(() => import("./AdminHubPage"));
const AdminPaymentsPage = React.lazy(() => import("./AdminPaymentsConsole"));
const AdminBalancePage = React.lazy(() => import("./AdminBalancePage"));
const AdminPayoutsManager = React.lazy(() => import("./AdminPayoutsManager"));
const AdminReportsPage = React.lazy(() => import("./AdminReportsPage"));
const AdminSellerApplicationsPage = React.lazy(() => import("./AdminSellerApplicationsPage"));
const AdminModerationQueuePage = React.lazy(() => import("./AdminModerationQueuePage"));
const AdminAuditLogPage = React.lazy(() => import("./AdminAuditLogPage"));
const AdminSetupPage = React.lazy(() => import("./AdminSetupPage"));
const AdminPayoutDestinationRequestsPage = React.lazy(() => import("./AdminPayoutDestinationRequestsPage"));
const AdminEventModerationPage = React.lazy(() => import("./AdminEventModerationPage"));
const AdminRouteGuard = React.lazy(() => import("./components/AdminRouteGuard"));
const BecomeSellerPage = React.lazy(() => import("./BecomeSellerPage"));
import BuyerPaymentsPage from "./BuyerPaymentsPage";
import TicketsPage from "./TicketsPage";
const CartPage = React.lazy(() => import("./CartPage"));
const ChangeEmailPage = React.lazy(() => import("./ChangeEmailPage"));
const ChangePasswordPage = React.lazy(() => import("./ChangePasswordPage"));
const CategoryPage = React.lazy(() => import("./CategoryPage"));
const CreateListingPage = React.lazy(() => import("./CreateListingPage"));
const EditAccountPage = React.lazy(() => import("./EditAccountPage"));
const EditListingPage = React.lazy(() => import("./EditListingPage"));
const EditProfilePage = React.lazy(() => import("./EditProfilePage"));
const EmailActionPage = React.lazy(() => import("./EmailActionPage"));
const ForgotPasswordPage = React.lazy(() => import("./ForgotPasswordPage"));
const HiddenCollectionsPage = React.lazy(() => import("./HiddenCollectionsPage"));
const HomePage = React.lazy(() => import("./HomePage"));
const AboutPage = React.lazy(() => import("./components/AboutPage"));
const ListingDetailsPage = React.lazy(() => import("./ListingDetailsPage"));
const LoginPage = React.lazy(() => import("./LoginPage"));
const MarketComingSoonPage = React.lazy(() => import("./MarketComingSoonPage"));
const MessageThreadPage = React.lazy(() => import("./MessageThreadPage"));
const MessagesInboxPage = React.lazy(() => import("./MessagesInboxPage"));
const MyListingsPage = React.lazy(() => import("./MyListingsPage"));
const OrderDisputePage = React.lazy(() => import("./OrderDisputePage"));
import OrderTrackingPage from "./OrderTrackingPage";
const PrivacyPolicyPage = React.lazy(() => import("./components/PrivacyPolicyPage"));
const ProfilePage = React.lazy(() => import("./ProfilePage"));
const ReportProblemPage = React.lazy(() => import("./components/ReportProblemPage"));
const SafetyTipsPage = React.lazy(() => import("./components/SafetyTipsPage"));
const SavedPage = React.lazy(() => import("./SavedPage"));
const SettingsPage = React.lazy(() => import("./SettingsPage"));
const SellerProfilePage = React.lazy(() => import("./SellerProfilePage"));
const SellerDashboardPage = React.lazy(() => import("./SellerDashboardPage"));
const SellerPayoutsPage = React.lazy(() => import("./SellerPayoutsPage"));
const SellersDirectoryPage = React.lazy(() => import("./SellersDirectoryPage"));
const SignupPage = React.lazy(() => import("./SignupPage"));
const TermsPage = React.lazy(() => import("./components/TermsPage"));
const VerifyEmailPage = React.lazy(() => import("./VerifyEmailPage"));
const PaymentReturnPage = React.lazy(() => import("./PaymentReturnPage"));
const ConnectCallbackPage = React.lazy(() => import("./ConnectCallbackPage"));
const PaymentsHubPage = React.lazy(() => import("./PaymentsHubPage"));
const PaymentMethodPage = React.lazy(() => import("./PaymentMethodPage"));
import TrackOrderPage from "./TrackOrderPage";
const DisputesPage = React.lazy(() => import("./DisputesPage"));
const EventsDirectoryPage = React.lazy(() => import("./EventsDirectoryPage"));
const EventDetailsPage = React.lazy(() => import("./EventDetailsPage"));
const EventsCreatePage = React.lazy(() => import("./EventsCreatePage"));
const EventCreatorDashboardPage = React.lazy(() => import("./EventCreatorDashboardPage"));

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

class DebugErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DebugErrorBoundary caught:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white p-6 text-zinc-900">
          <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <h2 className="text-lg font-black text-rose-900">Admin Payouts crashed</h2>
            <p className="mt-2 text-sm text-rose-900/90">{this.state.error?.message}</p>
            <pre className="mt-4 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-zinc-800">
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const SEO_BASE_URL = "https://buymesho.app";

type SeoConfig = {
  title: string;
  description: string;
  canonicalPath: string;
  noindex?: boolean;
};

function upsertMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let el = document.head.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attribute, name);
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
  switch (pathname) {
    case "/":
    case "/home":
      return {
        title: "BuyMesho — Student Entrepreneurship Marketplace",
        description: "Discover listings, deals, sellers, and local events on BuyMesho.",
        canonicalPath: "/",
      };
    case "/signup":
      return {
        title: "Create a BuyMesho Account",
        description: "Join BuyMesho to buy, sell, and manage your student marketplace activity.",
        canonicalPath: "/signup",
      };
    case "/about":
      return {
        title: "About BuyMesho — Student Entrepreneurship Marketplace",
        description: "Learn what BuyMesho is, who it serves, and how the marketplace works.",
        canonicalPath: "/about",
      };
    case "/explore":
      return {
        title: "Explore BuyMesho Marketplace",
        description: "Browse listings, deals, sellers, events, and more on BuyMesho.",
        canonicalPath: "/explore",
      };
    case "/explore/deals":
      return {
        title: "BuyMesho Deals",
        description: "Find current deals and value listings on BuyMesho.",
        canonicalPath: "/explore/deals",
      };
    case "/explore/lay-by":
      return {
        title: "BuyMesho Lay-by",
        description: "Browse lay-by friendly listings on BuyMesho.",
        canonicalPath: "/explore/lay-by",
      };
    case "/explore/events":
      return {
        title: "BuyMesho Events",
        description: "Discover public events and event listings on BuyMesho.",
        canonicalPath: "/explore/events",
      };
    case "/tickets":
      return {
        title: "BuyMesho Tickets",
        description: "View your event tickets, download PDFs, and share passes on WhatsApp.",
        canonicalPath: "/tickets",
      };
    case "/explore/wholesale":
      return {
        title: "BuyMesho Wholesale",
        description: "Browse wholesale listings and supplier options on BuyMesho.",
        canonicalPath: "/explore/wholesale",
      };
    case "/explore/sellers":
      return {
        title: "BuyMesho Sellers",
        description: "Browse seller profiles on BuyMesho.",
        canonicalPath: "/explore/sellers",
      };
    case "/privacy":
      return {
        title: "BuyMesho Privacy Policy",
        description: "Read the BuyMesho privacy policy.",
        canonicalPath: "/privacy",
      };
    case "/terms":
      return {
        title: "BuyMesho Terms of Service",
        description: "Read the BuyMesho terms of service.",
        canonicalPath: "/terms",
      };
    case "/safety":
      return {
        title: "BuyMesho Safety Tips",
        description: "Read safety tips for using BuyMesho.",
        canonicalPath: "/safety",
      };
    default:
      return {
        title: "BuyMesho",
        description: "BuyMesho marketplace.",
        canonicalPath: pathname || "/",
        noindex: true,
      };
  }
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
  const isEventsCreatePath = locationPath === EVENTS_CREATE_PATH;
  const isEventsManagePath = locationPath === EVENTS_MANAGE_PATH;
  const isEventsDirectoryPath = locationPath === EVENTS_PATH && !new URLSearchParams(locationSearch).has("event");
  const isEventDetailsPath = locationPath === EVENTS_PATH && new URLSearchParams(locationSearch).has("event");

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
    const seo = buildSeoConfig(locationPath, route);
    document.title = seo.title;
    upsertMeta("description", seo.description);
    upsertMeta("robots", seo.noindex ? "noindex,nofollow" : "index,follow");
    upsertCanonical(`${SEO_BASE_URL}${seo.canonicalPath}`);
    upsertMeta("og:title", seo.title, "property");
    upsertMeta("og:description", seo.description, "property");
    upsertMeta("og:url", `${SEO_BASE_URL}${seo.canonicalPath}`, "property");
    upsertMeta("og:image", loaderImage, "property");
    upsertMeta("og:type", "website", "property");
    upsertMeta("twitter:card", "summary_large_image");
  }, [locationPath, route]);

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
      "event_creator_dashboard",
      "tickets",
      "admin",
      "admin_events",
      "admin_payments",
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
        {isEventsCreatePath ? (
          <EventsCreatePage />
        ) : isEventsManagePath ? (
          <EventCreatorDashboardPage />
        ) : isEventDetailsPath ? (
          <EventDetailsPage />
        ) : isEventsDirectoryPath ? (
          <EventsDirectoryPage />
        ) : locationPath === "/explore/lay-by" || locationPath === "/explore/accommodation" || locationPath === "/explore/innovation" ? (
          <MarketComingSoonPage />
        ) : locationPath === "/explore/sellers" ? (
          <SellersDirectoryPage />
        ) : locationPath.startsWith("/market/coming-soon") ? (
          <MarketComingSoonPage />
        ) : locationPath === "/connect/callback" ? (
          <ConnectCallbackPage />
        ) : route === "listing_details" ? (
          <ListingDetailsPage />
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
        ) : locationPath === "/buyer-payments" ? (
          <BuyerPaymentsPage />
        ) : locationPath === "/tickets" ? (
          <TicketsPage />
        ) : locationPath === "/cart" ? (
          <CartPage />
        ) : locationPath === "/payments" ? (
          <PaymentsHubPage />
        ) : locationPath === "/payments/return" ? (
          <PaymentReturnPage />
        ) : locationPath === "/payments/track-order" ? (
          <TrackOrderPage />
        ) : locationPath === "/payments/payment-method" ? (
          <PaymentMethodPage />
        ) : route === "about" ? (
          <AboutPage />
        ) : route === "category" ? (
          <CategoryPage />
        ) : route === "explore" ? (
          <App />
        ) : route === "saved" ? (
          <SavedPage />
        ) : route === "hidden" ? (
          <HiddenCollectionsPage />
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
        ) : route === "settings" ? (
          <SettingsPage />
        ) : route === "privacy" ? (
          <PrivacyPolicyPage onBack={() => navigateToPath(HOME_PATH)} />
        ) : route === "terms" ? (
          <TermsPage onBack={() => navigateToPath(HOME_PATH)} />
        ) : route === "safety" ? (
          <SafetyTipsPage onBack={() => navigateToPath(HOME_PATH)} />
        ) : route === "report" ? (
          <ReportProblemPage onBack={() => navigateToPath(HOME_PATH)} isLoggedIn={!!firebaseUser} />
        ) : route === "seller" ? (
          <SellerProfilePage />
        ) : route === "seller_dashboard" ? (
          <SellerDashboardPage />
        ) : route === "seller_payouts" ? (
          <SellerPayoutsPage />
        ) : route === "my_listings" ? (
          <MyListingsPage />
        ) : route === "messages" ? (
          isMessageThread ? (
            <MessageThreadPage />
          ) : (
            <MessagesInboxPage />
          )
        ) : route === "create" ? (
          <CreateListingPage />
        ) : route === "edit" ? (
          <EditListingPage />
        ) : route === "email_action" ? (
          <EmailActionPage />
        ) : route === "change_password" ? (
          <ChangePasswordPage />
        ) : route === "change_email" ? (
          <ChangeEmailPage />
        ) : route === "become_seller" ? (
          <BecomeSellerPage />
        ) : route === "admin" ? (
          <AdminHubPage />
        ) : route === "admin_events" ? (
          <AdminEventModerationPage />
        ) : route === "admin_payments" ? (
          <AdminPaymentsPage />
        ) : route === "admin_payouts" ? (
          <AdminPayoutsManager />
        ) : route === "admin_reports" ? (
          <AdminReportsPage />
        ) : route === "admin_seller_applications" ? (
          <AdminSellerApplicationsPage />
        ) : route === "admin_moderation_queue" ? (
          <AdminModerationQueuePage />
        ) : route === "admin_audit" ? (
          <AdminAuditLogPage />
        ) : route === "admin_balance" ? (
          <AdminBalancePage />
        ) : route === "admin_setup" ? (
          <AdminSetupPage />
        ) : route === "admin_payout_destinations" ? (
          <AdminPayoutDestinationRequestsPage />
        ) : route === "payment_return" ? (
          <PaymentReturnPage />
        ) : route === "event_creator_dashboard" || route === "event_creator_overview" ? (
          <EventCreatorDashboardPage />
        ) : (
          <HomePage />
        )}
      </Suspense>
      <ScrollToTopFab show={showScrollTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
    </>
  );
}
