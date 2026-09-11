import { ArrowRight } from "lucide-react";

const heroCards = [
  {
    title: "Secure with Passkeys, 2FA Authentication, and more!",
    description: "Modern account security designed to help protect your BuyMesho experience.",
    className: "md:left-[-2%] md:top-[8%] md:-rotate-4 lg:left-[-2%] lg:top-[7%]",
    tone: "bg-red-50/80 border-red-200 border-l-red-500",
  },
  {
    title: "For everyone",
    description: "Browse and buy from sellers across Malawi and beyond.",
    className: "md:left-[39%] md:top-[2%] md:rotate-3 lg:left-[42%] lg:top-[3%]",
    tone: "bg-zinc-50/90 border-zinc-200 border-t-red-200",
  },
  {
    title: "Built for sellers",
    description: "List your products and reach more customers online.",
    className: "md:left-[9%] md:bottom-[3%] md:-rotate-3 lg:left-[8%] lg:bottom-[5%]",
    tone: "bg-amber-50/70 border-amber-200 border-l-amber-400",
  },
  {
    title: "Secure payments",
    description: "Pay with supported Mobile Money, banks, or PayChangu.",
    className: "md:right-[-1%] md:bottom-[3%] md:rotate-4 lg:right-[-2%] lg:bottom-[5%]",
    tone: "bg-emerald-50/70 border-emerald-200 border-r-emerald-400",
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
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-4">
          <div className="relative z-10 flex flex-col items-center text-center md:items-start md:text-left">
            <div className="flex items-center gap-4 text-[10px] font-bold tracking-[0.24em] text-zinc-500 sm:text-[11px]">
              <span className="h-[2px] w-12 bg-gradient-to-r from-red-600 to-red-200 sm:w-14" />
              A PUBLIC MARKETPLACE
            </div>

            <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl lg:text-[5rem]">
              <span className="block">Buy. Sell.</span>
              <span className="mt-1 block text-red-700">Everything Online.</span>
            </h1>

            <p className="mt-7 hidden max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl md:block">
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
            {heroCards.map((card) => (
              <article
                key={card.title}
                className={`absolute z-20 w-56 rounded-[1.65rem] border p-5 shadow-[0_20px_50px_-22px_rgba(0,0,0,0.30),0_8px_20px_-12px_rgba(0,0,0,0.13)] ${card.tone} sm:w-60 lg:w-64 ${card.className}`}
              >
                <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                  BuyMesho
                </span>
                <h2 className="mt-4 text-xl font-black leading-tight tracking-[-0.04em] text-zinc-950">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
