import React, { useEffect, useLayoutEffect, useState } from "react";

type Props = {
  className?: string;
  size?: number | string;
};

const AI_HIDDEN_DRAWER_PATHS = new Set([
  "/profile",
  "/become-seller",
  "/my-listings",
  "/messages",
  "/saved",
  "/hidden",
  "/payments",
  "/seller/payouts",
  "/create",
  "/login",
  "/signup",
  "/cart",
  "/buyer-payments",
  "/payments/return",
  "/payment/return",
]);

export function shouldHideLauncher() {
  if (typeof window === "undefined") return false;

  const pathname = window.location.pathname;
  const isMobile = window.matchMedia("(max-width: 767px)").matches;

  if (pathname === "/settings" && isMobile) return true;
  if (AI_HIDDEN_DRAWER_PATHS.has(pathname)) return true;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/orders/")) return true;
  if (pathname === "/track-order" || pathname === "/payments/track-order") return true;

  // Checkout is often a modal layered over a listing/details page, so hide
  // the floating AI launcher whenever an active checkout dialog is mounted.
  if (document.querySelector('[aria-label="Checkout"]')) return true;

  return false;
}

function syncCategoryLauncherButton() {
  if (typeof document === "undefined") return;

  const button = document.querySelector(
    'button[aria-label="Open BuyMesho AI Assistant"]'
  ) as HTMLButtonElement | null;

  if (!button) return;

  // Category pages can be rendered directly from Explore/MarketplaceShell,
  // bypassing RootRouter. In that path, make the launcher use the exact same
  // visual shell as the canonical RootRouter launcher.
  button.className =
    "p-0 transition-transform hover:scale-110 active:scale-95 cursor-pointer block drop-shadow-md";
  button.title = "Open BuyMesho AI";
  button.setAttribute("aria-label", "BuyMesho AI");

  const iconHost = button.querySelector('[aria-label="AI"]') as HTMLElement | null;
  if (iconHost) {
    iconHost.className = "inline-flex items-center justify-center shrink-0 w-12 h-12";
    iconHost.style.removeProperty("width");
    iconHost.style.removeProperty("height");
  }
}

export default function AiIcon({ className = "w-5 h-5", size }: Props) {
  const [hidden, setHidden] = useState(() => shouldHideLauncher());

  useEffect(() => {
    const updateVisibility = () => {
      const nextHidden = shouldHideLauncher();
      setHidden((current) => (current === nextHidden ? current : nextHidden));
      syncCategoryLauncherButton();
    };

    window.addEventListener("popstate", updateVisibility);
    window.addEventListener("resize", updateVisibility);

    const observer = new MutationObserver(updateVisibility);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    updateVisibility();

    return () => {
      window.removeEventListener("popstate", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    syncCategoryLauncherButton();
  });

  if (hidden) return null;

  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={style}
      aria-label="AI"
    >
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-hidden="true"
        className="w-full h-full"
      >
        <defs>
          {/* Dark outer frame */}
          <linearGradient id="darkFrame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#050505" />
            <stop offset="45%" stopColor="#161616" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>

          {/* Soft depth */}
          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow
              dx="0"
              dy="4"
              stdDeviation="4"
              floodColor="#000000"
              floodOpacity=".28"
            />
          </filter>
        </defs>

        {/* Outer frame: thick dark border */}
        <rect
          x="7"
          y="7"
          width="86"
          height="86"
          rx="23"
          fill="none"
          stroke="url(#darkFrame)"
          strokeWidth="5"
          filter="url(#shadow)"
        />

        {/* Solid white inner surface */}
        <rect
          x="14"
          y="14"
          width="72"
          height="72"
          rx="18"
          fill="#FFFFFF"
          stroke="rgba(255,255,255,.78)"
          strokeWidth="2"
        />

        {/* Dark inner rim */}
        <rect
          x="18"
          y="18"
          width="64"
          height="64"
          rx="15"
          fill="none"
          stroke="#111111"
          strokeOpacity=".72"
          strokeWidth="2"
        />

        {/* AI lettering */}
        <text
          x="50"
          y="63"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="38"
          fontWeight="800"
          letterSpacing="-3"
          fill="#8F1528"
        >
          AI
        </text>

        {/* Tiny highlight on lettering */}
        <text
          x="50"
          y="62"
          textAnchor="middle"
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize="38"
          fontWeight="800"
          letterSpacing="-3"
          fill="none"
          stroke="white"
          strokeOpacity=".28"
          strokeWidth=".8"
        >
          AI
        </text>
      </svg>
    </div>
  );
}
