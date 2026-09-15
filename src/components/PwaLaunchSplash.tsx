import { useEffect, useState } from "react";
import logoImage from "../../photos/LOGO.svg";
import { isPwaInstalled } from "./PwaInstallPrompt";

const SPLASH_SESSION_KEY = "buymesho:pwa-launch-splash-shown";
const SPLASH_DURATION_MS = 3600;

export default function PwaLaunchSplash() {
  const [visible, setVisible] = useState(() => {
    if (!isPwaInstalled()) return false;
    try {
      return sessionStorage.getItem(SPLASH_SESSION_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!visible) return;

    try {
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
    } catch {
      // Session storage may be unavailable; the splash can still complete normally.
    }

    const fadeTimer = window.setTimeout(() => setFading(true), SPLASH_DURATION_MS - 450);
    const hideTimer = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#f5f5f4] px-5 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
      aria-label="Opening BuyMesho"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,rgba(255,255,255,0.85),transparent_36%),radial-gradient(circle_at_50%_100%,rgba(153,27,27,0.06),transparent_46%)]" />

      <div className="relative w-full max-w-[420px] rounded-[34px] border border-black/10 bg-[#070a12] px-7 py-9 text-center shadow-[0_30px_90px_rgba(0,0,0,0.22)] sm:px-10 sm:py-11">
        <div className="pointer-events-none absolute inset-0 rounded-[34px] bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.07),transparent_32%),radial-gradient(circle_at_50%_100%,rgba(185,28,28,0.08),transparent_42%)]" />

        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[26px] bg-[#070a12] sm:h-28 sm:w-28 sm:rounded-[30px]">
          <img
            src={logoImage}
            alt="BuyMesho"
            width={88}
            height={88}
            className="h-[88px] w-[88px] object-contain sm:h-[100px] sm:w-[100px]"
          />
        </div>

        <h1 className="relative mt-7 text-4xl font-black tracking-[-0.04em] sm:text-5xl" aria-label="BuyMesho">
          <span className="text-[#991b1b]">Buy</span><span className="text-[#3f3f46]">Mesho</span>
        </h1>
        <p className="relative mx-auto mt-3 max-w-[300px] text-sm font-medium leading-6 text-white/60 sm:max-w-[340px] sm:text-base">
          Malawi&apos;s Secure E-commerce Platform
        </p>

        <div className="relative mx-auto mt-9 h-1 w-28 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/2 animate-pwa-launch-progress rounded-full bg-red-500" />
        </div>
      </div>
    </div>
  );
}
