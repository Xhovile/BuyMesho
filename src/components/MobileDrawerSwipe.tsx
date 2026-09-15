import { useEffect, useRef } from "react";

const MOBILE_BREAKPOINT = 768;
const EDGE_ZONE_PX = 40;
const OPEN_THRESHOLD_PX = 80;
const MAX_VERTICAL_DRIFT_PX = 100;

function isMobileViewport() {
  return typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
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

/** Enables a right-edge swipe-to-open gesture without changing the existing tap controls. */
export default function MobileDrawerSwipe() {
  const trackingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const horizontalIntentRef = useRef(false);

  useEffect(() => {
    const resetTracking = () => {
      trackingRef.current = false;
      horizontalIntentRef.current = false;
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (!isMobileViewport() || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const drawerOpen = document.querySelector(
        '#mobile-header-menu, #mobile-home-menu',
      );

      // Only track gestures that begin at the right edge while the drawer is closed.
      if (window.innerWidth - touch.clientX > EDGE_ZONE_PX || drawerOpen) {
        resetTracking();
        return;
      }

      trackingRef.current = true;
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

        if (deltaX < -12) {
          horizontalIntentRef.current = true;
        }
      }

      if (horizontalIntentRef.current && deltaX < -12) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!trackingRef.current) return;

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = touch.clientY - startYRef.current;

      resetTracking();

      if (
        deltaX <= -OPEN_THRESHOLD_PX &&
        Math.abs(deltaY) <= MAX_VERTICAL_DRIFT_PX
      ) {
        openVisibleMobileDrawer();
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
