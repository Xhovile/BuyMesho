export type AppRoute =
  | "home"
  | "explore"
  | "saved"
  | "settings"
  | "seller"
  | "listing_details"
  | "create"
  | "edit"
  | "login"
  | "signup"
  | "forgot_password"
  | "profile"
  | "edit_profile"
  | "edit_account"
  | "become_seller"
  | "change_password"
  | "my_listings"
  | "admin_reports"
  | "admin_seller_applications";

export const HOME_PATH = "/";
export const EXPLORE_PATH = "/explore";
export const SAVED_PATH = "/saved";
export const SETTINGS_PATH = "/settings";
export const SELLER_PATH = "/seller";
export const LISTING_PATH = "/listing";
export const CREATE_PATH = "/create";
export const EDIT_PATH = "/edit";
export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const FORGOT_PASSWORD_PATH = "/forgot-password";
export const PROFILE_PATH = "/profile";
export const EDIT_PROFILE_PATH = "/edit-profile";
export const EDIT_ACCOUNT_PATH = "/edit-account";
export const BECOME_SELLER_PATH = "/become-seller";
export const CHANGE_PASSWORD_PATH = "/change-password";
export const MY_LISTINGS_PATH = "/my-listings";
export const ADMIN_REPORTS_PATH = "/admin/reports";
export const ADMIN_SELLER_APPLICATIONS_PATH = "/admin/seller-applications";

export const getAppRouteFromLocation = (
  location: Pick<Location, "pathname" | "search">
): AppRoute => {
  const params = new URLSearchParams(location.search);

  if (location.pathname === LISTING_PATH && params.has("listing")) {
    return "listing_details";
  }

  if (location.pathname === EDIT_PATH && params.has("id")) {
    return "edit";
  }

  if (location.pathname === CREATE_PATH) {
    return "create";
  }

  if (location.pathname === LOGIN_PATH) {
    return "login";
  }

  if (location.pathname === SIGNUP_PATH) {
    return "signup";
  }

  if (location.pathname === FORGOT_PASSWORD_PATH) {
    return "forgot_password";
  }

  if (location.pathname === PROFILE_PATH) {
    return "profile";
  }

  if (location.pathname === EDIT_PROFILE_PATH) {
    return "edit_profile";
  }

  if (location.pathname === EDIT_ACCOUNT_PATH) {
    return "edit_account";
  }

  if (location.pathname === BECOME_SELLER_PATH) {
    return "become_seller";
  }

  if (location.pathname === CHANGE_PASSWORD_PATH) {
    return "change_password";
  }

  if (location.pathname === MY_LISTINGS_PATH) {
    return "my_listings";
  }

  if (location.pathname === ADMIN_REPORTS_PATH) {
    return "admin_reports";
  }

  if (location.pathname === ADMIN_SELLER_APPLICATIONS_PATH) {
    return "admin_seller_applications";
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

  if (path !== EXPLORE_PATH && path !== LISTING_PATH) {
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

export const navigateToListingDetails = (
  listingId: string | number,
  imageIndex: number = 0
) => {
  const url = new URL(window.location.href);
  url.pathname = LISTING_PATH;
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

export const navigateToProfile = () => navigateToPath(PROFILE_PATH);
export const navigateToLogin = () => navigateToPath(LOGIN_PATH);
export const navigateToSignup = () => navigateToPath(SIGNUP_PATH);
export const navigateToForgotPassword = () => navigateToPath(FORGOT_PASSWORD_PATH);
export const navigateToEditProfile = () => navigateToPath(EDIT_PROFILE_PATH);
export const navigateToEditAccount = () => navigateToPath(EDIT_ACCOUNT_PATH);
export const navigateToBecomeSeller = () => navigateToPath(BECOME_SELLER_PATH);
export const navigateToChangePassword = () => navigateToPath(CHANGE_PASSWORD_PATH);
export const navigateToMyListings = () => navigateToPath(MY_LISTINGS_PATH);

export const getSellerUidFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("uid");
};

export const getEditListingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("id");
  return value ? Number(value) : null;
};
