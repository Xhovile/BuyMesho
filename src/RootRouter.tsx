import { lazy, Suspense, useEffect, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getAppRouteFromLocation, type AppRoute } from "./lib/appNavigation";

const App = lazy(() => import("./App.new"));
const AdminReportsPage = lazy(() => import("./AdminReportsPage"));
const AdminSellerApplicationsPage = lazy(() => import("./AdminSellerApplicationsPage"));
const AdminRouteGuard = lazy(() => import("./components/AdminRouteGuard"));
const BecomeSellerPage = lazy(() => import("./BecomeSellerPage"));
const ChangePasswordPage = lazy(() => import("./ChangePasswordPage"));
const CategoryPage = lazy(() => import("./CategoryPage"));
const CreateListingPage = lazy(() => import("./CreateListingPage"));
const EditAccountPage = lazy(() => import("./EditAccountPage"));
const EditListingPage = lazy(() => import("./EditListingPage"));
const EditProfilePage = lazy(() => import("./EditProfilePage"));
const ForgotPasswordPage = lazy(() => import("./ForgotPasswordPage"));
const HiddenCollectionsPage = lazy(() => import("./HiddenCollectionsPage"));
const HomePage = lazy(() => import("./HomePage"));
const ListingDetailsPage = lazy(() => import("./ListingDetailsPage"));
const LoginPage = lazy(() => import("./LoginPage"));
const MyListingsPage = lazy(() => import("./MyListingsPage"));
const PrivacyPolicyPage = lazy(() => import("./components/PrivacyPolicyPage"));
const ProfilePage = lazy(() => import("./ProfilePage"));
const ReportProblemPage = lazy(() => import("./components/ReportProblemPage"));
const SafetyTipsPage = lazy(() => import("./components/SafetyTipsPage"));
const SavedPage = lazy(() => import("./SavedPage"));
const SettingsPage = lazy(() => import("./SettingsPage"));
const SellerProfilePage = lazy(() => import("./SellerProfilePage"));
const SignupPage = lazy(() => import("./SignupPage"));
const TermsPage = lazy(() => import("./components/TermsPage"));

export default function RootRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    getAppRouteFromLocation(window.location)
  );

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(getAppRouteFromLocation(window.location));
    };

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  useEffect(() => {
    void Promise.allSettled([
      import("./App.new"),
      import("./HomePage"),
      import("./CategoryPage"),
    ]);
  }, []);

  return (
    <>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
        {route === "category" ? <CategoryPage /> :
        route === "explore" ? <App /> :
        route === "saved" ? <SavedPage /> :
        route === "hidden" ? <HiddenCollectionsPage /> :
        route === "settings" ? <SettingsPage /> :
        route === "privacy" ? <PrivacyPolicyPage onBack={() => window.history.back()} /> :
        route === "terms" ? <TermsPage onBack={() => window.history.back()} /> :
        route === "safety" ? <SafetyTipsPage onBack={() => window.history.back()} /> :
        route === "report" ? <ReportProblemPage onBack={() => window.history.back()} isLoggedIn={false} /> :
        route === "seller" ? <SellerProfilePage /> :
        route === "listing_details" ? <ListingDetailsPage /> :
        route === "create" ? <CreateListingPage /> :
        route === "edit" ? <EditListingPage /> :
        route === "login" ? <LoginPage /> :
        route === "signup" ? <SignupPage /> :
        route === "forgot_password" ? <ForgotPasswordPage /> :
        route === "profile" ? <ProfilePage /> :
        route === "edit_profile" ? <EditProfilePage /> :
        route === "edit_account" ? <EditAccountPage /> :
        route === "become_seller" ? <BecomeSellerPage /> :
        route === "change_password" ? <ChangePasswordPage /> :
        route === "my_listings" ? <MyListingsPage /> :
        route === "admin_reports" ? (
          <AdminRouteGuard><AdminReportsPage /></AdminRouteGuard>
        ) :
        route === "admin_seller_applications" ? (
          <AdminRouteGuard><AdminSellerApplicationsPage /></AdminRouteGuard>
        ) :
        <HomePage />}
      </Suspense>
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.92 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 h-12 w-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-400/30 flex items-center justify-center transition-all active:scale-95"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
