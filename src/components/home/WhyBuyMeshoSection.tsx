export default function WhyBuyMeshoSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Why BuyMesho</p>
          <span className="h-2.5 w-2.5 rounded-full bg-red-900" />
        </div>

        <div className="mt-4 grid gap-3 sm:gap-4 md:mt-6 md:gap-6">
          <div className="max-w-4xl">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-900">Main point</p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-800 sm:text-base md:text-2xl md:font-black md:leading-tight md:tracking-[-0.03em] md:text-zinc-950">
              BuyMesho is a platform meant to enhance the exposure of student entrepreneurship while also serving as a marketplace for sellers offering student-friendly products and services.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 md:gap-8 md:border-t md:border-zinc-200 md:pt-7">
            <div>
              <div className="flex min-h-[150px] w-full items-start gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.35)] -rotate-1 transition-transform duration-200 hover:rotate-0 hover:-translate-y-1 sm:min-h-[160px] sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-900/10 bg-red-50 text-2xl font-black text-red-900 sm:h-14 sm:w-14">↗</div>
                <p className="pt-1 text-sm leading-relaxed text-zinc-800 sm:text-base sm:leading-7">
                  Everyone can buy on BuyMesho.
                </p>
              </div>
              <p className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">01 — Access</p>
            </div>

            <div>
              <div className="flex min-h-[150px] w-full items-start gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.35)] rotate-1 transition-transform duration-200 hover:rotate-0 hover:-translate-y-1 sm:min-h-[160px] sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-900/10 bg-red-50 text-2xl font-black text-red-900 sm:h-14 sm:w-14">✦</div>
                <p className="pt-1 text-sm leading-relaxed text-zinc-800 sm:text-base sm:leading-7">
                  Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
                </p>
              </div>
              <p className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">02 — Purpose</p>
            </div>

            <div>
              <div className="flex min-h-[150px] w-full items-start gap-4 overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-[0_14px_30px_-20px_rgba(0,0,0,0.35)] -rotate-1 transition-transform duration-200 hover:rotate-0 hover:-translate-y-1 sm:min-h-[160px] sm:p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-900/10 bg-red-50 text-2xl font-black text-red-900 sm:h-14 sm:w-14">≡</div>
                <p className="pt-1 text-sm leading-relaxed text-zinc-800 sm:text-base sm:leading-7">
                  List once, get discovered faster, and build trust through a structured marketplace designed for real commerce.
                </p>
              </div>
              <p className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">03 — Structure</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
