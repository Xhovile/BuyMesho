import { useEffect, useState } from "react";
import App from "./App";
import HomePage from "./HomePage";
import SavedPage from "./SavedPage";
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

  return <HomePage />;
}
