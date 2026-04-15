import { type ElementType, type FormEvent, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  House,
  Menu,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  UtensilsCrossed,
  UserRound,
  X,
} from "lucide-react";
import {
  BECOME_SELLER_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  PRIVACY_PATH,
  PROFILE_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  SETTINGS_PATH,
  SIGNUP_PATH,
  TERMS_PATH,
  navigateToCreateListing,
  navigateToExplore,
  navigateToListingDetails,
  navigateToPath,
} from "./lib/appNavigation";
import { useAccountProfile } from "./hooks/useAccountProfile";
import { useHomePageData } from "./hooks/useHomePageData";
import CategorySection from "./components/home/CategorySection";
import BrandMark from "./components/BrandMark";
import FeedbackModal from "./components/FeedbackModal";
import { UNIVERSITIES } from "./constants";

type FeaturedSection = { key: string; title: string; description: string; icon: ElementType; apiCategory: string };
type SectionListing = { id: number | string; name: string; price: number | string; description?: string | null; photos?: string[]; university?: string };

const HOME_CATEGORY_KEYS = { phones: "phones", fashion: "fashion", books: "books", food: "food", beauty: "beauty" } as const;
const featuredSections: FeaturedSection[] = [
  { key: HOME_CATEGORY_KEYS.phones, title: "Featured Gadgets", description: "Popular devices and accessories students check first.", icon: Smartphone, apiCategory: "Electronics & Gadgets" },
  { key: HOME_CATEGORY_KEYS.fashion, title: "Trending Fashion", description: "Style items moving quickly inside campus communities.", icon: ShoppingBag, apiCategory: "Fashion & Clothing" },
  { key: HOME_CATEGORY_KEYS.books, title: "Study Essentials", description: "Academic items useful for class, exams, and assignments.", icon: BookOpen, apiCategory: "Academic Services" },
  { key: HOME_CATEGORY_KEYS.food, title: "Eatery & Fast Foods", description: "Quick meals, snacks, and drinks students check often.", icon: UtensilsCrossed, apiCategory: "Food & Snacks" },
  { key: HOME_CATEGORY_KEYS.beauty, title: "Beauty & Personal Care", description: "Skincare, hair care, fragrances, and personal care essentials.", icon: Sparkles, apiCategory: "Beauty & Personal Care" },
];
const trustPills = ["Campus-based", "Built for students"];

function ListingStrip({ title, description, listings, loading, maxItems = 8, featured = true }: { title: string; description: string; listings: SectionListing[]; loading: boolean; maxItems?: number; featured?: boolean }) {
  return (
    <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-zinc-900">{title}</h2>
          {featured ? <p className="mt-2 text-sm text-zinc-500 leading-relaxed">{description}</p> : null}
        </div>
        {featured ? (
          <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-zinc-50">
            Browse all <ArrowRight className="w-4 h-4" />
          </button>
        ) : null}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {loading ? <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">Loading listings...</div> : listings.length === 0 ? <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 shadow-sm">No listings yet</div> : listings.slice(0, maxItems).map((item) => (
          <button key={item.id} type="button" onClick={() => navigateToListingDetails(item.id)} className="group snap-start shrink-0 w-[220px] sm:w-[260px] overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm hover:shadow-md transition-shadow">
            <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100"><img src={item.photos?.[0] || `https://picsum.photos/seed/${item.id}/600/450`} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /></div>
            <div className="p-4"><p className="text-sm font-extrabold text-zinc-900 line-clamp-1">{item.name}</p><p className="mt-1 text-sm text-zinc-500 line-clamp-2">{item.description || item.university || "Tap to open the full listing details."}</p><p className="mt-2 text-sm font-bold text-red-900">MWK {Number(item.price).toLocaleString()}</p><div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-900">Open listing <ArrowRight className="w-3.5 h-3.5" /></div></div>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { firebaseUser, profile } = useAccountProfile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("All campuses");
  const { recommendedListings, newestListings, featuredListings, sectionListings, loading, error } = useHomePageData(featuredSections);
  const isSeller = !!profile?.is_seller;
  const sellLabel = isSeller ? "List Item" : "Sell";
  const desktopBlue = "inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800";
  const desktopSellBlue = "hidden sm:flex items-center gap-2 rounded-2xl bg-slate-950 px-4 sm:px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-900 active:scale-95";
  const navButtonClass = "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

  const handleSellClick = () => {
    if (!firebaseUser) return setAuthGuardOpen(true);
    if (!isSeller) return navigateToPath(BECOME_SELLER_PATH);
    navigateToCreateListing();
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigateToExplore({ search: searchText.trim(), university: selectedCampus !== "All campuses" ? selectedCampus : "" });
  };

  const handleSettingsClick = (afterClose?: () => void) => {
    if (!firebaseUser) return afterClose?.() ?? setAuthGuardOpen(true);
    afterClose?.();
    navigateToPath(SETTINGS_PATH);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <div className="hidden md:flex items-center gap-2">
              <button type="button" onClick={() => navigateToPath(HOME_PATH)} className={desktopBlue}><House className="w-4 h-4" />Home</button>
              <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className={desktopBlue}><ShoppingBag className="w-4 h-4" />Market</button>
              <button type="button" onClick={() => handleSettingsClick()} className={desktopBlue}><Settings className="w-4 h-4" />Settings</button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSellClick} className={desktopSellBlue}><Plus className="w-4 h-4" /><span className="hidden sm:inline">{sellLabel}</span></button>
              <button type="button" onClick={() => setMobileMenuOpen((v) => !v)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} aria-controls="mobile-home-menu" className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-900 bg-slate-900 transition-all hover:bg-slate-800 active:scale-95">{mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}</button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 w-5 h-5 -translate-y-1/2 text-zinc-500 group-focus-within:text-red-900 transition-colors" />
            <input type="text" placeholder="Search listings, products, or services..." className="w-full rounded-2xl border border-zinc-300 bg-white py-3 pl-12 pr-4 text-sm text-zinc-800 shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-red-900 focus:shadow-md focus:ring-4 focus:ring-red-900/10" onChange={(e) => setSearchText(e.target.value)} />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="md:hidden fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <motion.div key="drawer-panel" id="mobile-home-menu" role="dialog" aria-modal="true" aria-labelledby="home-drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="md:hidden fixed top-0 right-0 z-[61] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-4 pt-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Menu</p><h2 id="home-drawer-title" className="mt-1 text-base font-black text-zinc-900">Start here</h2></div><button type="button" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 transition-colors hover:bg-zinc-50"><X className="w-4 h-4 text-zinc-600" /></button></div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <button type="button" onClick={() => { setMobileMenuOpen(false); handleSellClick(); }} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-slate-900"><span className="inline-flex items-center gap-3"><Plus className="w-4 h-4" />{sellLabel}</span><ChevronRight className="w-4 h-4" /></button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); navigateToPath(EXPLORE_PATH); }} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-slate-800"><span className="inline-flex items-center gap-3"><ShoppingBag className="w-4 h-4" />Market</span><ChevronRight className="w-4 h-4" /></button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); navigateToPath(HOME_PATH); }} className={navButtonClass}><span className="inline-flex items-center gap-3"><House className="w-4 h-4 text-zinc-500" />Home</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
                <button type="button" onClick={() => handleSettingsClick(() => setMobileMenuOpen(false))} className={navButtonClass}><span className="inline-flex items-center gap-3"><Settings className="w-4 h-4 text-zinc-500" />Settings</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
                {firebaseUser ? <button type="button" onClick={() => { setMobileMenuOpen(false); navigateToPath(PROFILE_PATH); }} className={navButtonClass}><span className="inline-flex items-center gap-3"><UserRound className="w-4 h-4 text-zinc-500" />Profile</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button> : <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { setMobileMenuOpen(false); navigateToPath(SIGNUP_PATH); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50">Sign Up</button><button type="button" onClick={() => { setMobileMenuOpen(false); setAuthGuardOpen(true); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50">Sell</button></div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FeedbackModal open={authGuardOpen} type="error" title="Login required" message="You need to be logged in to continue. Sign in or create an account first." onClose={() => setAuthGuardOpen(false)} actions={[{ label: "Log in", onClick: () => { setAuthGuardOpen(false); navigateToPath(LOGIN_PATH); } }, { label: "Cancel", onClick: () => setAuthGuardOpen(false), variant: "secondary" }]} />

      <main>
        <section className="relative overflow-hidden pb-8 pt-4 sm:pb-14 sm:pt-8">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-red-900/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-amber-200/25 blur-3xl" />
          </div>
          <div className="mx-auto max-w-5xl px-4">
            <div className="max-w-3xl">
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full border border-red-900/10 bg-white/85 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-red-900">Student Marketplace • Malawi</motion.div>
              <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mt-4 text-4xl font-black tracking-[-0.06em] leading-[0.92] text-zinc-950 sm:text-6xl">Buy and sell on campus</motion.h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">Browse products and services around universities and surrounding communities, not just student-only posts.</p>
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6"><button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="inline-flex items-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-red-900/20 hover:bg-red-800">Browse Market <ArrowRight className="w-4 h-4" /></button></motion.div>
              <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 hidden flex-wrap gap-2 sm:flex">{trustPills.map((item) => <span key={item} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-600 shadow-sm"><Check className="w-3.5 h-3.5 text-red-900" />{item}</span>)}</motion.div>
            </div>
          </div>
        </section>

        {error ? <section className="mx-auto max-w-7xl px-4 pb-2"><div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div></section> : null}

        <section className="mx-auto max-w-7xl px-4 pb-8">
          <form onSubmit={handleSearchSubmit} className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_auto]"><div className="relative"><Search className="absolute left-4 top-1/2 w-5 h-5 -translate-y-1/2 text-zinc-500" /><input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search listings, products, or services..." className="w-full rounded-2xl border border-zinc-300 bg-white py-3 pl-12 pr-4 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none transition-all focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:shadow-md" /></div><select value={selectedCampus} onChange={(e) => setSelectedCampus(e.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 outline-none focus:border-red-900 focus:ring-4 focus:ring-red-900/10"><option>All campuses</option>{UNIVERSITIES.map((university) => <option key={university} value={university}>{university}</option>)}</select><button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-900 px-6 py-3 text-sm font-extrabold text-white hover:bg-red-800">Search <ArrowRight className="w-4 h-4" /></button></div>
          </form>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              <section>
                <div className="mb-5 max-w-3xl"><h2 className="text-lg font-black uppercase tracking-[0.24em] text-zinc-900 sm:text-xl">Featured Categories</h2></div>
                <div className="grid grid-cols-1 gap-4">{featuredSections.map((section) => <CategorySection key={section.key} title={section.title} description={section.description} categoryKey={section.key} icon={section.icon} listings={sectionListings[section.key] || []} loading={loading} />)}</div>
              </section>
            </div>
            <div className="space-y-6">
              <ListingStrip title="Picked for you" description="Campus-aware picks based on what is active and relevant now." listings={recommendedListings} loading={loading} maxItems={8} featured />
              <ListingStrip title="Trending now" description="" listings={featuredListings} loading={loading} maxItems={6} featured={false} />
              <ListingStrip title="New" description="" listings={newestListings} loading={loading} maxItems={6} featured={false} />
              <section><div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"><div className="max-w-3xl"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Why BuyMesho</p><h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">More structure than random campus group selling.</h2></div><div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{trustPills.map((item) => <div key={item} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-zinc-600">{item}</div>)}</div></div></section>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pt-10 pb-16"><div className="rounded-[2rem] bg-zinc-900 p-6 text-white shadow-xl shadow-zinc-400/20 sm:p-8 lg:p-10"><div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">Seller call to action</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Ready to sell more seriously on campus?</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">Move from random posts to a cleaner marketplace presence with stronger listing structure, clearer discovery, and better buyer trust.</p></div><div className="flex flex-wrap gap-3 lg:justify-end">{isLoggedIn ? <button type="button" onClick={handleSellClick} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100">{sellLabel} <ArrowRight className="w-4 h-4" /></button> : <button type="button" onClick={() => navigateToPath(SIGNUP_PATH)} className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-zinc-900 hover:bg-zinc-100">Sign Up <ArrowRight className="w-4 h-4" /></button>}<button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-extrabold text-white hover:bg-white/10">Explore First</button></div></div></div></section>
      </main>

      <footer className="mt-20 border-t border-zinc-100 bg-white py-12"><div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:flex-row"><div className="flex items-center gap-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-900 text-sm font-extrabold text-white">B</div><span className="text-sm font-bold text-zinc-900"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span> Malawi</span></div><div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-400"><button type="button" onClick={() => navigateToPath(PRIVACY_PATH)} className="transition-colors hover:text-primary">Privacy</button><button type="button" onClick={() => navigateToPath(TERMS_PATH)} className="transition-colors hover:text-primary">Terms</button><button type="button" onClick={() => navigateToPath(SAFETY_PATH)} className="transition-colors hover:text-primary">Safety</button><button type="button" onClick={() => navigateToPath(REPORT_PATH)} className="transition-colors hover:text-primary">Report</button></div><div className="text-xs font-bold text-zinc-300">© 2026 Crafted for Students</div></div></footer>
    </div>
  );
}
