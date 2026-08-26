export default function WhyBuyMeshoSection() {
  return (
    <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-[#071b2d] px-4 py-10 text-white sm:py-12 lg:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(239,68,68,0.13),transparent_26%),radial-gradient(circle_at_84%_24%,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_65%_88%,rgba(245,158,11,0.1),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.025),transparent_40%,rgba(255,255,255,0.015))]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#071b2d]/55 to-[#071b2d] blur-md" />
      <div className="pointer-events-none absolute left-[8%] top-[-8rem] h-72 w-72 rounded-full bg-red-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute right-[10%] top-[-5rem] h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-[44%] h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/55">Why BuyMesho</p>
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.45)]" />
        </div>

        <div className="mt-4 grid gap-5 sm:gap-6 md:mt-6 md:gap-7">
          <div className="max-w-4xl">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-300">Main point</p>
            <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base md:text-2xl md:font-black md:leading-tight md:tracking-[-0.03em]">
              BuyMesho is a public e-commerce platform meant to enhance the exposure of student entrepreneurs while also serving as a marketplace for sellers offering student-friendly products and services.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 md:gap-0">
            <article className="relative z-30 -rotate-2 rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white to-red-50 p-5 text-zinc-900 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.72),0_10px_24px_-14px_rgba(127,29,29,0.22)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-2 hover:-rotate-1 hover:shadow-[0_38px_80px_-24px_rgba(0,0,0,0.78),0_14px_30px_-14px_rgba(127,29,29,0.24)] sm:p-6 md:min-h-[210px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-900/50">01 — Access</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                Everyone can buy on BuyMesho.
              </p>
            </article>

            <article className="relative z-20 -mt-3 rotate-[2.5deg] rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white to-amber-50 p-5 text-zinc-900 shadow-[0_34px_76px_-24px_rgba(0,0,0,0.74),0_12px_28px_-14px_rgba(180,83,9,0.2)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-2 hover:rotate-1 hover:shadow-[0_42px_86px_-24px_rgba(0,0,0,0.8),0_16px_34px_-14px_rgba(180,83,9,0.22)] sm:p-6 md:-ml-5 md:-mt-0 md:min-h-[235px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-amber-800/60">02 — Purpose</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
              </p>
            </article>

            <article className="relative z-10 -mt-3 -rotate-[2.5deg] rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white to-sky-50 p-5 text-zinc-900 shadow-[0_30px_70px_-24px_rgba(0,0,0,0.72),0_10px_24px_-14px_rgba(14,116,144,0.18)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-2 hover:-rotate-1 hover:shadow-[0_38px_80px_-24px_rgba(0,0,0,0.78),0_14px_30px_-14px_rgba(14,116,144,0.2)] sm:p-6 md:-ml-5 md:-mt-0 md:min-h-[210px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-sky-800/60">03 — Structure</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                List products once, get discovered faster, and build trust through a structured marketplace designed for real commerce.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
