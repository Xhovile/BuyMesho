import { Plus, Filter, ShieldCheck, Clock3 } from "lucide-react";
import { motion } from "motion/react";
import { navigateToCreateListing } from "../lib/appNavigation";

type HeroSectionProps = {
  onStartSelling: () => void;
};

export default function HeroSection(_: HeroSectionProps) {
  return (
    <section className="relative pt-8 pb-6 sm:pt-10 sm:pb-8">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22rem] sm:w-[30rem] h-[22rem] sm:h-[30rem] bg-red-900/8 blur-3xl rounded-full" />
      </div>

      <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-red-900/10 bg-red-900/[0.03] text-[11px] font-extrabold uppercase tracking-[0.18em] text-red-900"
            >
              Explore • Campus marketplace
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.05em] leading-[0.98] text-zinc-900"
            >
              Browse campus listings without the mess.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 font-medium leading-relaxed"
            >
              Explore BuyMesho by campus, category, subcategory, item type, and budget.
              Find useful student listings faster and contact sellers directly on WhatsApp.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-5 flex flex-wrap gap-2"
            >
              {[
                { icon: Filter, label: "Smarter filters" },
                { icon: ShieldCheck, label: "Clearer trust signals" },
                { icon: Clock3, label: "Fresh campus discovery" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-600"
                  >
                    <Icon className="w-3.5 h-3.5 text-red-900" />
                    {item.label}
                  </span>
                );
              })}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="xl:max-w-sm w-full rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5"
          >
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
              Seller action
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
              Ready to list something useful?
            </h2>
            <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
              Post your item with better structure, stronger details, and cleaner buyer discovery.
            </p>

            <button
              type="button"
              onClick={navigateToCreateListing}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4" />
              Start Selling
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
