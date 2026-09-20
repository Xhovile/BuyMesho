import { useEffect, useRef } from "react";

const MOBILE_BREAKPOINT = 768;
const EDGE_ZONE_PX = 60;
const OPEN_THRESHOLD_PX = 80;
const CLOSE_THRESHOLD_PX = 80;
const MAX_VERTICAL_DRIFT_PX = 100;

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
}

function getVisibleMobileDrawer(): HTMLElement | null {
  const drawers = Array.from(
    document.querySelectorAll<HTMLElement>("#mobile-header-menu, #mobile-home-menu"),
  );
  return drawers.find((drawer) => drawer.offsetWidth > 0 || drawer.offsetHeight > 0) ?? null;
}

function openVisibleMobileDrawer() {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      'button[aria-controls="mobile-header-menu"], button[aria-controls="mobile-home-menu"]',
    ),
  );

  const openButton = buttons.find(
    (button) =>
      button.getAttribute("aria-expanded") === "false" &&
      (button.offsetWidth > 0 || button.offsetHeight > 0),
  );

  openButton?.click();
}

function closeVisibleMobileDrawer() {
  const drawer = getVisibleMobileDrawer();
  if (!drawer) return;

  const closeButton = drawer.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]');
  closeButton?.click();
}

/** Enables edge-swipe open/close gestures without changing the existing tap controls. */
export default function MobileDrawerSwipe() {
  const trackingRef = useRef(false);
  const modeRef = useRef<"open" | "close" | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const horizontalIntentRef = useRef(false);

  useEffect(() => {
    const resetTracking = () => {
      trackingRef.current = false;
      modeRef.current = null;
      horizontalIntentRef.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isMobileViewport() || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const drawer = getVisibleMobileDrawer();

      if (drawer) {
        if (!drawer.contains(event.target as Node)) {
          resetTracking();
          return;
        }

        trackingRef.current = true;
        modeRef.current = "close";
        horizontalIntentRef.current = false;
        startXRef.current = touch.clientX;
        startYRef.current = touch.clientY;
        return;
      }

      if (window.innerWidth - touch.clientX > EDGE_ZONE_PX) {
        resetTracking();
        return;
      }

      trackingRef.current = true;
      modeRef.current = "open";
      horizontalIntentRef.current = false;
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!trackingRef.current || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      if (!horizontalIntentRef.current) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 12) {
          resetTracking();
          return;
        }

        const horizontalDirection = modeRef.current === "open" ? deltaX < -12 : deltaX > 12;
        if (horizontalDirection) horizontalIntentRef.current = true;
      }

      const horizontalDirection = modeRef.current === "open" ? deltaX < -12 : deltaX > 12;
      if (horizontalIntentRef.current && horizontalDirection) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!trackingRef.current) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;
      const mode = modeRef.current;

      resetTracking();

      if (Math.abs(deltaY) > MAX_VERTICAL_DRIFT_PX) return;

      if (mode === "open" && deltaX <= -OPEN_THRESHOLD_PX) {
        openVisibleMobileDrawer();
      } else if (mode === "close" && deltaX >= CLOSE_THRESHOLD_PX) {
        closeVisibleMobileDrawer();
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", resetTracking, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", resetTracking);
    };
  }, []);

  return null;
}
