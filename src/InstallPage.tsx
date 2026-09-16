import { useEffect, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import logoImage from "../photos/LOGO.svg";
import { isPwaInstalled, requestNativePwaInstall } from "./components/PwaInstallPrompt";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function InstallPage() {
  const [installed, setInstalled] = useState(false);
  const [installUnavailable, setInstallUnavailable] = useState(false);
  const ios = isIosDevice();

  useEffect(() => {
    const sync = () => setInstalled(isPwaInstalled());
    const handleInstalled = () => setInstalled(true);

    sync();
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  const handleInstall = async () => {
    setInstallUnavailable(false);

    if (isPwaInstalled()) {
      setInstalled(true);
      return;
    }

    const outcome = await requestNativePwaInstall();
    if (outcome === "accepted") {
      setInstalled(true);
      return;
    }

    if (outcome === "dismissed") return;

    setInstallUnavailable(true);
  };

  return (
    <main className="min-h-screen bg-[#f5f5f4] px-5 py-10 text-zinc-900 sm:flex sm:items-center sm:justify-center sm:py-16">
      <section className="mx-auto w-full max-w-md rounded-[32px] border border-black/10 bg-[#070a12] px-7 py-10 text-center text-white shadow-[0_30px_90px_rgba(0,0,0,0.18)] sm:px-10 sm:py-12">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[26px] bg-[#070a12] sm:h-28 sm:w-28">
          <img src={logoImage} alt="BuyMesho" width={96} height={96} className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
        </div>

        <h1 className="mt-7 text-4xl font-black tracking-[-0.04em] sm:text-5xl" aria-label="BuyMesho">
          <span className="text-[#991b1b]">Buy</span><span className="text-[#3f3f46]">Mesho</span>
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-white/60 sm:text-base">
          Malawi&apos;s Secure E-commerce Platform
        </p>

        {installed ? (
          <div className="mt-9 rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm font-semibold text-white/80">
            BuyMesho is already installed on this device.
          </div>
        ) : ios ? (
          <div className="mt-9 space-y-4 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-sm leading-6 text-white/75">
              <p className="font-bold text-white">Install on iPhone or iPad</p>
              <p className="mt-1">Open this page in Safari, tap <span className="font-semibold text-white">Share</span>, then choose <span className="font-semibold text-white">Add to Home Screen</span>.</p>
            </div>
            <a href="/" className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
              Open BuyMesho
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        ) : (
          <div className="mt-9">
            <button
              type="button"
              onClick={handleInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#e00106] px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-[#c90005] active:scale-[0.99]"
            >
              <Download className="h-5 w-5" />
              Install BuyMesho
            </button>

            {installUnavailable && (
              <p className="mt-3 text-xs font-semibold leading-5 text-white/60" role="status">
                Open the browser menu and choose Install BuyMesho or Add to Home screen.
              </p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
