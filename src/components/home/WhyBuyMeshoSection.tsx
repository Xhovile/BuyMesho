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

          <div className="grid gap-0 md:grid-cols-3 md:gap-0 md:border-t md:border-zinc-200 md:pt-7">
            <article className="relative z-30 -rotate-2 rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_22px_44px_-22px_rgba(0,0,0,0.34)] transition-transform duration-200 hover:-translate-y-2 hover:-rotate-1 sm:p-6 md:min-h-[210px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">01 — Access</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                Everyone can buy on BuyMesho.
              </p>
            </article>

            <article className="relative z-20 -mt-3 rotate-[2.5deg] rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_26px_50px_-22px_rgba(0,0,0,0.38)] transition-transform duration-200 hover:-translate-y-2 hover:rotate-1 sm:p-6 md:-ml-5 md:-mt-0 md:min-h-[235px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">02 — Purpose</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
              </p>
            </article>

            <article className="relative z-10 -mt-3 -rotate-[2.5deg] rounded-3xl border border-zinc-200 bg-white p-5 shadow-[0_22px_44px_-22px_rgba(0,0,0,0.34)] transition-transform duration-200 hover:-translate-y-2 hover:-rotate-1 sm:p-6 md:-ml-5 md:-mt-0 md:min-h-[210px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">03 — Structure</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                List once, get discovered faster, and build trust through a structured marketplace designed for real commerce.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
