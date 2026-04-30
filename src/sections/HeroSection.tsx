import { Plus } from "lucide-react";
import { motion } from "motion/react";

type HeroSectionProps = {
  onListItem: () => void;
};

export default function HeroSection({ onListItem }: HeroSectionProps) {
  return (
    <section className="relative px-4 pt-6 pb-4 sm:pt-8 sm:pb-5">
      <div className="absolute inset-x-4 top-0 -z-10 h-24 rounded-[2rem] bg-gradient-to-r from-red-900/5 via-white to-amber-300/10 blur-2xl" />

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              Browse products and services on BuyMesho.
            </motion.h1>

            <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-500">
              Discover listings, compare options, and connect directly with sellers in your campus community.
            </p>
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
