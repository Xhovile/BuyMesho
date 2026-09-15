import { useEffect, useRef, useState } from "react";
import {
  Download,
  X,
  Share,
  PlusSquare,
  Smartphone,
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

const DISMISS_KEY = "buymesho_pwa_install_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function triggerPwaInstall() {
  window.dispatchEvent(new CustomEvent("buymesho:show-pwa-install"));
}

function isStandaloneDisplayMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PwaInstallPrompt() {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(false);

  useEffect(() => {
    let inIframe = false;
    try {
      inIframe = window.self !== window.top;
    } catch {
      inIframe = true;
    }

    const standalone = isStandaloneDisplayMode();
    const ios = isIosDevice();
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const recentlyDismissed =
      Number.isFinite(dismissedAt) &&
      dismissedAt > 0 &&
      Date.now() - dismissedAt < DISMISS_DURATION_MS;

    setIsInIframe(inIframe);
    setIsIos(ios);

    if (standalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = installEvent;
      setCanNativeInstall(true);
      if (!recentlyDismissed) {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanNativeInstall(false);
      setIsInstalled(true);
      setShowBanner(false);
      setShowGuide(false);
      localStorage.removeItem(DISMISS_KEY);
    };

    const handleCustomTrigger = () => {
      if (isStandaloneDisplayMode()) return;
      setShowBanner(true);
      setShowGuide(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("buymesho:show-pwa-install", handleCustomTrigger);

    // iOS does not expose beforeinstallprompt, so the manual guide is the correct path.
    // For other browsers, keep the banner available so the browser menu can be used
    // when a native prompt is not exposed by that browser/version.
    if (!recentlyDismissed && (ios || !standalone)) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("buymesho:show-pwa-install", handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isInIframe) {
      window.open(window.location.href, "_blank", "noopener,noreferrer");
      return;
    }

    if (isIos) {
      setShowGuide(true);
      return;
    }

    const promptEvent = deferredPromptRef.current;
    if (!promptEvent) {
      // The browser only exposes beforeinstallprompt when its installability
      // conditions are met. When it does not, give the user accurate browser
      // menu instructions instead of pretending that a native prompt exists.
      setShowGuide(true);
      return;
    }

    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
    } catch (error) {
      console.warn("BuyMesho PWA install prompt failed:", error);
      setShowGuide(true);
    } finally {
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

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <div
      id="pwa-install-prompt-card"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-700/70 transition-all duration-300 animate-in slide-in-from-bottom-5"
      role="dialog"
      aria-label="Install BuyMesho"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 bg-white">
            <img
              src={logoImage}
              alt="BuyMesho"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Install BuyMesho App
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Add BuyMesho to your home screen for faster access.
            </p>
          </div>
        </div>

        <button
          id="pwa-install-dismiss-button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          aria-label="Close install prompt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {showGuide ? (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2.5">
          {isInIframe && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-1.5">
              <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0" /> Open BuyMesho in your browser
              </p>
              <p className="text-[11px] leading-normal">
                Installation must be started from the real browser tab, not an embedded preview.
              </p>
              <button
                type="button"
                onClick={() => window.open(window.location.href, "_blank", "noopener,noreferrer")}
                className="w-full py-2 px-3 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open BuyMesho
              </button>
            </div>
          )}

          {isIos ? (
            <div className="space-y-1.5">
              <p className="font-medium text-amber-400 flex items-center gap-1">
                <Share className="w-3.5 h-3.5" /> On iPhone / iPad (Safari)
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Tap the <span className="font-semibold text-white">Share</span> button.</li>
                <li>Select <span className="font-semibold text-white">Add to Home Screen</span> <PlusSquare className="w-3.5 h-3.5 inline ml-0.5 text-amber-400" />.</li>
                <li>Tap <span className="font-semibold text-white">Add</span>.</li>
              </ol>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-medium text-amber-400 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> Install from your browser
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Open your browser menu <span className="font-bold text-white">⋮</span>.</li>
                <li>Choose <span className="font-semibold text-white">Install BuyMesho</span> or <span className="font-semibold text-white">Add to Home screen</span>.</li>
                <li>Confirm the installation.</li>
              </ol>
              {!canNativeInstall && (
                <p className="text-[11px] text-slate-400 pt-1">
                  Your browser has not exposed the one-tap install prompt yet, so the browser menu is the fallback.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 flex items-center justify-end gap-2">
          <button
            id="pwa-install-later-button"
            onClick={handleDismiss}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Not now
          </button>
          <button
            id="pwa-install-action-button"
            onClick={handleInstallClick}
            disabled={installing}
            className="px-4 py-1.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60"
          >
            {installing ? (
              <span>Installing...</span>
            ) : isInIframe ? (
              <>
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open to Install</span>
              </>
            ) : isIos ? (
              <>
                <Share className="w-3.5 h-3.5" />
                <span>How to Install</span>
              </>
            ) : canNativeInstall ? (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>How to Install</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
