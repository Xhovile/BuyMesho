import { Suspense, useEffect, useState } from "react";
import { getAppRouteFromLocation, type AppRoute, EXPLORE_PATH } from "./lib/appNavigation";
import { useAuthUser } from "./hooks/useAuthUser";
import { getCachedHeaderCapabilities } from "./lib/headerCapabilities";
import { RouteLoader } from "./router/RootRouterGlobalUI";
import RootRouterGlobalUI from "./router/RootRouterGlobalUI";
import RootRouterRoutes, { prefetchWorkspaceRoutes } from "./router/RootRouterRoutes";
import { useRootRouterAuthGuard } from "./router/RootRouterAuth";
import { useRootRouterSeo } from "./router/RootRouterSeo";

function normalizeLocationPath(pathname: string) {
  return pathname === "/" ? "/" : pathname.replace(/\/+$/, "") || "/";
}

export default function RootRouter() {
  const initialPath = normalizeLocationPath(window.location.pathname);
  const [route, setRoute] = useState<AppRoute>(() =>
    getAppRouteFromLocation({
      pathname: initialPath,
      search: window.location.search,
    }),
  );
  const [locationSearch, setLocationSearch] = useState(() => window.location.search);
  const [locationPath, setLocationPath] = useState(() => initialPath);
  const { user: firebaseUser, loading: authLoading } = useAuthUser();

  useEffect(() => {
    const handleRouteChange = () => {
      const pathname = normalizeLocationPath(window.location.pathname);
      setRoute(
        getAppRouteFromLocation({
          pathname,
          search: window.location.search,
        }),
      );
      setLocationSearch(window.location.search);
      setLocationPath(pathname);
    };
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;

    const prefetch = () => {
      const cached = getCachedHeaderCapabilities(firebaseUser.uid);
      prefetchWorkspaceRoutes({
        isAdmin: cached?.isAdmin === true,
        isSeller: cached?.isSeller === true,
      });
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === "function") {
      const idleId = idleWindow.requestIdleCallback(prefetch, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 300);
    return () => window.clearTimeout(timeoutId);
  }, [authLoading, firebaseUser]);

  useRootRouterSeo(locationPath, route, locationSearch);
  useRootRouterAuthGuard({
    authLoading,
    firebaseUser,
    route,
    locationPath,
    locationSearch,
  });

  const isExploreChipRoute = locationPath === EXPLORE_PATH || locationPath.startsWith(`${EXPLORE_PATH}/`);

  return (
    <>
      <Suspense
        fallback={
          <div className={isExploreChipRoute ? "-translate-y-12" : undefined}>
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
