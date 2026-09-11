import { useEffect, useState } from "react";
import { ArrowRight, Banknote, Globe2, ShieldCheck, Store, Tag, Users } from "lucide-react";

const states = [
  [
    ["For everyone", "Browse and buy from sellers across Malawi and beyond.", Globe2],
    ["Built for sellers", "List your products and reach more customers online.", Tag],
    ["Secure payments", "Pay with supported Mobile Money, banks, or PayChangu.", ShieldCheck],
  ],
  [
    ["Discover products", "Find products from sellers in one public marketplace.", Globe2],
    ["Reach customers", "Put your products in front of more people online.", Users],
    ["Simple checkout", "Move from product discovery to secure payment.", Banknote],
  ],
  [
    ["Buy online", "Shop without having to visit every seller physically.", Store],
    ["Sell online", "Create listings and present your products professionally.", Tag],
    ["Built to connect", "One marketplace connecting buyers and sellers.", Users],
  ],
] as const;

const positions = [
  "left-1/2 top-0 -translate-x-1/2 -rotate-3 lg:left-[43%] lg:top-[2%] lg:translate-x-0",
  "left-[3%] bottom-0 -rotate-6 lg:left-[7%] lg:bottom-[3%]",
  "right-[3%] bottom-0 rotate-3 lg:right-[-2%] lg:bottom-[4%]",
];

export default function HomeHero({ onBrowseMarket }: { onBrowseMarket: () => void }) {
  const [step, setStep] = useState(0);
  const [converging, setConverging] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      setConverging(true);
      window.setTimeout(() => {
        setStep((value) => (value + 1) % states.length);
        setConverging(false);
      }, 700);
    }, 4300);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-zinc-900/10 via-zinc-100 to-white pb-10 pt-8 sm:pb-14">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-[68%] top-8 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-red-700/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-full bg-zinc-300/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] lg:gap-2">
          <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex items-center gap-4 text-[11px] font-bold tracking-[0.24em] text-zinc-500">
              <span className="h-[2px] w-14 bg-gradient-to-r from-red-600 to-red-200" />
              A PUBLIC MARKETPLACE
            </div>
            <h1 className="mt-6 text-5xl font-black leading-[0.92] tracking-[-0.065em] text-zinc-950 sm:text-7xl lg:text-[5rem]">
              <span className="block">Buy. Sell.</span>
              <span className="mt-1 block text-red-700">Everything Online.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-600 sm:text-xl">
              Discover products, reach customers, and buy securely — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
              <button type="button" onClick={onBrowseMarket} className="group inline-flex items-center gap-2 rounded-[1.05rem] bg-red-700 px-7 py-4 text-sm font-extrabold text-white shadow-[0_18px_35px_-14px_rgba(185,15,32,0.65)] transition hover:-translate-y-0.5 hover:bg-red-800">
                Browse Market <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <a href="#sell" className="border-b-2 border-zinc-300 pb-1 text-sm font-extrabold text-zinc-900 transition hover:border-red-600 hover:text-red-700">Start selling</a>
            </div>
            <div className="mt-9 grid w-full max-w-xl grid-cols-3 gap-4 border-t border-zinc-200/90 pt-6">
              {[[Users, "Open to", "everyone"], [ShieldCheck, "Secure", "payments"], [Store, "Built for", "commerce"]].map(([Icon, a, b]) => (
                <div key={`${a}-${b}`} className="flex items-center justify-center gap-2 text-left lg:justify-start">
                  <Icon className="h-5 w-5 text-red-700" />
                  <span className="text-xs font-bold leading-tight text-zinc-700 sm:text-sm">{a}<br />{b}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[35rem]" aria-label="BuyMesho marketplace features">
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 900 650" fill="none" aria-hidden="true">
              <defs>
                <radialGradient id="buyGlow"><stop stopColor="#ef1b2d" stopOpacity=".20" /><stop offset="1" stopColor="#ef1b2d" stopOpacity="0" /></radialGradient>
                <filter id="buyBlur"><feGaussianBlur stdDeviation="22" /></filter>
              </defs>
              <circle cx="575" cy="325" r="220" fill="url(#buyGlow)" filter="url(#buyBlur)" />
              <path d="M350 170 C500 70 700 90 805 225" stroke="#d91b2c" strokeOpacity=".28" strokeDasharray="5 10" />
              <path d="M755 215 C820 350 735 490 555 500 C395 510 300 415 340 285" stroke="#d91b2c" strokeOpacity=".25" strokeDasharray="5 10" />
              <path d="M400 420 C465 515 625 550 755 440" stroke="#d91b2c" strokeOpacity=".20" strokeDasharray="5 10" />
              <circle cx="575" cy="325" r="72" stroke="#ef1b2d" strokeOpacity=".11" />
              <circle cx="575" cy="325" r="100" stroke="#ef1b2d" strokeOpacity=".07" />
            </svg>

            <div className="absolute left-1/2 top-[48%] z-10 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[1.8rem] bg-gradient-to-br from-red-600 to-red-800 shadow-[0_20px_35px_-8px_rgba(185,15,32,0.5)]">
              <svg viewBox="0 0 64 64" className="h-12 w-12" aria-hidden="true">
                <path d="M13 15h7l5 25h25l7-19H23" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="29" cy="50" r="3.5" fill="white" /><circle cx="51" cy="50" r="3.5" fill="white" />
                <path d="M27 34h22" stroke="white" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            {states[step].map(([title, description, Icon], index) => (
              <article key={`${step}-${index}`} className={`absolute z-20 w-[min(18rem,42vw)] rounded-[1.8rem] border border-zinc-200/90 bg-white/95 p-5 shadow-[0_24px_65px_-20px_rgba(0,0,0,0.32),0_10px_25px_-12px_rgba(0,0,0,0.16)] ring-1 ring-black/5 backdrop-blur-sm transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${positions[index]} ${converging ? "left-1/2 right-auto top-[48%] bottom-auto -translate-x-1/2 -translate-y-1/2 rotate-0 scale-75 opacity-20" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-950 text-white"><Icon className="h-5 w-5" /></div>
                  <span className="text-[10px] font-extrabold tracking-[0.2em] text-zinc-400">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h2 className="mt-5 text-xl font-black leading-tight tracking-[-0.04em] text-zinc-950">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
