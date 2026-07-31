import { ArrowLeft, Sparkles, X } from "lucide-react";

import EventDetailsPage from "./EventDetailsPage";
import EventsCreatePage from "./EventsCreatePage";
import EventsDirectoryPage from "./EventsDirectoryPage";
import AppFooter from "./components/AppFooter";
import HomeHeader from "./components/home/HomeHeader";
import { useHomePageController } from "./hooks/useHomePageController";
import { EVENTS_CREATE_PATH, EVENTS_PATH, EXPLORE_PATH, navigateBackOrPath } from "./lib/appNavigation";

function ComingSoonBody() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-14 sm:py-20">
      <section className="w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/50 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Sparkles className="h-8 w-8" />
        </div>

        <div className="mt-6 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">
            BuyMesho
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">
            Coming soon
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
            This section is not wired yet. It will open once the separate logic and data flow are ready.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => navigateBackOrPath(EXPLORE_PATH)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </section>
    </main>
  );
}

export default function MarketComingSoonPage() {
  const controller = useHomePageController();

  if (window.location.pathname === EVENTS_PATH) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("event")) {
      return <EventDetailsPage />;
    }
    return <EventsDirectoryPage />;
  }

  if (window.location.pathname === EVENTS_CREATE_PATH) {
    return <EventsCreatePage />;
  }

  if (window.location.pathname === "/explore/lay-by" || window.location.pathname === "/explore/accommodation" || window.location.pathname === "/explore/innovation") {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
        <HomeHeader controller={controller} />
        <ComingSoonBody />
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <div className="flex items-center justify-end px-4 pt-4">
        <button
          type="button"
          onClick={() => navigateBackOrPath(EXPLORE_PATH)}
          aria-label="Close and return to All"
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <ComingSoonBody />
    </div>
  );
}