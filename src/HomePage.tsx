import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Store,
  Search,
  MessageCircle,
  Smartphone,
  ShoppingBag,
  Package,
  BookOpen,
  Check,
} from "lucide-react";
import { motion } from "motion/react";
import { EXPLORE_PATH, navigateToCreateListing, navigateToPath } from "./lib/appNavigation";

const quickPaths = [
  {
    title: "Browse listings faster",
    text: "Go straight to Explore and use campus, category, item type, and price filters with less friction.",
  },
  {
    title: "Find student-relevant items",
    text: "Focus on useful categories like gadgets, fashion, books, services, and everyday campus needs.",
  },
  {
    title: "Sell with more structure",
    text: "Post listings with clearer details, stronger photos, and cleaner seller identity than scattered group posts.",
  },
];

const featuredCategories = [
  {
    icon: Smartphone,
    title: "Phones & gadgets",
    text: "High-interest student tech, chargers, accessories, and practical electronics.",
  },
  {
    icon: ShoppingBag,
    title: "Fashion & shoes",
    text: "Useful campus fashion, shoes, bags, and everyday wear students actually search for.",
  },
  {
    icon: BookOpen,
    title: "Books & study tools",
    text: "Academic materials, calculators, stationery, and study-related items that matter on campus.",
  },
  {
    icon: Package,
    title: "Practical student items",
    text: "Hostel needs, room items, daily essentials, and useful campus-life products.",
  },
];

const trustHighlights = [
  "Campus-focused marketplace structure",
  "WhatsApp contact without heavy messaging clutter",
  "Better listing detail and seller visibility",
  "Built to feel cleaner than random campus groups",
];

const whyBuyMesho = [
  {
    title: "More structured than random group selling",
    points: [
      "Listings are easier to scan and compare",
      "Categories and filters reduce browsing confusion",
      "Seller identity and listing signals are clearer",
    ],
  },
  {
    title: "Made for campus trade, not generic noise",
    points: [
      "Campus relevance matters in discovery",
      "Student needs are easier to surface quickly",
      "The product is shaped around local campus buying and selling",
    ],
  },
];

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
              onClick={navigateToCreateListing}
              className="px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800"
            >
              Start Selling
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
                BuyMesho helps students discover relevant listings faster, contact sellers through WhatsApp,
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
                  onClick={navigateToCreateListing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
                >
                  Start Selling
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex flex-wrap gap-2"
              >
                {trustHighlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5 text-red-900" />
                    {item}
                  </span>
                ))}
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

        <section className="max-w-7xl mx-auto px-4 pb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              "Campus-based browsing",
              "Structured listings",
              "Direct WhatsApp contact",
              "Built for Malawi students",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-600 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
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
              {quickPaths.map((item) => (
                <div key={item.title} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <h3 className="text-base font-extrabold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Useful categories</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                Start from the things students actually look for.
              </h2>
            </div>

            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
            >
              Open Explore
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {featuredCategories.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => navigateToPath(EXPLORE_PATH)}
                  className="text-left rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm hover:bg-zinc-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-extrabold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{item.text}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Why BuyMesho</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                Better than trying to buy and sell through scattered groups alone.
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {whyBuyMesho.map((item) => (
                <div key={item.title} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                  <h3 className="text-lg font-extrabold text-zinc-900">{item.title}</h3>
                  <div className="mt-4 space-y-3">
                    {item.points.map((point) => (
                      <div key={point} className="flex items-start gap-3 text-sm text-zinc-600">
                        <span className="mt-0.5 h-6 w-6 rounded-full bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3.5 h-3.5 text-red-900" />
                        </span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pt-10 pb-16">
          <div className="rounded-[2rem] bg-zinc-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-zinc-400/20">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller call to action</p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
                  Ready to sell more seriously on campus?
                </h2>
                <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Move from random posts to a cleaner marketplace presence with better listing structure,
                  better visibility, and stronger buyer trust.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={navigateToCreateListing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
                >
                  Start Selling
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateToPath(EXPLORE_PATH)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10"
                >
                  Explore First
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
