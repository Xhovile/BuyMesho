import { useEffect, useState } from "react";
import App from "./App";
import CreateListingPage from "./CreateListingPage";
import EditListingPage from "./EditListingPage";
import ForgotPasswordPage from "./ForgotPasswordPage";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
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

  if (route === "explore") {
    return <App />;
  }

  if (route === "saved") {
    return <SavedPage />;
  }

  if (route === "settings") {
    return <SettingsPage />;
  }

  if (route === "seller") {
    return <SellerProfilePage />;
  }

  if (route === "create") {
    return <CreateListingPage />;
  }

  if (route === "edit") {
    return <EditListingPage />;
  }

  if (route === "login") {
    return <LoginPage />;
  }

  if (route === "signup") {
    return <SignupPage />;
  }

  if (route === "forgot_password") {
    return <ForgotPasswordPage />;
  }

  if (route === "profile") {
    return <ProfilePage />;
  }

  return <HomePage />;
}
