export default function WhyBuyMeshoSection() {
  return (
    <section className="relative left-1/2 -mt-8 w-screen -translate-x-1/2 overflow-hidden bg-[#071b2d] px-4 py-10 text-white sm:py-12 lg:py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 -translate-y-1/2 bg-gradient-to-b from-transparent via-[#071b2d]/45 to-[#071b2d] blur-md" />

      <div className="relative mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/55">Why BuyMesho</p>
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
        </div>

        <div className="mt-4 grid gap-5 sm:gap-6 md:mt-6 md:gap-7">
          <div className="max-w-4xl">
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-red-300">Main point</p>
            <p className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base md:text-2xl md:font-black md:leading-tight md:tracking-[-0.03em]">
              BuyMesho is a public e-commerce platform meant to enhance the exposure of student entrepreneurs while also serving as a marketplace for sellers offering student-friendly products and services.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3 md:gap-0">
            <article className="relative z-30 -rotate-2 rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:-translate-y-2 hover:-rotate-1 sm:p-6 md:min-h-[210px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">01 — Access</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                Everyone can buy on BuyMesho.
              </p>
            </article>

            <article className="relative z-20 -mt-3 rotate-[2.5deg] rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-[0_28px_56px_-22px_rgba(0,0,0,0.58)] transition-transform duration-200 hover:-translate-y-2 hover:rotate-1 sm:p-6 md:-ml-5 md:-mt-0 md:min-h-[235px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">02 — Purpose</p>
              <p className="mt-4 text-base leading-7 text-zinc-800 sm:text-lg md:text-[1.05rem] md:leading-7">
                Seller restrictions apply only because the platform&apos;s primary goal is to help student entrepreneurs develop and grow.
              </p>
            </article>

            <article className="relative z-10 -mt-3 -rotate-[2.5deg] rounded-3xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-[0_24px_50px_-22px_rgba(0,0,0,0.55)] transition-transform duration-200 hover:-translate-y-2 hover:-rotate-1 sm:p-6 md:-ml-5 md:-mt-0 md:min-h-[210px] md:p-6">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-zinc-400">03 — Structure</p>
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
