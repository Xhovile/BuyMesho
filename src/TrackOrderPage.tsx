import { useState, type FormEvent } from "react";
import { ArrowLeft, Truck } from "lucide-react";
import { PAYMENTS_HUB_PATH, navigateBackOrPath, navigateToOrderTracking } from "./lib/appNavigation";

export default function TrackOrderPage() {
  const [reference, setReference] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reference.trim();
    if (!value) return;
    navigateToOrderTracking(value);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(PAYMENTS_HUB_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Track Order</p>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">Open order tracking</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Enter order reference"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800">
              Track order
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
