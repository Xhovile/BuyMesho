import { ArrowRight, Plus } from "lucide-react";

const heroCards = [
  {
    title: "Secure with Passkeys, 2FA Authentication, and more!",
    description: "Protect your account with modern authentication and additional security controls.",
    className: "md:left-0 md:top-[7%] md:-rotate-3 lg:left-[-3%] lg:top-[8%] lg:-rotate-3",
    tone: "bg-red-50/75 border-red-200/80 before:bg-red-500/70",
  },
  {
    title: "For everyone",
    description: "Browse and buy from sellers across Malawi and beyond.",
    className: "md:left-[30%] md:top-0 md:rotate-3 lg:left-[36%] lg:top-[2%] lg:rotate-3",
    tone: "bg-amber-50/65 border-amber-200/80 before:bg-amber-500/70",
  },
  {
    title: "Built for sellers",
    description: "List your products and reach more customers online.",
    className: "md:left-[12%] md:bottom-[2%] md:-rotate-5 lg:left-[10%] lg:bottom-[3%] lg:-rotate-5",
    tone: "bg-sky-50/70 border-sky-200/80 before:bg-sky-500/70",
  },
  {
    title: "Secure payments",
    description: "Pay with Mpamba, Airtel Money, VISA card or directly from a Malawian Bank account. Confirmation after delivery (Escrow) is also supported.",
    className: "md:right-0 md:bottom-[2%] md:rotate-3 lg:right-[-1%] lg:bottom-[4%] lg:rotate-3",
    tone: "bg-emerald-50/70 border-emerald-200/80 before:bg-emerald-500/70",
  },
] as const;

export default function HomeHero({
  onBrowseMarket,
  onSellItem,
  isSeller = false,
  isSellerProfileLoading = false,
}: {
  onBrowseMarket: () => void;
  onSellItem?: () => void;
  isSeller?: boolean;
  isSellerProfileLoading?: boolean;
}) {
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
              <span className="mt-1 block text-red-800">Everything Online.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl max-md:hidden">
              Discover products, reach customers, and buy securely — all in one place.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:justify-start">
              <button
                type="button"
                onClick={onBrowseMarket}
                className="inline-flex items-center justify-center gap-2 rounded-[1.05rem] bg-red-700 px-5 py-3.5 text-sm font-extrabold text-white shadow-[0_16px_32px_-14px_rgba(185,15,32,0.45)] transition-all hover:-translate-y-0.5 hover:bg-red-800 hover:shadow-[0_20px_40px_-14px_rgba(185,15,32,0.5)] focus:outline-none focus:ring-2 focus:ring-red-700/30 focus:ring-offset-2"
              >
                Browse Market
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onSellItem}
                disabled={!onSellItem || isSellerProfileLoading}
                className="hidden items-center gap-2 rounded-[1.05rem] bg-zinc-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-zinc-950/15 transition hover:-translate-y-0.5 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:inline-flex"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {isSellerProfileLoading ? "Loading..." : isSeller ? "List Item" : "Sell"}
                </span>
              </button>
            </div>
          </div>

          <div className="relative hidden min-h-[32rem] md:block" aria-label="BuyMesho marketplace benefits">
            {heroCards.map((card) => (
              <article
                key={card.title}
                className={`absolute z-20 w-56 rounded-[1.65rem] border p-5 shadow-[0_24px_65px_-20px_rgba(0,0,0,0.20),0_10px_25px_-12px_rgba(0,0,0,0.10)] backdrop-blur-sm before:absolute before:inset-x-4 before:top-0 before:h-[2px] before:rounded-full before:content-[''] sm:w-60 lg:w-64 ${card.tone} ${card.className}`}
              >
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-500/90">BuyMesho</span>
                <h2 className="mt-5 text-xl font-black leading-tight tracking-[-0.04em] text-zinc-950">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700/80">
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
