import { useEffect, useState } from "react";
import BuyMeshoCopilotDrawer from "../components/ai/BuyMeshoCopilotDrawer";
import AiIcon from "../components/ai/AiIcon";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import MobileDrawerSwipe from "../components/MobileDrawerSwipe";
import ScrollToTopFab from "../components/ScrollToTopFab";
import { isXhovileStudioPath, navigateToPath } from "../lib/appNavigation";
import logoImage from "../../photos/LOGO.svg";
import xsLogo from "../../photos/XSLOGO.svg";
import { Component, type ErrorInfo, type ReactNode } from "react";

export function RouteLoader() {
  const isStandaloneStudio = isXhovileStudioPath(window.location.pathname);

  if (isStandaloneStudio) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[#f6f1ea] px-6 py-8"
        role="status"
        aria-live="polite"
        aria-label="Loading Xhovilé Studio"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-[112px] items-center justify-center rounded-[22px] bg-[#8f1528] px-3 shadow-[0_14px_35px_rgba(143,21,40,0.18)] sm:h-24 sm:w-[136px]">
            <img
              src={xsLogo}
              alt="Xhovilé Studio"
              className="h-14 w-full object-contain sm:h-16"
              width={136}
              height={96}
            />
          </div>
          <h1 className="mt-5 text-2xl font-black uppercase tracking-[0.16em] text-[#8f1528] sm:text-3xl">
            Xhovilé Studio
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Preparing your secure service payment…
          </p>
          <div className="mt-5 h-1 w-24 overflow-hidden rounded-full bg-[#8f1528]/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[#8f1528]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-white px-6 py-8"
      role="status"
      aria-live="polite"
      aria-label="Loading BuyMesho"
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative h-28 w-28 sm:h-32 sm:w-32">
          <svg
            className="absolute inset-0 h-full w-full animate-loader-spin"
            viewBox="0 0 96 96"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="1.5" className="text-zinc-100" />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="125 126"
              className="text-red-600"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={logoImage}
              alt="BuyMesho"
              width={70}
              height={70}
              className="h-[70px] w-[70px] object-contain sm:h-20 sm:w-20"
            />
          </div>
        </div>
        <h1 className="mt-7 text-2xl font-black tracking-tight sm:text-3xl" aria-label="BuyMesho">
          <span className="text-[#991b1b]">Buy</span><span className="text-[#3f3f46]">Mesho</span>
        </h1>
        <p className="mt-2 max-w-xs text-sm font-medium leading-6 text-zinc-500 sm:max-w-sm sm:text-base">
          Malawi&apos;s Secure E-commerce Platform
        </p>
      </div>
    </div>
  );
}

export class DebugErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("DebugErrorBoundary caught:", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white p-6 text-zinc-900">
          <div className="mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <h2 className="text-lg font-black text-rose-900">Admin Payouts crashed</h2>
            <p className="mt-2 text-sm text-rose-900/90">{this.state.error?.message}</p>
            <pre className="mt-4 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-zinc-800">{this.state.error?.stack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RootRouterGlobalUI() {
  const isStandaloneStudio = isXhovileStudioPath(window.location.pathname);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    const handleOpenCopilot = () => setCopilotOpen(true);

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("open-buymesho-copilot", handleOpenCopilot);
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("open-buymesho-copilot", handleOpenCopilot);
    };
  }, []);

  if (isStandaloneStudio) return null;

  return (
    <>
      <MobileDrawerSwipe />

      {!copilotOpen && (
        <div className="fixed bottom-5 right-5 z-[99] sm:bottom-5 sm:right-6">
          <button type="button" onClick={() => setCopilotOpen(true)} className="block cursor-pointer p-0 drop-shadow-md transition-transform hover:scale-110 active:scale-95" title="Open BuyMesho AI" aria-label="BuyMesho AI">
            <AiIcon className="h-12 w-12" />
          </button>
        </div>
      )}

      <BuyMeshoCopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onSelectListing={(id) => {
          setCopilotOpen(false);
          navigateToPath(`/listings/${id}`);
        }}
      />

      <ScrollToTopFab show={showScrollTop} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      <PwaInstallPrompt />
    </>
  );
}
