import { ArrowRight, BadgeCheck, Globe2, Users } from "lucide-react";

const heroCards = [
  {
    title: "For everyone",
    description: "Anyone can browse and buy.",
    icon: Globe2,
    className: "left-0 top-8 -rotate-3",
  },
  {
    title: "Student entrepreneurs",
    description: "Built to help sellers grow.",
    icon: Users,
    className: "right-6 top-28 rotate-3",
  },
  {
    title: "Trusted listings",
    description: "A structured marketplace for real commerce.",
    icon: BadgeCheck,
    className: "left-16 bottom-0 rotate-1",
  },
] as const;

export default function HomeHero({ onBrowseMarket }: { onBrowseMarket: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-zinc-900/10 to-zinc-100 pb-8 pt-4 sm:pb-14 sm:pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-1/2 top-10 h-[24rem] w-[24rem] -translate-x-1/2 rounded-full bg-zinc-900/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-44 w-44 rounded-full bg-zinc-300/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center lg:mx-0 lg:items-center">
            <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] leading-[0.92] text-zinc-950 sm:text-6xl lg:text-[4.75rem]">
              Buy. Sell. Online.
            </h1>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onBrowseMarket}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 hover:bg-red-800"
              >
                Browse Market
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative hidden min-h-[30rem] lg:block" aria-hidden="true">
            <div className="pointer-events-none absolute inset-8 rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,rgba(39,39,42,0.10),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(161,161,170,0.10),transparent_30%)] blur-2xl" />

            {heroCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className={`absolute w-64 rounded-[1.75rem] border border-zinc-200/90 bg-white/95 p-5 shadow-[0_24px_65px_-20px_rgba(0,0,0,0.32),0_10px_25px_-12px_rgba(0,0,0,0.16)] ring-1 ring-black/5 backdrop-blur-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_30px_75px_-20px_rgba(0,0,0,0.36),0_12px_30px_-12px_rgba(0,0,0,0.18)] ${card.className}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                      BuyMesho
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-black tracking-[-0.04em] text-zinc-950">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
