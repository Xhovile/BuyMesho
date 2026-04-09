import { type ElementType, type FormEvent, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  Laptop2,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Smartphone,
  Store,
  UserRound,
} from "lucide-react";
import { motion } from "motion/react";
import {
  BECOME_SELLER_PATH,
  EXPLORE_PATH,
  LOGIN_PATH,
  SAVED_PATH,
  SIGNUP_PATH,
  navigateToCreateListing,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";

type GatewayCategory = {
  key: string;
  title: string;
  description: string;
  icon: ElementType;
};

type FeaturedSection = {
  title: string;
  description: string;
  icon: ElementType;
  items: string[];
};

const gatewayCategories: GatewayCategory[] = [
  {
    key: "phones",
    title: "Phones & gadgets",
    description: "Student-friendly tech, accessories, and practical electronics.",
    icon: Smartphone,
  },
  {
    key: "fashion",
    title: "Fashion & shoes",
    description: "Clothes, bags, shoes, and everyday campus style.",
    icon: ShoppingBag,
  },
  {
    key: "books",
    title: "Books & study tools",
    description: "Books, calculators, stationery, and academic essentials.",
    icon: BookOpen,
  },
  {
    key: "student-items",
    title: "Practical student items",
    description: "Hostel needs, room items, and useful daily essentials.",
    icon: Package,
  },
];

const featuredSections: FeaturedSection[] = [
  {
    title: "Featured Phones",
    description: "Popular devices and accessories students check first.",
    icon: Smartphone,
    items: ["iPhone deals", "Android bargains", "Chargers", "Earphones"],
  },
  {
    title: "Trending Fashion",
    description: "Style items moving quickly inside campus communities.",
    icon: ShoppingBag,
    items: ["Shoes", "Bags", "Tops", "Streetwear"],
  },
  {
    title: "Study Essentials",
    description: "Academic items useful for class, exams, and assignments.",
    icon: BookOpen,
    items: ["Calculators", "Stationery", "Textbooks", "Rulers"],
  },
  {
    title: "Campus Services",
    description: "Useful student services and small business offers.",
    icon: Store,
    items: ["Printing", "Tutoring", "Repairs", "Food"],
  },
];

const trustPills = [
  "Campus-based",
  "Structured listings",
  "Direct WhatsApp",
  "Built for students",
];

export default function HomePage() {
  const { firebaseUser, profile } = useAccountProfile();
  const isLoggedIn = !!firebaseUser;
  const [searchText, setSearchText] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("All campuses");

  const handleStartSelling = () => {
    if (!firebaseUser) {
      navigateToPath(LOGIN_PATH);
      return;
    }

    if (!profile?.is_seller) {
      navigateToPath(BECOME_SELLER_PATH);
      return;
    }

    navigateToCreateListing();
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToPath(EXPLORE_PATH);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigateToPath("/")}
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20 group-hover:scale-105 transition-transform flex-shrink-0">
              B
            </div>
            <div className="min-w-0 text-left">
              <p className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
                <span className="text-red-900">Buy</span>
                <span className="text-zinc-700">Mesho</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Campus marketplace
              </p>
            </div>
          </button>

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-900 text-white text-sm font-bold hover:bg-red-800"
            >
              <Compass className="w-4 h-4" />
              Explore
            </button>

            <button
              type="button"
              onClick={() => navigateToPath(SAVED_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <ShieldCheck className="w-4 h-4" />
              Saved
            </button>

            <button
              type="button"
              onClick={handleStartSelling}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800"
            >
              <Sparkles className="w-4 h-4" />
              Sell
            </button>

            {!isLoggedIn ? (
              <button
                type="button"
                onClick={() => navigateToPath(LOGIN_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Log In
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigateToPath("/profile")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                <UserRound className="w-4 h-4" />
                Profile
              </button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="w-11 h-11 rounded-2xl bg-red-900 text-white flex items-center justify-center"
              aria-label="Explore"
            >
              <Compass className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleStartSelling}
              className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center"
              aria-label="Sell"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-14 sm:py-20">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[26rem] h-[26rem] bg-red-900/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 right-0 w-56 h-56 bg-amber-200/25 blur-3xl rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-10 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-900/10 bg-white/85 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-900"
              >
                Student Marketplace • Malawi
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mt-6 text-4xl sm:text-6xl font-black tracking-[-0.06em] leading-[0.95]"
              >
                Buy and sell on campus,
                <span className="text-red-900"> faster and cleaner.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mt-5 max-w-2xl text-base text-zinc-600 font-medium leading-relaxed"
              >
                Discover student listings, filter by campus and category, and contact sellers directly
                through a cleaner marketplace experience.
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
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 hover:bg-red-800"
                >
                  Explore Listings
                  <ArrowRight className="w-4 h-4" />
                </button>

                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleStartSelling}
                    className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                  >
                    Start Selling
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToPath(SIGNUP_PATH)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-50"
                  >
                    Sign Up
                  </button>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-8 flex flex-wrap gap-2"
              >
                {trustPills.map((item) => (
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
                  text: "Find listings with clearer seller identity and campus relevance.",
                },
                {
                  icon: Search,
                  title: "Faster discovery",
                  text: "Browse by category, price, and other useful filters more easily.",
                },
                {
                  icon: MessageCircle,
                  title: "Simple contact",
                  text: "Reach sellers directly on WhatsApp without heavy in-app clutter.",
                },
                {
                  icon: Store,
                  title: "Built for students",
                  text: "Designed around real student buying and selling behavior.",
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
          <form
            onSubmit={handleSearchSubmit}
            className="rounded-[2rem] border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto] gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search items, services, books, phones..."
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-800 placeholder:text-zinc-400 outline-none focus:border-red-900 focus:ring-4 focus:ring-red-900/10"
                />
              </div>

              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-white text-sm font-medium text-zinc-800 outline-none focus:border-red-900 focus:ring-4 focus:ring-red-900/10"
              >
                <option>All campuses</option>
                <option>Bunda</option>
                <option>UNIMA</option>
                <option>MUBAS</option>
                <option>LUANAR</option>
                <option>Other</option>
              </select>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-red-800"
              >
                Search
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Browse by category
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                Open the category that fits the item.
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
            {gatewayCategories.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    navigateToPath(
                      `${EXPLORE_PATH}?category=${encodeURIComponent(item.key)}`,
                    )
                  }
                  className="text-left rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm hover:bg-zinc-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl bg-zinc-100 text-zinc-900 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-extrabold text-zinc-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{item.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-900">
                    View category
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {featuredSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                        Featured section
                      </p>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-900">
                        {section.title}
                      </h3>
                      <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-red-900/5 text-red-900 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {section.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigateToPath(EXPLORE_PATH)}
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
                  >
                    View more
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 py-10">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
            <div className="max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                Why BuyMesho
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
                More structure than random campus group selling.
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {trustPills.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 pt-10 pb-16">
          <div className="rounded-[2rem] bg-zinc-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-zinc-400/20">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
                  Seller call to action
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight">
                  Ready to sell more seriously on campus?
                </h2>
                <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-300 leading-relaxed">
                  Move from random posts to a cleaner marketplace presence with stronger listing structure,
                  clearer discovery, and better buyer trust.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 lg:justify-end">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={handleStartSelling}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
                  >
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToPath(SIGNUP_PATH)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100"
                  >
                    Sign Up
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

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
