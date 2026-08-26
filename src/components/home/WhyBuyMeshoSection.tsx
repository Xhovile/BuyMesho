export default function WhyBuyMeshoSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.18)] sm:p-7 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(127,29,29,0.10),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(24,24,27,0.05),transparent_28%)] md:hidden" />
        <div className="relative">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Why BuyMesho</p>
            <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
          </div>

          <div className="mt-4 grid gap-3 sm:gap-4 md:mt-6 md:gap-8">
            <div className="rounded-[1.5rem] border border-red-950/10 bg-zinc-900 p-4 text-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.45)] sm:p-5 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:max-w-4xl">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-200/80 md:text-red-900">Main point</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-100 sm:text-base md:mt-4 md:text-2xl md:font-black md:leading-tight md:tracking-[-0.03em] md:text-zinc-950">
                BuyMesho is a platform meant to enhance the exposure of student entrepreneurship while also serving as a marketplace for sellers offering student-friendly products and services.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 md:gap-8 md:border-t md:border-zinc-200 md:pt-7">
              <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:rounded-none md:border-0 md:bg-transparent md:p-0">
                <div className="mb-4 flex h-[88px] w-full max-w-[230px] -rotate-1 items-center justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:translate-y-[-2px] hover:rotate-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-900/10 bg-red-50 text-2xl font-black text-red-900">↗</div>
                  <div className="pr-2 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">ACCESS</p>
                    <p className="mt-1 text-xs font-extrabold text-zinc-900">Open marketplace</p>
                  </div>
                </div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">01 — Access</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-base md:mt-4 md:text-base md:text-zinc-800">Everyone can buy on BuyMesho.</p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:rounded-none md:border-0 md:border-l md:border-zinc-200 md:bg-transparent md:p-0 md:pl-6">
                <div className="mb-4 flex h-[88px] w-full max-w-[230px] rotate-1 items-center justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:translate-y-[-2px] hover:rotate-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-900/10 bg-red-50 text-2xl font-black text-red-900">✦</div>
                  <div className="pr-2 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">PURPOSE</p>
                    <p className="mt-1 text-xs font-extrabold text-zinc-900">Student enterprise</p>
                  </div>
                </div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">02 — Purpose</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-base md:mt-4 md:text-base md:text-zinc-800">Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.</p>
              </div>

              <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/80 p-4 sm:p-5 md:rounded-none md:border-0 md:border-l md:border-zinc-200 md:bg-transparent md:p-0 md:pl-6">
                <div className="mb-4 flex h-[88px] w-full max-w-[230px] -rotate-1 items-center justify-between overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:translate-y-[-2px] hover:rotate-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-900/10 bg-red-50 text-2xl font-black text-red-900">≡</div>
                  <div className="pr-2 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">STRUCTURE</p>
                    <p className="mt-1 text-xs font-extrabold text-zinc-900">Built for commerce</p>
                  </div>
                </div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">03 — Structure</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-700 sm:text-base md:mt-4 md:text-base md:text-zinc-800">List once, get discovered faster, and build trust through a structured marketplace designed for real commerce.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
