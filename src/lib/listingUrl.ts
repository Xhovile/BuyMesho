import { LISTING_PATH } from "./appNavigation";

export const getListingParamsFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const listing = params.get("listing");
  const image = params.get("image");

  return {
    listing,
    imageIndex: image !== null && !Number.isNaN(Number(image)) ? Number(image) : 0,
  };
};

export const getListingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("listing");
};

export const buildListingShareUrl = (
  id: string | number,
  imageIndex: number = 0
) => {
  const url = new URL(window.location.href);
  url.pathname = LISTING_PATH;
  url.searchParams.set("listing", String(id));
  url.searchParams.set("image", String(imageIndex));
  url.searchParams.delete("uid");
  url.searchParams.delete("id");
  return url.toString();
};

export const syncListingParamsInUrl = (
  id: string | number,
  imageIndex: number = 0
) => {
  const url = new URL(window.location.href);
  url.pathname = LISTING_PATH;
  url.searchParams.set("listing", String(id));
  url.searchParams.set("image", String(imageIndex));
  url.searchParams.delete("uid");
  url.searchParams.delete("id");
  window.history.replaceState({}, "", url.toString());
};

export const clearListingParamFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  window.history.replaceState({}, "", url.toString());
};
