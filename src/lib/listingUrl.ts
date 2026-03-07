const getListingIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("listing");
};

const buildListingShareUrl = (id: string | number) => {
  const url = new URL(window.location.href);
  url.searchParams.set("listing", String(id));
  return url.toString();
};

const syncListingParamInUrl = (id: string | number) => {
  const url = new URL(window.location.href);
  url.searchParams.set("listing", String(id));
  window.history.replaceState({}, "", url.toString());
};

const clearListingParamFromUrl = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete("listing");
  window.history.replaceState({}, "", url.toString());
};
