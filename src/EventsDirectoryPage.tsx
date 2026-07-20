import { ArrowRight, Ticket } from "lucide-react";

import { EVENTS_CREATE_PATH, EXPLORE_PATH, HOME_PATH, navigateToPath } from "./lib/appNavigation";

export default function EventsDirectoryPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-3 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-900 text-white shadow-lg shadow-red-900/20">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Events</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 shadow-sm hover:bg-zinc-50"
          >
            Back to Market
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl rounded-[2.25rem] border border-zinc-200 bg-white p-6 text-center shadow-[0_24px_70px_-40px_rgba(0,0,0,0.22)] sm:p-10">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-zinc-400">Events directory</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.06em] text-zinc-950 sm:text-5xl">
            Clean slate.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-zinc-600 sm:text-base">
            The Events area will be built around a separate create flow and its own schema-driven listings.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigateToPath(EVENTS_CREATE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              Create an event
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
            >
              Browse market
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
