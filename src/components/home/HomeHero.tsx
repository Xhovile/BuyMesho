import { ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";

import { trustPills } from "../../home/home.constants";

export default function HomeHero({ onBrowseMarket }: { onBrowseMarket: () => void }) {
  return (
    <section className="relative overflow-hidden pb-6 pt-4 sm:pb-14 sm:pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-red-900/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-red-900/10 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-900"
          >
            Student Marketplace • Malawi
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-5 text-4xl font-black tracking-[-0.06em] leading-[0.92] text-zinc-950 sm:text-6xl"
          >
            Buy and sell on campus
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            <button
              type="button"
              onClick={onBrowseMarket}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 hover:bg-red-800"
            >
              Browse Market
              <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 hidden flex-wrap gap-2 sm:flex"
          >
            {trustPills.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 shadow-sm"
              >
                <Check className="h-3.5 w-3.5 text-red-900" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
