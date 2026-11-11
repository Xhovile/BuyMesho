import { useEffect, useRef, useState } from "react";
import {
  Download,
  X,
  Share,
  PlusSquare,
  ExternalLink,
  Info,
} from "lucide-react";
import logoImage from "../../photos/LOGO.svg";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let capturedBeforeInstallPrompt: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    capturedBeforeInstallPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("buymesho:pwa-install-available"));
  });
}

const DISMISS_KEY = "buymesho_pwa_install_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function triggerPwaInstall() {
  window.dispatchEvent(new CustomEvent("buymesho:show-pwa-install"));
}

/**
 * Directly requests the browser's native PWA installation prompt.
 * This intentionally bypasses BuyMesho's in-page install banner.
 */
export async function requestNativePwaInstall(): Promise<"accepted" | "dismissed" | null> {
  if (typeof window === "undefined" || isPwaInstalled()) return null;

  const promptEvent = capturedBeforeInstallPrompt;
  if (!promptEvent) return null;

  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    return outcome;
  } catch (error) {
    console.warn("BuyMesho PWA native install prompt failed:", error);
    return null;
  } finally {
    capturedBeforeInstallPrompt = null;
  }
}

export function isPwaInstalled() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const displayModes = [
    "standalone",
    "fullscreen",
    "minimal-ui",
    "window-controls-overlay",
  ];

  const displayModeInstalled = displayModes.some((mode) => {
    try {
      return window.matchMedia(`(display-mode: ${mode})`).matches;
    } catch {
      return false;
    }
  });

  const navigatorStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return displayModeInstalled || navigatorStandalone;
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = Number(navigator.maxTouchPoints || 0);

  const classicIos = /iphone|ipad|ipod/i.test(userAgent);
  const ipadDesktopMode = /macintosh/i.test(userAgent) && /mac/i.test(platform) && maxTouchPoints > 1;

  return classicIos || ipadDesktopMode;
}

export default function PwaInstallPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(capturedBeforeInstallPrompt);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(!!capturedBeforeInstallPrompt);

  useEffect(() => {
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }

    const ios = isIosDevice();
    const isInstallPage = window.location.pathname === "/install";
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed =
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < DISMISS_DURATION_MS;

    setIsInIframe(inIframe);
    setIsIos(ios);

    const syncInstalledState = () => {
      const installed = isPwaInstalled();
      setIsInstalled(installed);
      if (installed) {
        setShowBanner(false);
        setShowGuide(false);
      }
    };

    syncInstalledState();
    if (isPwaInstalled()) return () => undefined;

    const syncInstallAvailability = () => {
      if (!capturedBeforeInstallPrompt) return;
      deferredPromptRef.current = capturedBeforeInstallPrompt;
      setCanNativeInstall(true);

      if (!isInstallPage && !recentlyDismissed && !isPwaInstalled()) {
        setShowBanner(true);
        setShowGuide(false);
      }
    };

    const handleAppInstalled = () => {
      capturedBeforeInstallPrompt = null;
      deferredPromptRef.current = null;
      setCanNativeInstall(false);
      setIsInstalled(true);
      setShowBanner(false);
      setShowGuide(false);
      localStorage.removeItem(DISMISS_KEY);
    };

    const handleCustomTrigger = () => {
      if (isPwaInstalled()) {
        setIsInstalled(true);
        return;
      }
      syncInstallAvailability();
      setShowBanner(true);
      setShowGuide(false);
    };

    const mediaQueries = [
      "(display-mode: standalone)",
      "(display-mode: fullscreen)",
      "(display-mode: minimal-ui)",
      "(display-mode: window-controls-overlay)",
    ].map((query) => window.matchMedia(query));

    const handleDisplayModeChange = () => syncInstalledState();

    window.addEventListener("buymesho:pwa-install-available", syncInstallAvailability);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("buymesho:show-pwa-install", handleCustomTrigger);
    window.addEventListener("pageshow", syncInstalledState);
    document.addEventListener("visibilitychange", syncInstalledState);
    mediaQueries.forEach((query) => query.addEventListener?.("change", handleDisplayModeChange));

    syncInstallAvailability();

    if (!isInstallPage && !recentlyDismissed && ios && !isPwaInstalled()) setShowBanner(true);

    return () => {
      window.removeEventListener("buymesho:pwa-install-available", syncInstallAvailability);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("buymesho:show-pwa-install", handleCustomTrigger);
      window.removeEventListener("pageshow", syncInstalledState);
      document.removeEventListener("visibilitychange", syncInstalledState);
      mediaQueries.forEach((query) => query.removeEventListener?.("change", handleDisplayModeChange));
    };
  }, []);

  const handleInstallClick = async () => {
    if (isPwaInstalled()) {
      setIsInstalled(true);
      setShowBanner(false);
      return;
    }

    if (isInIframe) {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      return;
    }

    if (isIos) {
      setShowGuide(true);
      return;
    }

    const promptEvent = deferredPromptRef.current || capturedBeforeInstallPrompt;
    if (!promptEvent) {
      setShowGuide(true);
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") setShowBanner(false);
    } catch (error) {
      console.warn("BuyMesho PWA install prompt failed:", error);
      setShowGuide(true);
    } finally {
      capturedBeforeInstallPrompt = null;
      deferredPromptRef.current = null;
      setCanNativeInstall(false);
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowGuide(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div
      id="pwa-install-prompt-card"
      className="fixed bottom-24 left-4 right-4 md:bottom-20 md:left-auto md:right-6 md:max-w-md z-50 bg-bm-surface/95 backdrop-blur-md text-bm-text p-4 rounded-2xl shadow-2xl border border-bm-border transition-all duration-300 animate-in slide-in-from-bottom-5"
      role="dialog"
      aria-label="Install BuyMesho"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 bg-white">
            <img src={logoImage} alt="BuyMesho" className="w-full h-full object-cover" draggable={false} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-bm-text tracking-wide">Install BuyMesho App</h3>
            <p className="text-xs text-bm-text-muted mt-0.5 leading-relaxed">Add BuyMesho to your home screen for faster access.</p>
          </div>
        </div>
        <button
          id="pwa-install-dismiss-button"
          onClick={handleDismiss}
          className="text-bm-text-subtle hover:text-bm-text p-1 rounded-lg hover:bg-bm-surface-muted transition-colors shrink-0"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showGuide ? (
        <div className="mt-3 pt-3 border-t border-bm-border text-xs text-bm-text-muted space-y-2.5">
          {isInIframe && (
            <div className="p-2.5 rounded-xl bg-bm-brand/10 border border-bm-brand/30 text-bm-text space-y-1.5">
              <p className="font-semibold text-bm-brand flex items-center gap-1.5"><Info className="w-4 h-4 text-bm-brand shrink-0" /> Open BuyMesho in your browser</p>
              <p className="text-[11px] leading-normal">Installation must be started from the real browser tab, not an embedded preview.</p>
              <button type="button" onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")} className="w-full py-2 px-3 bg-bm-brand text-bm-on-brand hover:bg-bm-brand-hover font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"><ExternalLink className="w-3.5 h-3.5" />Open BuyMesho</button>
            </div>
          )}
          {isIos ? (
            <div className="space-y-1.5">
              <p className="font-medium text-bm-brand flex items-center gap-1"><Share className="w-3.5 h-3.5" /> On iPhone / iPad (Safari)</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Tap the <span className="font-semibold text-bm-text">Share</span> button.</li>
                <li>Select <span className="font-semibold text-bm-text">Add to Home Screen</span> <PlusSquare className="w-3.5 h-3.5 inline ml-0.5 text-bm-brand" />.</li>
                <li>Tap <span className="font-semibold text-bm-text">Add</span>.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-medium text-bm-brand flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Install from your browser</p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open your browser menu <span className="font-bold text-bm-text">⋮</span>.</li>
                <li>Choose <span className="font-semibold text-bm-text">Install BuyMesho</span> or <span className="font-semibold text-bm-text">Add to Home screen</span>.</li>
                <li>Confirm the installation.</li>
              </ol>
              {!canNativeInstall && <p className="text-[11px] text-bm-text-subtle pt-1">Your browser has not exposed the one-tap install prompt yet, so the browser menu is the fallback.</p>}
            </div>
          )}
          <div className="flex justify-end pt-1"><button type="button" onClick={handleDismiss} className="px-3 py-1.5 bg-bm-surface-muted hover:bg-bm-surface-raised text-bm-text text-xs font-medium rounded-lg transition-colors">Close</button></div>
        </div>
      ) : (
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button id="pwa-install-later-button" onClick={handleDismiss} className="px-3.5 py-1.5 text-xs font-medium text-bm-text-muted hover:text-bm-text hover:bg-bm-surface-muted rounded-lg transition-colors">Not now</button>
          <button id="pwa-install-action-button" onClick={handleInstallClick} disabled={installing} className="px-4 py-1.5 text-xs font-bold text-bm-on-brand bg-bm-brand hover:bg-bm-brand-hover active:bg-bm-brand-hover rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60">
            {installing ? <span>Installing...</span> : isInIframe ? <><ExternalLink className="w-3.5 h-3.5" /><span>Open to Install</span></> : isIos ? <><Share className="w-3.5 h-3.5" /><span>How to Install</span></> : canNativeInstall ? <><Download className="w-3.5 h-3.5" /><span>Install</span></> : <><Download className="w-3.5 h-3.5" /><span>How to Install</span></>}
          </button>
        </div>
      )}
    </div>
  );
}
