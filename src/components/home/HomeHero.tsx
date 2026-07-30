import { ArrowRight, BadgeCheck, Check, Globe2, Users } from "lucide-react";

import { trustPills } from "../../home/home.constants";

const heroHighlights = [
  {
    title: "Everyone can shop",
    description: "Anyone can browse and buy.",
  },
  {
    title: "Students can sell",
    description: "Built to help sellers grow.",
  },
  {
    title: "Trusted listings",
    description: "A structured marketplace for real commerce.",
  },
] as const;

export default function HomeHero({ onBrowseMarket }: { onBrowseMarket: () => void }) {
  return (
    <section className="relative overflow-hidden pb-8 pt-4 sm:pb-14 sm:pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-red-900/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center lg:mx-0 lg:items-center">
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] leading-[0.92] text-zinc-950 sm:text-6xl lg:text-[4.75rem]">
              Buy. Sell. Online.
            </h1>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onBrowseMarket}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 hover:bg-red-800"
              >
                Browse Market
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 hidden flex-wrap justify-center gap-2 sm:flex">
              {trustPills.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5 text-red-900" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="hidden min-h-[30rem] lg:block" aria-hidden="true">
            <div className="flex h-full flex-col justify-center gap-4 rounded-[2rem] bg-white/40 p-8">
              {heroHighlights.map((item) => {
                const isPrimary = item.title === "Everyone can shop";
                return (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 rounded-none border-0 bg-transparent p-0 shadow-none"
                  >
                    <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
                      {isPrimary ? <Globe2 className="h-4.5 w-4.5" /> : item.title === "Students can sell" ? <Users className="h-4.5 w-4.5" /> : <BadgeCheck className="h-4.5 w-4.5" />}
                    </div>
                    <div>
                      <p className="text-lg font-black tracking-[-0.03em] text-zinc-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}