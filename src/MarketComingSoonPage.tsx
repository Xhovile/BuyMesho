import { ArrowLeft, Sparkles, X } from "lucide-react";
import { navigateBackOrPath, EXPLORE_PATH } from "./lib/appNavigation";

export default function MarketComingSoonPage() {
  const goBack = () => navigateBackOrPath(EXPLORE_PATH);

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-10 flex items-center justify-center">
      <div className="relative w-full max-w-2xl rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-10 shadow-xl shadow-zinc-200/60">
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
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">
            Coming soon
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-zinc-600">
            This section is not wired yet. It will open once the separate logic and data flow are ready.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
