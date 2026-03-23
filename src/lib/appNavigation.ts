export type AppRoute = "home" | "explore" | "saved" | "settings" | "seller" | "create" | "edit";

export const HOME_PATH = "/";
export const EXPLORE_PATH = "/explore";
export const SAVED_PATH = "/saved";
export const SETTINGS_PATH = "/settings";
export const SELLER_PATH = "/seller";
export const CREATE_PATH = "/create";
export const EDIT_PATH = "/edit";

export const getAppRouteFromLocation = (
  location: Pick<Location, "pathname" | "search">
): AppRoute => {
  const params = new URLSearchParams(location.search);

  if (location.pathname === EDIT_PATH && params.has("id")) {
    return "edit";
  }

  if (location.pathname === CREATE_PATH) {
    return "create";
  }

  if (location.pathname === SELLER_PATH && params.has("uid")) {
    return "seller";
  }

  if (location.pathname === SETTINGS_PATH) {
    return "settings";
  }

  if (location.pathname === SAVED_PATH) {
    return "saved";
  }

  if (location.pathname === EXPLORE_PATH || params.has("listing")) {
    return "explore";
  }

  return "home";
};

export const navigateToPath = (path: string) => {
  const url = new URL(window.location.href);
  url.pathname = path;

  if (path !== EXPLORE_PATH) {
    url.searchParams.delete("listing");
    url.searchParams.delete("image");
  }

  if (path !== SELLER_PATH) {
    url.searchParams.delete("uid");
  }

  if (path !== EDIT_PATH) {
    url.searchParams.delete("id");
  }

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToExploreListing = (
  listingId: string | number,
  imageIndex: number = 0
) => {
  const url = new URL(window.location.href);
  url.pathname = EXPLORE_PATH;
  url.searchParams.set("listing", String(listingId));
  url.searchParams.set("image", String(imageIndex));
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToSellerProfile = (uid: string) => {
  const url = new URL(window.location.href);
  url.pathname = SELLER_PATH;
  url.searchParams.set("uid", uid);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("id");

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToCreateListing = () => {
  const url = new URL(window.location.href);
  url.pathname = CREATE_PATH;
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToEditListing = (listingId: string | number) => {
  const url = new URL(window.location.href);
  url.pathname = EDIT_PATH;
  url.searchParams.set("id", String(listingId));
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const getSellerUidFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
};

export const getEditListingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("id");
  return value ? Number(value) : null;
};
