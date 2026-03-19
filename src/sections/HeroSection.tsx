import { Plus } from "lucide-react";
import { motion } from "motion/react";

type HeroSectionProps = {
  onStartSelling: () => void;
};

export default function HeroSection({ onStartSelling }: HeroSectionProps) {
  return (
    <section className="relative py-14 sm:py-24">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[22rem] sm:w-[34rem] h-[22rem] sm:h-[34rem] bg-red-900/8 blur-3xl rounded-full" />
        <div className="absolute top-24 right-0 w-40 h-40 bg-amber-200/20 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-zinc-300/20 blur-3xl rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-900/10 bg-white/80 backdrop-blur-sm text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.22em] text-red-900 shadow-sm"
        >
          Student Marketplace • Malawi
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 text-5xl sm:text-7xl lg:text-8xl font-black tracking-[-0.06em] leading-[0.95]"
        >
          <span className="text-zinc-900">Buy from Mesho,</span>
          <br />
          <span className="text-red-900">grow each other.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-5 max-w-2xl mx-auto text-sm sm:text-base text-zinc-500 font-semibold leading-relaxed"
        >
          BuyMesho means buy from Mesho.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button
            type="button"
            onClick={onStartSelling}
            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-6 py-3 rounded-2xl text-sm font-extrabold shadow-lg shadow-zinc-300/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Start Selling
          </button>

          <button
            type="button"
            onClick={() => window.scrollTo({ top: 520, behavior: "smooth" })}
            className="inline-flex items-center gap-2 bg-white hover:bg-zinc-50 text-zinc-900 px-6 py-3 rounded-2xl text-sm font-extrabold border border-zinc-200 shadow-sm transition-all active:scale-95"
          >
            Explore Listings
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-zinc-500"
        >
          <span className="px-3 py-2 rounded-full bg-white border border-zinc-200 shadow-sm">Safe</span>
          <span className="px-3 py-2 rounded-full bg-white border border-zinc-200 shadow-sm">Fast</span>
          <span className="px-3 py-2 rounded-full bg-white border border-zinc-200 shadow-sm">Flexible</span>
          <span className="px-3 py-2 rounded-full bg-white border border-zinc-200 shadow-sm">Built for Malawi</span>
        </motion.div>
      </div>
    </section>
  );
  }
