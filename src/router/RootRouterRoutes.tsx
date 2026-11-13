import { lazy, type ReactNode } from "react";
import { DISPUTES_PATH, EVENTS_CREATE_PATH, EVENTS_MANAGE_PATH, EVENTS_PATH, HOME_PATH, isXhovileStudioPath, navigateToPath, TRACK_ORDER_PATH, type AppRoute } from "../lib/appNavigation";
import AdminWorkspaceShell from "../modules/admin/AdminWorkspaceShell";
const App=lazy(()=>import("../App.new")); const AdminHubPage=lazy(()=>import("../AdminHubPage")); const AdminDisputesPage=lazy(()=>import("../AdminDisputesPage")); const AdminEventPayoutRecoveryPage=lazy(()=>import("../AdminEventPayoutRecoveryPage")); const AdminMessagesPage=lazy(()=>import("../AdminMessagesPage")); const AdminMessageThreadPage=lazy(()=>import("../AdminMessageThreadPage")); const AdminPaymentsPage=lazy(()=>import("../AdminPaymentsConsole")); const TransactionInspectorPage=lazy(()=>import("../TransactionInspectorPage")); const TransactionJsonPage=lazy(()=>import("../TransactionJsonPage")); const AdminBalancePage=lazy(()=>import("../AdminBalancePage")); const AdminPayoutsManager=lazy(()=>import("../AdminPayoutsManager")); const AdminReportsPage=lazy(()=>import("../AdminReportsPage")); const AdminSellerApplicationsPage=lazy(()=>import("../AdminSellerApplicationsPage")); const AdminModerationQueuePage=lazy(()=>import("../AdminModerationQueuePage")); const AdminAuditLogPage=lazy(()=>import("../AdminAuditLogPage")); const AdminSetupPage=lazy(()=>import("../AdminSetupPage")); const AdminEventModerationPage=lazy(()=>import("../AdminEventModerationPage")); const BecomeSellerPage=lazy(()=>import("../BecomeSellerPage")); const BuyerPaymentsPage=lazy(()=>import("../BuyerPaymentsPage")); const TicketsPage=lazy(()=>import("../TicketsPage")); const CartPage=lazy(()=>import("../CartPage")); const ChangeEmailPage=lazy(()=>import("../ChangeEmailPage")); const ChangePasswordPage=lazy(()=>import("../ChangePasswordPage")); const CreateListingPage=lazy(()=>import("../CreateListingPage")); const EditListingPage=lazy(()=>import("../EditListingPage")); const EditProfilePage=lazy(()=>import("../EditProfilePage")); const EmailActionPage=lazy(()=>import("../EmailActionPage")); const ForgotPasswordPage=lazy(()=>import("../ForgotPasswordPage")); const HiddenCollectionsPage=lazy(()=>import("../HiddenCollectionsPage")); const HomePage=lazy(()=>import("../HomePage")); const AboutPage=lazy(()=>import("../components/AboutPage")); const ListingDetailsPage=lazy(()=>import("../ListingDetailsPage")); const ListingReviewsPage=lazy(()=>import("../ListingReviewsPage")); const LoginPage=lazy(()=>import("../LoginPage")); const MarketComingSoonPage=lazy(()=>import("../MarketComingSoonPage")); const MessageThreadPage=lazy(()=>import("../MessageThreadPage")); const MessagesInboxPage=lazy(()=>import("../MessagesInboxPage")); const MyListingsPage=lazy(()=>import("../MyListingsPage")); const OrderDisputePage=lazy(()=>import("../OrderDisputePage")); const OrderTrackingPage=lazy(()=>import("../OrderTrackingPage")); const PrivacyPolicyPage=lazy(()=>import("../components/PrivacyPolicyPage")); const ProfilePage=lazy(()=>import("../ProfilePage")); const ReportProblemPage=lazy(()=>import("../components/ReportProblemPage")); const SafetyTipsPage=lazy(()=>import("../components/SafetyTipsPage")); const SavedPage=lazy(()=>import("../SavedPage")); const SettingsPage=lazy(()=>import("../SettingsPage")); const SellerProfilePage=lazy(()=>import("../SellerProfilePage")); const SellerDashboardPage=lazy(()=>import("../SellerDashboardPage")); const SellerPayoutsPage=lazy(()=>import("../SellerPayoutsPage")); const SellersDirectoryPage=lazy(()=>import("../SellersDirectoryPage")); const BuyOnlineMalawiPage=lazy(()=>import("../BuyOnlineMalawiPage")); const SellOnlineMalawiPage=lazy(()=>import("../SellOnlineMalawiPage")); const EventBuyerGuidePage=lazy(()=>import("../EventBuyerGuidePage")); const EventCreatorGuidePage=lazy(()=>import("../EventCreatorGuidePage")); const SignupPage=lazy(()=>import("../SignupPage")); const TermsPage=lazy(()=>import("../components/TermsPage")); const VerifyEmailPage=lazy(()=>import("../VerifyEmailPage")); const AccountSetupPage=lazy(()=>import("../AccountSetupPage")); const PaymentReturnPage=lazy(()=>import("../PaymentReturnPage")); const ConnectCallbackPage=lazy(()=>import("../ConnectCallbackPage")); const PaymentsHubPage=lazy(()=>import("../PaymentsHubPage")); const TrackOrderPage=lazy(()=>import("../TrackOrderPage")); const DisputesPage=lazy(()=>import("../DisputesPage")); const EventsDirectoryPage=lazy(()=>import("../EventsDirectoryPage")); const EventDetailsPage=lazy(()=>import("../EventDetailsPage")); const EventsCreatePage=lazy(()=>import("../EventsCreatePage")); const EventCreatorDashboardPage=lazy(()=>import("../EventCreatorDashboardPage")); const InstallPage=lazy(()=>import("../InstallPage")); const XhovileStudioPaymentPage=lazy(()=>import("../XhovileStudio"));
export function prefetchWorkspaceRoutes({isAdmin,isSeller}:{isAdmin:boolean;isSeller:boolean}){const imports:Array<Promise<unknown>>=[];if(isAdmin)imports.push(import("../AdminModerationQueuePage"));if(isSeller)imports.push(import("../SellerPayoutsPage"));if(imports.length)void Promise.allSettled(imports);}
type RootRouterRoutesProps={route:AppRoute;locationPath:string;locationSearch:string;firebaseUser:{emailVerified?:boolean}|null};
export default function RootRouterRoutes({route,locationPath,locationSearch,firebaseUser}:RootRouterRoutesProps){const threadConversationId=new URLSearchParams(locationSearch).get("conversation");const isMessageThread=route==="messages"&&!!threadConversationId;const isAdminMessageThread=route==="admin_messages"&&!!threadConversationId;const isOrderTrackingPath=locationPath.startsWith("/orders/")&&!locationPath.endsWith("/dispute");const isEventDetailsPath=locationPath===EVENTS_PATH&&new URLSearchParams(locationSearch).has("event");const isEventsDirectoryPath=locationPath===EVENTS_PATH&&!new URLSearchParams(locationSearch).has("event");
if (route === "admin" || route.startsWith("admin_")) {
  let adminPage: ReactNode = null;
  switch (route) {
    case "admin":
      adminPage = <AdminHubPage />;
      break;
    case "admin_disputes":
      adminPage = <AdminDisputesPage />;
      break;
    case "admin_event_payout_recovery":
      adminPage = <AdminEventPayoutRecoveryPage />;
      break;
    case "admin_messages":
      adminPage = isAdminMessageThread ? <AdminMessageThreadPage /> : <AdminMessagesPage />;
      break;
    case "admin_events":
      adminPage = <AdminEventModerationPage />;
      break;
    case "admin_payments":
      adminPage = <AdminPaymentsPage />;
      break;
    case "admin_transaction_inspector":
      adminPage = <TransactionInspectorPage />;
      break;
    case "admin_payouts":
      adminPage = <AdminPayoutsManager />;
      break;
    case "admin_reports":
      adminPage = <AdminReportsPage />;
      break;
    case "admin_seller_applications":
      adminPage = <AdminSellerApplicationsPage />;
      break;
    case "admin_moderation_queue":
      adminPage = <AdminModerationQueuePage />;
      break;
    case "admin_audit":
      adminPage = <AdminAuditLogPage />;
      break;
    case "admin_balance":
      adminPage = <AdminBalancePage />;
      break;
    case "admin_setup":
      adminPage = <AdminSetupPage />;
      break;
    default:
      return null;
  }

  const pageKey = route === "admin_messages"
    ? `${locationPath}${locationSearch}`
    : locationPath;

  return (
    <AdminWorkspaceShell
      pathname={locationPath}
      pageKey={pageKey}
      showNav={route !== "admin"}
    >
      {adminPage}
    </AdminWorkspaceShell>
  );
}
return <>{isXhovileStudioPath(locationPath)?<XhovileStudioPaymentPage/>:locationPath==="/install"?<InstallPage/>:locationPath===EVENTS_CREATE_PATH?<EventsCreatePage/>:locationPath===EVENTS_MANAGE_PATH?<EventCreatorDashboardPage/>:isEventDetailsPath?<EventDetailsPage/>:isEventsDirectoryPath?<EventsDirectoryPage/>:locationPath==="/explore/lay-by"||locationPath==="/explore/accommodation"||locationPath==="/explore/innovation"||locationPath==="/explore/lending"?<MarketComingSoonPage/>:locationPath==="/explore/sellers"?<SellersDirectoryPage/>:locationPath.startsWith("/market/coming-soon")?<MarketComingSoonPage/>:locationPath==="/connect/callback"?<ConnectCallbackPage/>:locationPath==="/transaction-json"?<TransactionJsonPage/>:route==="listing_reviews"?<ListingReviewsPage/>:route==="listing_details"?<ListingDetailsPage/>:locationPath.startsWith("/orders/")&&locationPath.endsWith("/dispute")?<OrderDisputePage/>:isOrderTrackingPath?<OrderTrackingPage/>:locationPath===TRACK_ORDER_PATH?<TrackOrderPage/>:locationPath===DISPUTES_PATH?<DisputesPage/>:locationPath==="/buyer-payments"?<BuyerPaymentsPage/>:locationPath==="/tickets"?<TicketsPage/>:locationPath==="/cart"?<CartPage/>:locationPath==="/payments"?<PaymentsHubPage/>:locationPath==="/payments/return"?<TrackOrderPage/>:locationPath==="/payments/track-order"?<TrackOrderPage/>:route==="about"?<AboutPage/>:route==="buy_online_malawi"?<BuyOnlineMalawiPage/>:route==="sell_online_malawi"?<SellOnlineMalawiPage/>:route==="event_buyer_guide"?<EventBuyerGuidePage/>:route==="event_creator_guide"?<EventCreatorGuidePage/>:route==="category"?null:route==="explore"?<App/>:route==="saved"?<SavedPage/>:route==="hidden"?<HiddenCollectionsPage/>:route==="login"?<LoginPage/>:route==="signup"?<SignupPage/>:route==="forgot_password"?<ForgotPasswordPage/>:route==="profile"?<ProfilePage/>:route==="verify_email"?<VerifyEmailPage/>:route==="account_setup"?<AccountSetupPage/>:route==="edit_profile"?<EditProfilePage/>:route==="edit_account"?<AccountSetupPage/>:route==="settings"?<SettingsPage/>:route==="privacy"?<PrivacyPolicyPage onBack={()=>navigateToPath(HOME_PATH)}/>:route==="terms"?<TermsPage onBack={()=>navigateToPath(HOME_PATH)}/>:route==="safety"?<SafetyTipsPage onBack={()=>navigateToPath(HOME_PATH)}/>:route==="report"?<ReportProblemPage onBack={()=>navigateToPath(HOME_PATH)} isLoggedIn={!!firebaseUser}/>:route==="seller"?<SellerProfilePage/>:route==="seller_dashboard"?<SellerDashboardPage/>:route==="seller_payouts"?<SellerPayoutsPage/>:route==="my_listings"?<MyListingsPage/>:route==="messages"?(isMessageThread?<MessageThreadPage/>:<MessagesInboxPage/>):route==="create"?<CreateListingPage/>:route==="edit"?<EditListingPage/>:route==="email_action"?<EmailActionPage/>:route==="change_password"?<ChangePasswordPage/>:route==="change_email"?<ChangeEmailPage/>:route==="become_seller"?<BecomeSellerPage/>:route==="payment_return"?<PaymentReturnPage/>:route==="event_creator_dashboard"||route==="event_creator_overview"?<EventCreatorDashboardPage/>:<HomePage/>}</>;
}
