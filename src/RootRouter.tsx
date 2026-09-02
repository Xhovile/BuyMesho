import { Suspense, useEffect, useState } from "react";
import { getAppRouteFromLocation, type AppRoute, EXPLORE_PATH } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { RouteLoader } from "./router/RootRouterGlobalUI";
import RootRouterGlobalUI from "./router/RootRouterGlobalUI";
import RootRouterRoutes from "./router/RootRouterRoutes";
import { useRootRouterAuthGuard } from "./router/RootRouterAuth";
import { useRootRouterSeo } from "./router/RootRouterSeo";

export default function RootRouter() {
  const [route, setRoute] = useState<AppRoute>(() => getAppRouteFromLocation(window.location));
  const [locationSearch, setLocationSearch] = useState(() => window.location.search);
  const [locationPath, setLocationPath] = useState(() => window.location.pathname);
  const { user: firebaseUser, loading: authLoading } = useAuthUser();

  useEffect(() => {
    const handleRouteChange = () => {
      setRoute(getAppRouteFromLocation(window.location));
      setLocationSearch(window.location.search);
      setLocationPath(window.location.pathname);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useRootRouterSeo(locationPath, route);
  useRootRouterAuthGuard({
    authLoading,
    firebaseUser,
    route,
    locationPath,
    locationSearch,
  });

  const isExploreChipRoute =
    locationPath === EXPLORE_PATH || locationPath.startsWith(`${EXPLORE_PATH}/`);

  return (
    <>
      <Suspense
        fallback={
          <div className={isExploreChipRoute ? "-translate-y-4" : undefined}>
            <RouteLoader />
          </div>
        }
      >
        <RootRouterRoutes
          route={route}
          locationPath={locationPath}
          locationSearch={locationSearch}
          firebaseUser={firebaseUser}
        />
      </Suspense>

      <RootRouterGlobalUI />
    </>
  );
}
