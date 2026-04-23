import { type ElementType, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  House,
  Menu,
  Plus,
  Settings,
  ShoppingBag,
  Smartphone,
  Store,
  Sparkles,
  UserRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  BECOME_SELLER_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  PRIVACY_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  SETTINGS_PATH,
  PROFILE_PATH, 
  SIGNUP_PATH,
  TERMS_PATH,
  navigateToCreateListing,
  navigateToListingDetails,
  navigateToPath
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useHomePageData } from "./hooks/useHomePageData";
import CategorySection from "./components/home/CategorySection";
import BrandMark from "./components/BrandMark";
import FeedbackModal from "./components/FeedbackModal";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";

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
  beauty: "beauty",
} as const;

const featuredSections: FeaturedSection[] = [
  {
    key: HOME_CATEGORY_KEYS.phones,
    title: "Featured Gadgets",
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
    title: "Eatery & Fast Foods",
    description: "Quick meals, snacks, and drinks students check often.",
    icon: UtensilsCrossed,
    apiCategory: "Food & Snacks",
  },
  {
    key: HOME_CATEGORY_KEYS.beauty,
    title: "Beauty & Personal Care",
    description: "Skincare, hair care, fragrances, and personal care essentials.",
    icon: Sparkles,
    apiCategory: "Beauty & Personal Care",
  },
];

const trustPills = ["Campus-based", "Built for students"];

type ListingStripVariant = "featured" | "supporting";

function ListingStrip({
  title,
  description,
  listings,
  loading,
  maxItems = 8,
  variant = "featured",
}: {
  title: string;
  description: string;
  listings: SectionListing[];
  loading: boolean;
  maxItems?: number;
  variant?: ListingStripVariant;
}) {
  const isFeatured = variant === "featured";

  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">
            {title}
          </h2>
          {isFeatured ? <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{description}</p> : null}
        </div>

        {isFeatured ? (
          <button
            type="button"
            onClick={() => navigateToPath(EXPLORE_PATH)}
            className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50"
          >
            Browse all
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
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
              className="group snap-start shrink-0 w-[220px] sm:w-[260px] overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[4/3] bg-zinc-100 overflow-hidden">
                <img
                  src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>

              <div className="p-4">
                <p className="text-sm font-extrabold text-zinc-900 line-clamp-1">
                  {item.name}
                </p>
                <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                  {item.description || item.university || "Tap to open the full listing details."}
                </p>
                <p className="mt-2 text-sm font-bold text-red-900">
                  MWK {Number(item.price).toLocaleString()}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-900">
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
  const { firebaseUser, profile, profileLoading } = useAccountProfile();
  const isLoggedIn = !!firebaseUser;
  const isSeller = !!(isLoggedIn && profile?.is_seller);
  const isSellerProfileLoading = isLoggedIn && profileLoading;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
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
      setAuthGuardOpen(true);
      return;
    }

    if (profileLoading) return;

    if (!profile?.is_seller) {
      navigateToPath(BECOME_SELLER_PATH);
      return;
    }

    navigateToCreateListing();
  };

  const handleLogout = async (afterClose?: () => void) => {
    afterClose?.();
    try {
      await signOut(auth);
      navigateToPath(HOME_PATH);
    } catch {
      // Keep the UI usable even if sign-out fails briefly.
    }
  };

  const handleSettingsClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      afterClose?.();
      setAuthGuardOpen(true);
      return;
    }
    afterClose?.();
    navigateToPath(SETTINGS_PATH);
  };

  const closeMenu = () => setMobileMenuOpen(false);
  const navButtonClass =
    "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />

            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPath(HOME_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-900 bg-slate-900 text-sm font-bold text-white hover:bg-slate-800"
              >
                <House className="w-4 h-4" />
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
              >
                <ShoppingBag className="w-4 h-4" />
                Market
              </button>
              <button
                type="button"
                onClick={() => handleSettingsClick()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-900 bg-slate-900 text-sm font-bold text-white hover:bg-slate-800"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                type="button"
                onClick={() => navigateToPath(PROFILE_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <UserRound className="w-4 h-4" />
                Profile
              </button>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleStartSelling}
                disabled={isSellerProfileLoading}
                className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-slate-900 disabled:hover:shadow-none"
              >
                {isSeller ? <Plus className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {isSellerProfileLoading ? "Loading..." : isSeller ? "List Item" : "Sell"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="md:hidden inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
                aria-label="Go to Market"
              >
                <ShoppingBag className="w-4 h-4" />
                Market
              </button>

              <button
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="md:hidden w-11 h-11 rounded-2xl border border-slate-900 bg-slate-900 flex items-center justify-center hover:bg-slate-800 hover:border-slate-800 transition-all overflow-hidden active:scale-95"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-home-menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>

        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm"
              onClick={closeMenu}
              aria-hidden="true"
            />

            <motion.div
              key="drawer-panel"
              id="mobile-home-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="home-drawer-title"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="md:hidden fixed top-0 right-0 z-[61] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                    Menu
                  </p>
                  <h2 id="home-drawer-title" className="mt-1 text-base font-black text-zinc-900">
                    Start here
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeMenu}
                  aria-label="Close menu"
                  className="w-9 h-9 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleStartSelling();
                  }}
                  disabled={isSellerProfileLoading}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-left text-sm font-bold text-white hover:bg-zinc-800 transition-colors disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-zinc-900"
                >
                  <span className="inline-flex items-center gap-3">
                    {isSeller ? <Plus className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    {isSellerProfileLoading ? "Loading..." : isSeller ? "List Item" : "Sell"}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigateToPath(EXPLORE_PATH);
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl bg-red-900 px-4 py-3 text-left text-sm font-bold text-white hover:bg-red-800 transition-colors"
                >
                  <span className="inline-flex items-center gap-3">
                    <ShoppingBag className="w-4 h-4" />
                    Market
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigateToPath(HOME_PATH);
                  }}
                  className={navButtonClass}
                >
                  <span className="inline-flex items-center gap-3">
                    <House className="w-4 h-4 text-zinc-500" />
                    Home
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSettingsClick(closeMenu)}
                  className={navButtonClass}
                >
                  <span className="inline-flex items-center gap-3">
                    <Settings className="w-4 h-4 text-zinc-500" />
                    Settings
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {isLoggedIn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigateToPath(PROFILE_PATH);
                      }}
                      className={navButtonClass}
                    >
                      <span className="inline-flex items-center gap-3">
                        <UserRound className="w-4 h-4 text-zinc-500" />
                        Profile
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleLogout(closeMenu)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 text-red-600">
                        <LogOut className="w-4 h-4" />
                        Log Out
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigateToPath(SIGNUP_PATH);
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                    >
                      Sign Up
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigateToPath(LOGIN_PATH);
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                    >
                      Sign In
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <FeedbackModal
        open={authGuardOpen}
        type="error"
        title="Login required"
        message="You need to be logged in to access this page. Sign in or create an account to continue."
        onClose={() => setAuthGuardOpen(false)}
        actions={[
          {
            label: "Log in",
            onClick: () => {
              setAuthGuardOpen(false);
              navigateToPath(LOGIN_PATH);
            },
          },
          {
            label: "Cancel",
            onClick: () => setAuthGuardOpen(false),
            variant: "secondary",
          },
        ]}
      />

      <main>
        <section className="relative overflow-hidden pt-4 pb-6 sm:pt-8 sm:pb-14">
          <div className="absolute inset-0 -z-10 pointer-events-none">
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[28rem] h-[28rem] bg-red-900/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 right-0 w-56 h-56 bg-amber-200/25 blur-3xl rounded-full" />
          </div>

          <div className="max-w-5xl mx-auto px-4">
            <div className="max-w-3xl">
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
                className="mt-5 text-4xl sm:text-6xl font-black tracking-[-0.06em] leading-[0.92] text-zinc-950"
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
                  onClick={() => navigateToPath(EXPLORE_PATH)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 hover:bg-red-800"
                >
                  Browse Market
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-5 hidden sm:flex flex-wrap gap-2"
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
        
        <section className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div className="space-y-6">
              <section>
                <h2 className="mb-5 text-2xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl">
                  FEATURED CATEGORIES
                </h2>
                <div className="grid grid-cols-1 gap-4">
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
            </div>

            <div className="space-y-6">
              <section>
                <div className="grid grid-cols-1 gap-4">
                  <ListingStrip
                    title="Picked for you"
                    description="Campus-aware picks based on what is active and relevant now."
                    listings={recommendedListings}
                    loading={loading}
                    maxItems={8}
                    variant="featured"
                  />

                  <ListingStrip
                    title="Trending now"
                    description=""
                    listings={featuredListings}
                    loading={loading}
                    maxItems={6}
                    variant="supporting"
                  />

                  <ListingStrip
                    title="New"
                    description=""
                    listings={newestListings}
                    loading={loading}
                    maxItems={6}
                    variant="supporting"
                  />
                </div>
              </section>

              <section>
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
                    disabled={isSellerProfileLoading}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSellerProfileLoading ? "Loading..." : "Get Started"}
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

      <footer className="mt-20 border-t border-zinc-100 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-900 rounded-xl flex items-center justify-center text-white font-extrabold text-sm">
              B
            </div>
            <span className="text-sm font-bold text-zinc-900">
              <span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span> Malawi
            </span>
          </div>

          <div className="flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-widest">
            <button
              type="button"
              onClick={() => navigateToPath(PRIVACY_PATH)}
              className="hover:text-primary transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(TERMS_PATH)}
              className="hover:text-primary transition-colors"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(SAFETY_PATH)}
              className="hover:text-primary transition-colors"
            >
              Safety
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(REPORT_PATH)}
              className="hover:text-primary transition-colors"
            >
              Report
            </button>
          </div>

          <div className="text-xs font-bold text-zinc-300">
            © 2026 Crafted for Students
          </div>
        </div>
      </footer>
    </div>
  );
}
