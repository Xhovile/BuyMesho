import { useEffect, useState } from "react";
import App from "./App.new";
import AdminReportsPage from "./AdminReportsPage";
import AdminSellerApplicationsPage from "./AdminSellerApplicationsPage";
import AdminRouteGuard from "./components/AdminRouteGuard";
import BecomeSellerPage from "./BecomeSellerPage";
import ChangePasswordPage from "./ChangePasswordPage";
import CategoryPage from "./CategoryPage";
import CreateListingPage from "./CreateListingPage";
import EditAccountPage from "./EditAccountPage";
import EditListingPage from "./EditListingPage";
import EditProfilePage from "./EditProfilePage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import HomePage from "./HomePage";
import ListingDetailsPage from "./ListingDetailsPage";
import LoginPage from "./LoginPage";
import MyListingsPage from "./MyListingsPage";
import ProfilePage from "./ProfilePage";
import SavedPage from "./SavedPage";
import SettingsPage from "./SettingsPage";
import SellerProfilePage from "./SellerProfilePage";
import SignupPage from "./SignupPage";
import { getAppRouteFromLocation, type AppRoute } from "./lib/appNavigation";

export default function RootRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    getAppRouteFromLocation(window.location)
  );

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(getAppRouteFromLocation(window.location));
    };

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);

  if (route === "category") return <CategoryPage />;
  if (route === "explore") return <App />;
  if (route === "saved") return <SavedPage />;
  if (route === "settings") return <SettingsPage />;
  if (route === "privacy") return <SettingsPage />;
  if (route === "terms") return <SettingsPage />;
  if (route === "safety") return <SettingsPage />;
  if (route === "report") return <SettingsPage />;
  if (route === "seller") return <SellerProfilePage />;
  if (route === "listing_details") return <ListingDetailsPage />;
  if (route === "create") return <CreateListingPage />;
  if (route === "edit") return <EditListingPage />;
  if (route === "login") return <LoginPage />;
  if (route === "signup") return <SignupPage />;
  if (route === "forgot_password") return <ForgotPasswordPage />;
  if (route === "profile") return <ProfilePage />;
  if (route === "edit_profile") return <EditProfilePage />;
  if (route === "edit_account") return <EditAccountPage />;
  if (route === "become_seller") return <BecomeSellerPage />;
  if (route === "change_password") return <ChangePasswordPage />;
  if (route === "my_listings") return <MyListingsPage />;

  if (route === "admin_reports")
    return (
      <AdminRouteGuard>
        <AdminReportsPage />
      </AdminRouteGuard>
    );
  if (route === "admin_seller_applications")
    return (
      <AdminRouteGuard>
        <AdminSellerApplicationsPage />
      </AdminRouteGuard>
    );

  return <HomePage />;
}
