import { lazy, Suspense, useEffect, useState, Component, type ErrorInfo, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import BuyMeshoCopilotDrawer from "./components/ai/BuyMeshoCopilotDrawer";
import AiIcon from "./components/ai/AiIcon";
import {
  DISPUTES_PATH,
  ADMIN_AUDIT_PATH,
  ADMIN_EVENTS_PATH,
  ADMIN_MESSAGES_PATH,
  ADMIN_MODERATION_QUEUE_PATH,
  ADMIN_SETUP_PATH,
  ADMIN_BALANCE_PATH,
  ADMIN_TRANSACTION_INSPECTOR_PATH,
  EVENTS_CREATE_PATH,
  EVENTS_MANAGE_PATH,
  EVENTS_PATH,
  getAppRouteFromLocation,
  HOME_PATH,
  navigateToPath,
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
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import loaderImage from "../photos/LoaderPic.png";
import logoImage from "../photos/Logo.png";

const App = lazy(() => import("./App.new"));
const AdminHubPage = lazy(() => import("./AdminHubPage"));
const AdminMessagesPage = lazy(() => import("./AdminMessagesPage"));
const AdminMessageThreadPage = lazy(() => import("./AdminMessageThreadPage"));
const AdminPaymentsPage = lazy(() => import("./AdminPaymentsConsole"));
const TransactionInspectorPage = lazy(() => import("./TransactionInspectorPage"));
const TransactionJsonPage = lazy(() => import("./TransactionJsonPage"));
const AdminBalancePage = lazy(() => import("./AdminBalancePage"));
const AdminPayoutsManager = lazy(() => import("./AdminPayoutsManager"));
const AdminReportsPage = lazy(() => import("./AdminReportsPage"));
const AdminSellerApplicationsPage = lazy(() => import("./AdminSellerApplicationsPage"));
const AdminModerationQueuePage = lazy(() => import("./AdminModerationQueuePage"));
const AdminAuditLogPage = lazy(() => import("./AdminAuditLogPage"));
const AdminSetupPage = lazy(() => import("./AdminSetupPage"));
const AdminPayoutDestinationRequestsPage = lazy(() => import("./AdminPayoutDestinationRequestsPage"));
const AdminEventModerationPage = lazy(() => import("./AdminEventModerationPage"));
const AdminRouteGuard = lazy(() => import("./components/AdminRouteGuard"));
const BecomeSellerPage = lazy(() => import("./BecomeSellerPage"));
const BuyerPaymentsPage = lazy(() => import("./BuyerPaymentsPage"));
const TicketsPage = lazy(() => import("./TicketsPage"));
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
const AboutPage = lazy(() => import("./components/AboutPage"));
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
const SellersDirectoryPage = lazy(() => import("./SellersDirectoryPage"));
const SignupPage = lazy(() => import("./SignupPage"));
const TermsPage = lazy(() => import("./components/TermsPage"));
const VerifyEmailPage = lazy(() => import("./VerifyEmailPage"));
const PaymentReturnPage = lazy(() => import("./PaymentReturnPage"));
const ConnectCallbackPage = lazy(() => import("./ConnectCallbackPage"));
const PaymentsHubPage = lazy(() => import("./PaymentsHubPage"));
const TrackOrderPage = lazy(() => import("./TrackOrderPage"));
const DisputesPage = lazy(() => import("./DisputesPage"));
const EventsDirectoryPage = lazy(() => import("./EventsDirectoryPage"));
const EventDetailsPage = lazy(() => import("./EventDetailsPage"));
const EventsCreatePage = lazy(() => import("./EventsCreatePage"));
const EventCreatorDashboardPage = lazy(() => import("./EventCreatorDashboardPage"));

function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-8">
      <div className="relative h-24 w-24" role="status" aria-label="Loading BuyMesho">
        <svg
          className="absolute inset-0 h-full w-full animate-loader-spin"
          viewBox="0 0 96 96"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-zinc-100"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="125 126"
            className="text-red-600"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={logoImage}
            alt="BuyMesho"
            width={54}
            height={54}
            className="h-[54px] w-[54px] object-contain"
          />
        </div>
      </div>
    </div>
  );
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
const HOMEPAGE_TITLE = "BuyMesho — Malawi's Secure E-commerce Platform";
const HOMEPAGE_DESCRIPTION =
  "BuyMesho is Malawi's secure e-commerce platform for discovering and buying products, services, and tickets from sellers across the country.";

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
        title: HOMEPAGE_TITLE,
        description: HOMEPAGE_DESCRIPTION,
        canonicalPath: "/",
      };
    case "/signup":
      return {
        title: "Create a BuyMesho Account",
        description: "Join BuyMesho to buy, sell, and manage your marketplace activity.",
        canonicalPath: "/signup",
      };
    case "/about":
      return {
        title: "About BuyMesho — Malawi's Secure E-commerce Platform",
        description: "Learn what BuyMesho is, who it serves, and how the e-commerce platform works.",
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
    case "/explore/lending":
      return {
        title: "BuyMesho Lending",
        description: "Lending on BuyMesho is coming soon.",
        canonicalPath: "/explore/lending",
        noindex: true,
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
    case "/transaction-json":
      return {
        title: "Transaction JSON — BuyMesho",
        description: "Deep-link JSON view for transaction debugging.",
        canonicalPath: "/transaction-json",
        noindex: true,
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
  const [copilotOpen, setCopilotOpen] = useState(false);
  const threadConversationId = new URLSearchParams(locationSearch).get("conversation");
  const isMessageThread = route === "messages" && !!threadConversationId;
  const isAdminMessageThread = route === "admin_messages" && !!threadConversationId;
  const isOrderDisputePath = locationPath.startsWith("/orders/") && locationPath.endsWith("/dispute");
  const isOrderTrackingPath = locationPath.startsWith("/orders/") && !locationPath.endsWith("/dispute");
  const isEventsCreatePath = locationPath === EVENTS_CREATE_PATH;
  const isEventsManagePath = locationPath === EVENTS_MANAGE_PATH;
  const isEventsDirectoryPath = locationPath === EVENTS_PATH && !new URLSearchParams(locationSearch).has("event");
  const isEventDetailsPath = locationPath === EVENTS_PATH && new URLSearchParams(locationSearch).has("event");

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    const handleOpenCopilot = () => setCopilotOpen(true);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("open-buymesho-copilot", handleOpenCopilot);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("open-buymesho-copilot", handleOpenCopilot);
    };
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

  return (
    <>
      <Suspense fallback={<RouteLoader />}>
        {isEventsCreatePath ? (
          <EventsCreatePage />
        ) : isEventsManagePath ? (
          <EventCreatorDashboardPage />
        ) : isEventDetailsPath ? (
          <EventDetailsPage />
        ) : isEventsDirectoryPath ? (
          <EventsDirectoryPage />
        ) : locationPath === "/explore/lay-by" || locationPath === "/explore/accommodation" || locationPath === "/explore/innovation" || locationPath === "/explore/lending" ? (
          <MarketComingSoonPage />
        ) : locationPath === "/explore/sellers" ? (
          <SellersDirectoryPage />
        ) : locationPath.startsWith("/market/coming-soon") ? (
          <MarketComingSoonPage />
        ) : locationPath === "/connect/callback" ? (
          <ConnectCallbackPage />
        ) : locationPath === "/transaction-json" ? (
          <TransactionJsonPage />
        ) : route === "listing_details" ? (
          <ListingDetailsPage />
        ) : locationPath.startsWith("/orders/") && locationPath.endsWith("/dispute") ? (
          <OrderDisputePage />
        ) : isOrderTrackingPath ? (
          <OrderTrackingPage />
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
        ) : route === "admin_messages" ? (
          isAdminMessageThread ? <AdminMessageThreadPage /> : <AdminMessagesPage />
        ) : route === "admin_events" ? (
          <AdminEventModerationPage />
        ) : route === "admin_payments" ? (
          <AdminPaymentsPage />
        ) : route === "admin_transaction_inspector" || locationPath === ADMIN_TRANSACTION_INSPECTOR_PATH ? (
          <TransactionInspectorPage />
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

      {/* BuyMesho AI Floating Launcher */}
      {!copilotOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-5 sm:right-6 z-[99]">
          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="p-0 transition-transform hover:scale-110 active:scale-95 cursor-pointer block drop-shadow-md"
            title="Open BuyMesho AI"
            aria-label="BuyMesho AI"
          >
            <AiIcon className="w-12 h-12" />
          </button>
        </div>
      )}

      <BuyMeshoCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onSelectListing={(id) => {
          setCopilotOpen(false);
          navigateToPath(`/listings/${id}`);
        }}
      />

      <ScrollToTopFab show={showScrollTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      <PwaInstallPrompt />
    </>
  );
}
