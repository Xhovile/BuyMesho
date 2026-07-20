import { ArrowRight, BadgeCheck, Check, Globe2, Users } from "lucide-react";
import { motion } from "motion/react";

import { trustPills } from "../../home/home.constants";

const heroCards = [
  {
    title: "For everyone",
    description: "Anyone can browse and buy.",
    icon: Globe2,
    className: "left-0 top-8 -rotate-3",
  },
  {
    title: "Student entrepreneurs",
    description: "Built to help sellers grow.",
    icon: Users,
    className: "right-6 top-28 rotate-3",
  },
  {
    title: "Trusted listings",
    description: "A structured marketplace for real commerce.",
    icon: BadgeCheck,
    className: "left-16 bottom-0 rotate-1",
  },
] as const;

export default function HomeHero({ onBrowseMarket }: { onBrowseMarket: () => void }) {
  return (
    <section className="relative overflow-hidden pb-8 pt-4 sm:pb-14 sm:pt-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-red-900/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center lg:mx-0 lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-red-900/10 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-900"
            >
              Marketplace • Malawi
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-5 text-4xl font-black tracking-[-0.06em] leading-[0.92] text-zinc-950 sm:text-6xl lg:text-[4.75rem]"
            >
              Buy. Sell. Online.
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 flex flex-wrap justify-center gap-3"
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
              className="mt-5 hidden flex-wrap justify-center gap-2 sm:flex"
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

          <div className="relative hidden min-h-[30rem] lg:block">
            <div className="pointer-events-none absolute inset-8 rounded-[2.5rem] bg-[radial-gradient(circle_at_top_left,rgba(127,29,29,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_30%)] blur-2xl" />

            {heroCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.12 + index * 0.08 }}
                  className={`absolute w-64 rounded-[1.75rem] border border-zinc-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.3)] ${card.className}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-white shadow-lg shadow-zinc-900/15">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                      BuyMesho
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-black tracking-[-0.04em] text-zinc-950">
                    {card.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {card.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
