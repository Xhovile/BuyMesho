import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase";

export function trackPublicPageView({
  pathname,
  route,
}: {
  pathname: string;
  route: string;
}) {
  if (!analytics || typeof window === "undefined") return;

  try {
    logEvent(analytics, "screen_view", {
      firebase_screen: pathname || "/",
      firebase_screen_class: "BuyMeshoPublicPage",
      page_type: route,
    });
  } catch {
    // Analytics must never affect navigation or page rendering.
  }
}
