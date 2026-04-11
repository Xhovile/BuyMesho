import { type ElementType, type FormEvent, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  MapPin,
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
  navigateToExplore,
  navigateToExploreWithCategory,
  navigateToListingDetails,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useHomePageData } from "./hooks/useHomePageData";
import CategorySection from "./components/home/CategorySection";

type GatewayCategory = {
  key: string;
  title: string;
  description: string;
  icon: ElementType;
};

type FeaturedSection = {
  key: string;
  title: string;
  description: string;
  icon: ElementType;
  apiCategory: string;
};

type SectionListing = {
  id: number | string;
  name: string;
  price: number | string;
  description?: string | null;
  photos?: string[];
  category?: string;
  university?: string;
};

const HOME_CATEGORY_KEYS = {
  phones: "phones",
  fashion: "fashion",
  books: "books",
  food: "food",
} as const;

const gatewayCategories: GatewayCategory[] = [
  {
    key: HOME_CATEGORY_KEYS.phones,
    title: "Phones & gadgets",
    description: "Student-friendly tech, accessories, and practical electronics.",
    icon: Smartphone,
  },
  {
    key: HOME_CATEGORY_KEYS.fashion,
    title: "Fashion & shoes",
    description: "Clothes, bags, shoes, and everyday campus style.",
    icon: ShoppingBag,
  },
  {
    key: HOME_CATEGORY_KEYS.books,
    title: "Books & study tools",
    description: "Books, calculators, stationery, and academic essentials.",
    icon: BookOpen,
  },
  {
    key: HOME_CATEGORY_KEYS.food,
    title: "Campus Eats",
    description: "Quick food and snack listings students check often.",
    icon: Store,
  },
];

const featuredSections: FeaturedSection[] = [
  {
    key: HOME_CATEGORY_KEYS.phones,
    title: "Featured Phones",
    description: "Popular devices and accessories students check first.",
    icon: Smartphone,
    apiCategory: "Electronics & Gadgets",
  },
  {
    key: HOME_CATEGORY_KEYS.fashion,
    title: "Trending Fashion",
    description: "Style items moving quickly inside campus communities.",
    icon: ShoppingBag,
    apiCategory: "Fashion & Clothing",
  },
  {
    key: HOME_CATEGORY_KEYS.books,
    title: "Study Essentials",
    description: "Academic items useful for class, exams, and assignments.",
    icon: BookOpen,
    apiCategory: "Academic Services",
  },
  {
    key: HOME_CATEGORY_KEYS.food,
    title: "Campus Eats",
    description: "Quick food and snack listings students check often.",
    icon: Store,
    apiCategory: "Food & Snacks",
  },
];

const trustPills = ["Campus-based", "Built for students"];

type ListingStripVariant = "featured" | "compact";

function ListingStrip({
  title,
  description,
  listings,
  loading,
  variant = "featured",
  maxItems = 8,
}: {
  title: string;
  description: string;
  listings: SectionListing[];
  loading: boolean;
  variant?: ListingStripVariant;
  maxItems?: number;
}) {
  const isCompact = variant === "compact";
  const cardWidthClass = isCompact ? "w-[220px] sm:w-[260px]" : "w-[280px] sm:w-[320px]";
  const headingClass = isCompact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl";
  const listGapClass = isCompact ? "gap-3" : "gap-4";

  return (
    <section className={`rounded-[2rem] border border-zinc-200 bg-white shadow-sm ${isCompact ? "p-5 sm:p-6" : "p-6 sm:p-8"}`}>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
            Live preview
          </p>
          <h2 className={`mt-2 font-black tracking-tight text-zinc-900 ${headingClass}`}>
            {title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => navigateToPath(EXPLORE_PATH)}
          className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
        >
          Browse all
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className={`flex ${listGapClass} overflow-x-auto pb-2 snap-x snap-mandatory`}>
        {loading ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            Loading listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">
            No listings yet
          </div>
        ) : (
          listings.slice(0, maxItems).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateToListingDetails(item.id)}
              className={`group snap-start shrink-0 ${cardWidthClass} overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                <img
                  src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>

              <div className={isCompact ? "p-4" : "p-4 sm:p-5"}>
                <p className={`${isCompact ? "text-sm" : "text-base sm:text-[1.05rem]"} font-extrabold text-zinc-900 line-clamp-1`}>
                  {item.name}
                </p>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className={`${isCompact ? "text-sm" : "text-base"} font-bold text-red-900`}>
                    MWK {Number(item.price).toLocaleString()}
                  </p>

                  {item.university ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                      <MapPin className="w-3 h-3" />
                      {item.university}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-red-900">
                  Open listing <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { firebaseUser, profile } = useAccountProfile();
  const isLoggedIn = !!firebaseUser;
  const [searchText, setSearchText] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("All campuses");
  const {
    recommendedListings,
    newestListings,
    featuredListings,
    sectionListings,
    loading,
    error,
  } = useHomePageData(featuredSections);

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
    navigateToExplore({
      search: searchText.trim(),
      university:
        selectedCampus && selectedCampus !== "All campuses" ? selectedCampus : "",
    });
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
        <section className="relative overflow-hidden pt-6 pb-14 sm:pt-8 sm:pb-20">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[26rem] h-[26rem] bg-red-900/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 right-0 w-56 h-56 bg-amber-200/25 blur-3xl rounded-full" />
          </div>

          <div className="max-w-7xl mx-auto px-4">
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

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-6 flex flex-wrap items-center gap-3"
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
                className="mt-6 flex flex-wrap gap-2"
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
          </div>
        </section>

        {error ? (
          <section className="max-w-7xl mx-auto px-4 pb-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {error}
            </div>
          </section>
        ) : null}

        <section className="max-w-7xl mx-auto px-4 pb-8">
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

        <section className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="mb-5 max-w-3xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">
              Marketplace pulse
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
              Start with what matters now.
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Curated picks first, then the fastest-moving and newest listings.
            </p>
          </div>

          <ListingStrip
            title="Picked for you"
            description="Campus-aware picks based on what is active and relevant now."
            listings={recommendedListings}
            loading={loading}
            variant="featured"
            maxItems={8}
          />

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListingStrip
              title="Trending now"
              description="Listings getting the most attention right now."
              listings={featuredListings}
              loading={loading}
              variant="compact"
              maxItems={6}
            />

            <ListingStrip
              title="Newest listings"
              description="Fresh items that just landed on the marketplace."
              listings={newestListings}
              loading={loading}
              variant="compact"
              maxItems={6}
            />
          </div>
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
                  onClick={() => navigateToExploreWithCategory(item.key)}
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
              const listings = sectionListings[section.key] || [];
              return (
                <CategorySection
                  key={section.key}
                  title={section.title}
                  description={section.description}
                  categoryKey={section.key}
                  icon={section.icon}
                  listings={listings}
                  loading={loading}
                />
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
