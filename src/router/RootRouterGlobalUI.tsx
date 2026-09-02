import { useEffect, useState } from "react";
import BuyMeshoCopilotDrawer from "../components/ai/BuyMeshoCopilotDrawer";
import AiIcon from "../components/ai/AiIcon";
import PwaInstallPrompt from "../components/PwaInstallPrompt";
import ScrollToTopFab from "../components/ScrollToTopFab";
import { navigateToPath } from "../lib/appNavigation";
import logoImage from "../../photos/Logo.png";
import { Component, type ErrorInfo, type ReactNode } from "react";

export function RouteLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-6 py-8">
      <div className="relative h-24 w-24" role="status" aria-label="Loading BuyMesho">
        <svg
          className="absolute inset-0 h-full w-full animate-loader-spin"
          viewBox="0 0 96 96"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-zinc-100"
          />
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
            width={60}
            height={60}
            className="h-[60px] w-[60px] object-contain"
          />
        </div>
      </div>
    </div>
  );
}

export class DebugErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
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
            <pre className="mt-4 overflow-auto rounded-xl bg-white p-4 text-xs leading-6 text-zinc-800">
              {this.state.error?.stack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function RootRouterGlobalUI() {
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

  return (
    <>
      {!copilotOpen && (
        <div className="fixed bottom-5 right-5 sm:bottom-5 sm:right-6 z-[99]">
          <button
            type="button"
            onClick={() => setCopilotOpen(true)}
            className="p-0 transition-transform hover:scale-110 active:scale-95 cursor-pointer block drop-shadow-md"
            title="Open BuyMesho AI"
            aria-label="BuyMesho AI"
          >
            <AiIcon className="w-12 h-12" />
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
