import { ArrowRight, ShieldCheck, Sparkles, Store, Search, MessageCircle } from "lucide-react";
import { motion } from "motion/react";
import { EXPLORE_PATH, navigateToPath } from "./lib/appNavigation";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath("/")}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">
              B
            </div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Campus marketplace
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50"
            >
              Explore
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800"
            >
              Start Here
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-16 sm:py-24">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[26rem] h-[26rem] bg-red-900/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 right-0 w-56 h-56 bg-amber-200/25 blur-3xl rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-10 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-900/10 bg-white/80 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-900"
              >
                Student Marketplace • Malawi
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-6 text-5xl sm:text-7xl font-black tracking-[-0.06em] leading-[0.95]"
              >
                A cleaner way to buy,
                <span className="text-red-900"> sell, and discover on campus.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 max-w-2xl text-base text-zinc-600 font-medium leading-relaxed"
              >
                BuyMesho helps students find relevant listings faster, contact sellers through WhatsApp,
                and trade in a marketplace that feels more structured than scattered campus groups.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => navigateToPath(EXPLORE_PATH)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-zinc-300/30 hover:bg-zinc-800"
                >
                  Explore Listings
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateToPath(EXPLORE_PATH)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
                >
                  Start Selling
                </button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {[
                {
                  icon: ShieldCheck,
                  title: "Campus-first trust",
                  text: "Find listings with clearer seller identity, campus relevance, and stronger structure.",
                },
                {
                  icon: Search,
                  title: "Faster discovery",
                  text: "Browse by category, subcategory, item type, price, and more relevant filters.",
                },
                {
                  icon: MessageCircle,
                  title: "Simple contact",
                  text: "Reach sellers directly on WhatsApp without a heavy in-app messaging system.",
                },
                {
                  icon: Store,
                  title: "Made for student trade",
                  text: "Built for practical campus buying and selling, not a generic marketplace.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
                    <div className="w-11 h-11 rounded-2xl bg-red-900/5 text-red-900 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-extrabold text-zinc-900">{item.title}</h3>
                    <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{item.text}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pb-16">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Quick paths</p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                  Get to the right action faster.
                </h2>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-700">
                <Sparkles className="w-4 h-4 text-red-900" />
                Structured. practical. campus-first.
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Browse by campus",
                  text: "Open Explore and narrow listings to your campus and budget quickly.",
                },
                {
                  title: "Find useful categories",
                  text: "Discover practical student items, services, and everyday essentials faster.",
                },
                {
                  title: "Sell with more structure",
                  text: "Create stronger listings with cleaner details, better photos, and clearer trust signals.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <h3 className="text-base font-extrabold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
