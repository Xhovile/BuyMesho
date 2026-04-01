import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FileText,
  HelpCircle,
  House,
  Search,
  Settings,
  ShieldCheck,
} from "lucide-react";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsPage from "./components/TermsPage";
import SafetyTipsPage from "./components/SafetyTipsPage";
import ReportProblemPage from "./components/ReportProblemPage";
import {
  EXPLORE_PATH,
  HOME_PATH,
  SETTINGS_PATH,
  navigateToPath,
} from "./lib/appNavigation";

type SettingsView = "menu" | "privacy" | "terms" | "safety" | "report";

const SETTINGS_VIEW_QUERY_KEY = "section";

const getSettingsViewFromSearch = (search: string): SettingsView => {
  const section = new URLSearchParams(search).get(SETTINGS_VIEW_QUERY_KEY);
  if (section === "privacy" || section === "terms" || section === "safety" || section === "report") {
    return section;
  }

  return "menu";
};

export default function SettingsPage() {
  const [view, setView] = useState<SettingsView>(() =>
    getSettingsViewFromSearch(window.location.search)
  );

  useEffect(() => {
    const handlePopState = () => {
      setView(getSettingsViewFromSearch(window.location.search));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const openView = (nextView: SettingsView) => {
    if (nextView === "menu") {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      const url = new URL(window.location.href);
      url.pathname = SETTINGS_PATH;
      url.searchParams.delete(SETTINGS_VIEW_QUERY_KEY);

      window.history.pushState({}, "", url.toString());
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    const url = new URL(window.location.href);
    url.pathname = SETTINGS_PATH;
    url.searchParams.set(SETTINGS_VIEW_QUERY_KEY, nextView);

    window.history.pushState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const headerSubtitle = useMemo(() => {
    switch (view) {
      case "privacy":
        return "Privacy policy";
      case "terms":
        return "Terms of use";
      case "safety":
        return "Safety tips";
      case "report":
        return "Report a problem";
      default:
        return "Settings";
    }
  }, [view]);

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                {headerSubtitle}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2"
            >
              <House className="w-4 h-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2 inline-flex"
            >
              <Search className="w-4 h-4" />
              Explore
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Settings</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
                Legal, safety, and support in one place.
              </h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                This page gives BuyMesho a clearer, more serious product structure by moving policy and support content out of stacked overlays and into a real page surface.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 min-w-[220px]">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">Current section</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-zinc-900 capitalize">
                {view === "menu" ? "Settings" : view}
              </p>
            </div>
          </div>
        </section>

        {view === "menu" ? (
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-6">
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <Settings className="w-5 h-5 text-zinc-700" />
                <h2 className="text-xl font-extrabold text-zinc-900">Open a section</h2>
              </div>

              <div className="space-y-3">
                {[
                  { key: "privacy", label: "Privacy Policy", icon: FileText },
                  { key: "terms", label: "Terms of Use", icon: FileText },
                  { key: "safety", label: "Safety Tips", icon: ShieldCheck },
                  { key: "report", label: "Report a Problem", icon: HelpCircle },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => openView(item.key as SettingsView)}
                      className="w-full flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-4 py-4 text-left transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-white border border-zinc-200 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-zinc-700" />
                        </span>
                        <span className="font-bold text-zinc-900">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-zinc-400">Open</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-zinc-900">Why this matters</h2>
              <div className="mt-5 space-y-4 text-sm text-zinc-600 leading-relaxed">
                <p>
                  BuyMesho should feel like a structured product, not a single page with layers on top of layers.
                </p>
                <p>
                  Moving legal, safety, and support content into a dedicated route makes navigation clearer and the overall app more serious.
                </p>
                <p>
                  This is one step toward turning major experiences into page-like product surfaces instead of keeping everything inside floating modals.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => openView("menu")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-sm font-bold hover:bg-zinc-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Settings
              </button>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                {headerSubtitle}
              </div>
            </div>

            {view === "privacy" && (
              <PrivacyPolicyPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
              />
            )}

            {view === "terms" && (
              <TermsPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
              />
            )}

            {view === "safety" && (
              <SafetyTipsPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
              />
            )}

            {view === "report" && (
              <ReportProblemPage
                onBack={() => openView("menu")}
                onClose={() => navigateToPath(HOME_PATH)}
                showBackButton={false}
                isLoggedIn={false}
              />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
