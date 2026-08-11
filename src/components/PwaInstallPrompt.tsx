import { useEffect, useState } from "react";
import { Download, X, Share, PlusSquare, Smartphone, ExternalLink, Info, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "buymesho_pwa_install_dismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function triggerPwaInstall() {
  window.dispatchEvent(new CustomEvent("buymesho:show-pwa-install"));
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect iframe execution
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    // Check if already in standalone / installed mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    setIsIos(isIosDevice);

    // Log diagnostic information on mount
    console.log("[PWA Debug] Checking PWA installability environment...", {
      isInIframe,
      isStandalone,
      isIosDevice,
      hasServiceWorker: 'serviceWorker' in navigator,
      serviceWorkerController: navigator.serviceWorker?.controller ? 'Active' : 'None / Registering',
      supportsGetInstallabilityState: 'getInstallabilityState' in navigator,
      supportsGetInstalledRelatedApps: 'getInstalledRelatedApps' in navigator,
      userAgent: navigator.userAgent
    });

    // Check experimental getInstallabilityState API if supported
    const nav = navigator as any;
    if (typeof nav.getInstallabilityState === "function") {
      try {
        nav.getInstallabilityState().then((state: any) => {
          console.log("[PWA Debug] getInstallabilityState result:", state);
        }).catch((err: any) => {
          console.warn("[PWA Debug] getInstallabilityState error:", err);
        });
      } catch (e) {
        console.warn("[PWA Debug] getInstallabilityState execution failed:", e);
      }
    }

    if (typeof nav.getInstalledRelatedApps === "function") {
      nav.getInstalledRelatedApps().then((apps: any) => {
        console.log("[PWA Debug] getInstalledRelatedApps result:", apps);
      }).catch((err: any) => {
        console.warn("[PWA Debug] getInstalledRelatedApps error:", err);
      });
    }

    // Check last dismissal
    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    const isDismissedRecently =
      lastDismissed && Date.now() - parseInt(lastDismissed, 10) < DISMISS_DURATION_MS;

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("[PWA Debug] 'beforeinstallprompt' event successfully fired by browser!", e);
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      if (!isDismissedRecently) {
        setShowBanner(true);
      }
    };

    // Listen for appinstalled
    const handleAppInstalled = () => {
      console.log("[PWA Debug] 'appinstalled' event fired! App was successfully installed.");
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      setShowGuide(false);
    };

    // Listen for custom trigger from footer or navigation
    const handleCustomTrigger = () => {
      console.log("[PWA Debug] Manual triggerPwaInstall event received", {
        hasDeferredPrompt: !!deferredPrompt,
        isInIframe,
        isIos: isIosDevice
      });
      setShowBanner(true);
      setShowGuide(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("buymesho:show-pwa-install", handleCustomTrigger);

    // Auto banner prompt if not dismissed recently
    if (!isStandalone && !isDismissedRecently) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("buymesho:show-pwa-install", handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log("[PWA Debug] Install button clicked", {
      isInIframe,
      isIos,
      hasDeferredPrompt: !!deferredPrompt,
      windowLocation: window.location.href
    });

    // If inside an iframe, native browser install prompt is blocked by browser security.
    if (isInIframe) {
      console.warn("[PWA Debug] Clicked inside preview iframe - opening full window for native PWA prompt...");
      window.open(window.location.href, "_blank");
      setShowGuide(true);
      return;
    }

    // iOS Safari requires manually tapping Share -> Add to Home Screen
    if (isIos) {
      console.log("[PWA Debug] iOS device detected - showing iOS Share guide...");
      setShowGuide(true);
      return;
    }

    // Android/Desktop Chrome native prompt if available
    if (deferredPrompt) {
      console.log("[PWA Debug] Triggering native beforeinstallprompt.prompt()...");
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log("[PWA Debug] User install choice outcome:", outcome);
        if (outcome === "accepted") {
          setShowBanner(false);
          setDeferredPrompt(null);
        } else {
          setShowGuide(true);
        }
      } catch (err) {
        console.warn("[PWA Debug] Install prompt error:", err);
        setShowGuide(true);
      } finally {
        setInstalling(false);
      }
    } else {
      console.warn("[PWA Debug] No beforeinstallprompt event captured yet by browser. Showing install guide fallback.");
      setShowGuide(true);
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
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-slate-900/95 backdrop-blur-md text-white p-4.5 rounded-2xl shadow-2xl border border-slate-700/70 transition-all duration-300 animate-in slide-in-from-bottom-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <img
              src="/icon-192.png"
              alt="BuyMesho Logo"
              className="w-full h-full object-cover rounded-[10px]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <Smartphone className="w-5 h-5 text-slate-950 hidden" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
              Install BuyMesho App
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Add to your phone or computer home screen for quick offline access.
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
                <Info className="w-4 h-4 text-amber-400 shrink-0" /> Open app in full browser tab
              </p>
              <p className="text-[11px] text-amber-200/90 leading-normal">
                Browser installation requires viewing the app outside this preview frame.
              </p>
              <button
                type="button"
                onClick={() => window.open(window.location.href, "_blank")}
                className="w-full py-1.5 px-3 bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in New Browser Window
              </button>
            </div>
          )}

          {isIos ? (
            <div className="space-y-1.5">
              <p className="font-medium text-amber-400 flex items-center gap-1">
                <Share className="w-3.5 h-3.5" /> On iPhone / iPad (Safari):
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
                <li>
                  Tap the <span className="font-semibold text-white">Share</span> icon in Safari.
                </li>
                <li>
                  Select <span className="font-semibold text-white">Add to Home Screen</span>{" "}
                  <PlusSquare className="w-3.5 h-3.5 inline ml-0.5 text-amber-400" />.
                </li>
                <li>
                  Tap <span className="font-semibold text-white">Add</span> at the top right.
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className="font-medium text-amber-400 flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> On Android / Chrome / Edge:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300">
                <li>
                  Click the <span className="font-semibold text-white">Install App</span> icon in your browser bar (or open menu <span className="font-bold text-white">⋮</span>).
                </li>
                <li>
                  Select <span className="font-semibold text-white">"Install BuyMesho"</span> or <span className="font-semibold text-white">"Add to Home screen"</span>.
                </li>
              </ol>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
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
                <span>Open in Tab to Install</span>
              </>
            ) : isIos ? (
              <>
                <Share className="w-3.5 h-3.5" />
                <span>Show Instructions</span>
              </>
            ) : deferredPrompt ? (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install Now</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Install Guide</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

