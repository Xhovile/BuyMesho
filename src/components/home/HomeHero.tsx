import { ArrowRight, Globe2, ShieldCheck, Tag } from "lucide-react";

const heroCards = [
  {
    title: "For everyone",
    description: "Browse and buy from sellers across Malawi and beyond.",
    icon: Globe2,
    className: "md:left-1/2 md:top-0 md:-translate-x-1/2 md:-rotate-3 lg:left-[43%] lg:top-[2%] lg:translate-x-0",
  },
  {
    title: "Built for sellers",
    description: "List your products and reach more customers online.",
    icon: Tag,
    className: "md:left-[2%] md:bottom-[2%] md:-rotate-6 lg:left-[7%] lg:bottom-[3%]",
  },
  {
    title: "Secure payments",
    description: "Pay with supported Mobile Money, banks, or PayChangu.",
    icon: ShieldCheck,
    className: "md:right-[2%] md:bottom-[3%] md:rotate-3 lg:right-[-2%] lg:bottom-[4%]",
  },
] as const;

export default function HomeHero({ onBrowseMarket }: { onBrowseMarket: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-zinc-100 via-zinc-100 to-white pb-10 pt-10 sm:pb-14 sm:pt-12">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[68%] top-8 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-red-700/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-zinc-300/18 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:gap-2">
          <div className="relative z-10 flex flex-col items-center text-center md:items-start md:text-left">
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.24em] text-zinc-500 sm:text-[11px]">
              <span className="h-[2px] w-12 bg-gradient-to-r from-red-600 to-red-200 sm:w-14" />
              A PUBLIC MARKETPLACE
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl lg:text-[5rem]">
              <span className="block">Buy. Sell.</span>
              <span className="mt-1 block text-red-700">Everything Online.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              Discover products, reach customers, and buy securely — all in one place.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center md:justify-start">
              <button
                type="button"
                onClick={onBrowseMarket}
                className="group inline-flex items-center gap-2 rounded-[1.05rem] bg-red-700 px-7 py-4 text-sm font-extrabold text-white shadow-[0_18px_35px_-14px_rgba(185,15,32,0.65)] transition hover:-translate-y-0.5 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700/30 focus:ring-offset-2"
              >
                Browse Market
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          <div className="relative hidden min-h-[32rem] md:block" aria-label="BuyMesho marketplace benefits">
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 900 650"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="buyMeshoHeroGlow">
                  <stop stopColor="#ef1b2d" stopOpacity=".16" />
                  <stop offset="1" stopColor="#ef1b2d" stopOpacity="0" />
                </radialGradient>
                <filter id="buyMeshoHeroBlur">
                  <feGaussianBlur stdDeviation="24" />
                </filter>
              </defs>
              <circle cx="575" cy="325" r="220" fill="url(#buyMeshoHeroGlow)" filter="url(#buyMeshoHeroBlur)" />
              <path d="M350 170 C500 70 700 90 805 225" stroke="#d91b2c" strokeOpacity=".22" strokeDasharray="5 10" />
              <path d="M755 215 C820 350 735 490 555 500 C395 510 300 415 340 285" stroke="#d91b2c" strokeOpacity=".20" strokeDasharray="5 10" />
              <path d="M400 420 C465 515 625 550 755 440" stroke="#d91b2c" strokeOpacity=".16" strokeDasharray="5 10" />
              <circle cx="575" cy="325" r="72" stroke="#ef1b2d" strokeOpacity=".08" />
              <circle cx="575" cy="325" r="100" stroke="#ef1b2d" strokeOpacity=".05" />
            </svg>

            <div className="pointer-events-none absolute left-1/2 top-[48%] z-10 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[1.5rem] bg-gradient-to-br from-red-600 to-red-800 shadow-[0_20px_35px_-8px_rgba(185,15,32,0.38)] lg:h-24 lg:w-24 lg:rounded-[1.8rem]">
              <svg viewBox="0 0 64 64" className="h-11 w-11 lg:h-12 lg:w-12" aria-hidden="true">
                <path d="M13 15h7l5 25h25l7-19H23" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="29" cy="50" r="3.5" fill="white" />
                <circle cx="51" cy="50" r="3.5" fill="white" />
                <path d="M27 34h22" stroke="white" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            {heroCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className={`absolute z-20 w-56 rounded-[1.65rem] border border-zinc-200/90 bg-white/95 p-5 shadow-[0_24px_65px_-20px_rgba(0,0,0,0.30),0_10px_25px_-12px_rgba(0,0,0,0.14)] ring-1 ring-black/5 backdrop-blur-sm sm:w-60 lg:w-64 ${card.className}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                      BuyMesho
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-black leading-tight tracking-[-0.04em] text-zinc-950">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
