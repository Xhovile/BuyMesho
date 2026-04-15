import { Plus } from "lucide-react";
import { motion } from "motion/react";

type HeroSectionProps = {
  onListItem: () => void;
};

export default function HeroSection({ onListItem }: HeroSectionProps) {
  return (
    <section className="relative pt-6 pb-5 sm:pt-8 sm:pb-6">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[18rem] sm:w-[24rem] h-[18rem] sm:h-[24rem] bg-red-900/8 blur-3xl rounded-full" />
      </div>

      <div className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white px-5 py-5 sm:px-7 sm:py-6 shadow-sm">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-900 via-red-700 to-amber-300" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400"
            >
              Market
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.06em] leading-[0.95] text-zinc-900"
            >
              Browse campus listings.
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="shrink-0"
          >
            <button
              type="button"
              onClick={onListItem}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4" />
              List Item
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
