import { navigateToPath } from "./appNavigation";

export const MESSAGES_PATH = "/messages";

export const navigateToMessages = () => navigateToPath(MESSAGES_PATH);

export const navigateToMessagesForListing = (listingId: string | number) => {
  const url = new URL(window.location.href);
  url.pathname = MESSAGES_PATH;
  url.searchParams.set("listing", String(listingId));
  url.searchParams.delete("conversation");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const navigateToConversation = (conversationId: string | number) => {
  const url = new URL(window.location.href);
  url.pathname = MESSAGES_PATH;
  url.searchParams.set("conversation", String(conversationId));
  url.searchParams.delete("listing");
  url.searchParams.delete("image");
  url.searchParams.delete("uid");
  url.searchParams.delete("id");

  window.history.pushState({}, "", url.toString());
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
};

export const getConversationIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("conversation");
  return value ? Number(value) : null;
};

export const getListingIdFromMessagesUrl = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get("listing");
  return value ? Number(value) : null;
};
