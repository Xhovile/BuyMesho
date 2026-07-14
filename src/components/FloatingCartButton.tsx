import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import ConfirmModal from "./ConfirmModal";
import { navigateToCart, navigateToLoginWithReturnPath } from "../lib/appNavigation";
import { readBuyerCart, refreshBuyerCartFromServer, subscribeToBuyerCartChanges } from "../lib/buyerState";

type FloatingCartButtonProps = {
  isLoggedIn: boolean;
  className?: string;
  stickyHeaderSelector?: string;
};

const MD_BREAKPOINT = 768;
const HEADER_SPACING = 10;
const MIN_TOP_OFFSET = 72;
const DEFAULT_TOP_OFFSET_DESKTOP = 104;
const DEFAULT_TOP_OFFSET_MOBILE = 84;
const DEFAULT_STICKY_HEADER_SELECTOR = "nav.sticky.top-0, header.sticky.top-0";

export default function FloatingCartButton({
  isLoggedIn,
  className = "",
  stickyHeaderSelector = DEFAULT_STICKY_HEADER_SELECTOR,
}: FloatingCartButtonProps) {
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [cartCount, setCartCount] = useState(() => readBuyerCart().length);
  const [topOffset, setTopOffset] = useState(96);

  useEffect(() => {
    const updateCartCount = async () => {
      if (!isLoggedIn) {
        setCartCount(0);
        return;
      }

      setCartCount(readBuyerCart().length);

      try {
        const refreshed = await refreshBuyerCartFromServer();
        setCartCount(refreshed.length || readBuyerCart().length);
      } catch {
        setCartCount(readBuyerCart().length);
      }
    };

    void updateCartCount();
    const unsubscribe = subscribeToBuyerCartChanges(() => {
      if (!isLoggedIn) {
        setCartCount(0);
        return;
      }
      setCartCount(readBuyerCart().length);
    });
    window.addEventListener("focus", updateCartCount as unknown as EventListener);

    return () => {
      unsubscribe();
      window.removeEventListener("focus", updateCartCount as unknown as EventListener);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    let rafId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const updatePosition = () => {
      const stickyHeaders = document.querySelectorAll<HTMLElement>(stickyHeaderSelector);
      const stickyHeader = stickyHeaders[0];

      if (stickyHeader) {
        const offset = Math.max(
          Math.round(stickyHeader.getBoundingClientRect().bottom) + HEADER_SPACING,
          MIN_TOP_OFFSET
        );
        setTopOffset(offset);
        return;
      }

      setTopOffset(window.innerWidth >= MD_BREAKPOINT ? DEFAULT_TOP_OFFSET_DESKTOP : DEFAULT_TOP_OFFSET_MOBILE);
    };

    const schedulePositionUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updatePosition();
      });
    };

    const attachHeaderObserver = () => {
      if (typeof ResizeObserver === "undefined") return;

      const stickyHeaders = Array.from(document.querySelectorAll<HTMLElement>(stickyHeaderSelector));
      if (stickyHeaders.length === 0) return;

      resizeObserver = new ResizeObserver(() => {
        schedulePositionUpdate();
      });

      stickyHeaders.forEach((header) => resizeObserver?.observe(header));
    };

    updatePosition();
    attachHeaderObserver();
    window.addEventListener("scroll", schedulePositionUpdate, { passive: true });
    window.addEventListener("resize", schedulePositionUpdate, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedulePositionUpdate);
      window.removeEventListener("resize", schedulePositionUpdate);
      resizeObserver?.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [stickyHeaderSelector]);

  const openCart = () => {
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }

    navigateToCart();
  };

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        style={{ top: `${topOffset}px` }}
        className={`fixed right-3 z-40 inline-flex h-10 min-w-[44px] items-center justify-center rounded-full border border-rose-800 bg-rose-700 px-3 text-white shadow-lg shadow-rose-950/30 transition hover:-translate-y-0.5 hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-white/45 sm:right-5 md:h-11 md:px-3.5 ${className}`}
        aria-label="Open cart"
        title="Open cart"
      >
        <ShoppingCart className="h-5 w-5 text-white md:h-[22px] md:w-[22px]" />
        {cartCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-700 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white/80">
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        ) : null}
      </button>

      <ConfirmModal
        open={loginPromptOpen}
        title="Login required"
        message="Please log in before opening your cart."
        confirmText="Login"
        cancelText="Cancel"
        onCancel={() => setLoginPromptOpen(false)}
        onConfirm={() => {
          setLoginPromptOpen(false);
          navigateToLoginWithReturnPath();
        }}
      />
    </>
  );
}
