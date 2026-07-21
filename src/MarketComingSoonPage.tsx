import { ArrowLeft, Sparkles, X } from "lucide-react";

import EventDetailsPage from "./EventDetailsPage";
import EventsCreatePage from "./EventsCreatePage";
import EventsDirectoryPage from "./EventsDirectoryPage";
import { EVENTS_CREATE_PATH, EVENTS_PATH, EXPLORE_PATH, navigateBackOrPath } from "./lib/appNavigation";

export default function MarketComingSoonPage() {
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

  const goBack = () => navigateBackOrPath(EXPLORE_PATH);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="relative w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/60 sm:p-10">
        <button
          type="button"
          onClick={goBack}
          aria-label="Close and return to All"
          className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <X className="h-5 w-5" />
        </button>

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
            onClick={goBack}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3.5 text-sm font-extrabold text-white transition-colors hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
