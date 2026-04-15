import { Search, Plus, User, Menu, X, House, Settings, ShoppingBag, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "../types";
import { getAvatarUrl } from "../lib/avatar";
import {
  BECOME_SELLER_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  SETTINGS_PATH,
  navigateToPath,
} from "../lib/appNavigation";
import BrandMark from "./BrandMark";
import FeedbackModal from "./FeedbackModal";

type HeaderProps = {
  onSearch: (val: string) => void;
  onAddListing: () => void;
  onProfileClick: () => void;
  userProfile?: UserProfile | null;
  firebaseUser: FirebaseUser | null;
};

export default function Header({ onSearch, onAddListing, onProfileClick, userProfile, firebaseUser }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const fallbackLetter = (userProfile?.email || firebaseUser?.email || "?").charAt(0).toUpperCase();
  const avatarUrl = getAvatarUrl(userProfile, firebaseUser);
  const isSeller = !!firebaseUser && !!userProfile?.is_seller;
  const sellLabel = isSeller ? "List Item" : "Sell";
  const closeMenu = () => setMobileMenuOpen(false);

  const handleSettingsClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      afterClose?.();
      setAuthGuardOpen(true);
      return;
    }
    afterClose?.();
    navigateToPath(SETTINGS_PATH);
  };

  const handleSellClick = () => {
    if (!firebaseUser) {
      setAuthGuardOpen(true);
      return;
    }
    if (isSeller) {
      onAddListing();
      return;
    }
    navigateToPath(BECOME_SELLER_PATH);
  };

  const navButtonClass = "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";
  const desktopNavClass = "inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800";
  const sellDesktopClass = "hidden sm:flex items-center gap-2 rounded-2xl bg-slate-950 px-4 sm:px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-900 active:scale-95";

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <div className="hidden items-center gap-2 md:flex">
              <button type="button" onClick={() => navigateToPath(HOME_PATH)} className={desktopNavClass}><House className="w-4 h-4" />Home</button>
              <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className={desktopNavClass}><ShoppingBag className="w-4 h-4" />Market</button>
              <button type="button" onClick={() => handleSettingsClick()} className={desktopNavClass}><Settings className="w-4 h-4" />Settings</button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSellClick} className={sellDesktopClass}><Plus className="w-4 h-4" /><span className="hidden sm:inline">{sellLabel}</span></button>
              <button type="button" onClick={() => setMobileMenuOpen((v) => !v)} aria-label={mobileMenuOpen ? "Close menu" : "Open menu"} aria-expanded={mobileMenuOpen} aria-controls="mobile-header-menu" className="md:hidden flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-900 bg-slate-900 transition-all hover:bg-slate-800 active:scale-95">{mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}</button>
              <button onClick={() => { if (!firebaseUser) { setAuthGuardOpen(true); return; } onProfileClick(); }} className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-all active:scale-95 hover:border-red-900/20 hover:shadow-md">
                {firebaseUser ? avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-red-900/5 font-bold text-red-900">{fallbackLetter}</div> : <User className="w-5 h-5 text-zinc-600" />}
              </button>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 w-5 h-5 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-red-900" />
            <input type="text" placeholder="Search listings, products, or services..." className="w-full rounded-2xl border border-zinc-300 bg-white py-3 pl-12 pr-4 text-sm text-zinc-800 shadow-sm outline-none transition-all placeholder:text-zinc-400 focus:border-red-900 focus:shadow-md focus:ring-4 focus:ring-red-900/10" onChange={(e) => onSearch(e.target.value)} />
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="md:hidden fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm" onClick={closeMenu} aria-hidden="true" />
            <motion.div key="drawer-panel" id="mobile-header-menu" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="md:hidden fixed top-0 right-0 z-[61] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-4 pt-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Menu</p><h2 id="drawer-title" className="mt-1 text-base font-black text-zinc-900">Start here</h2></div><button type="button" onClick={closeMenu} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 transition-colors hover:bg-zinc-50"><X className="w-4 h-4 text-zinc-600" /></button></div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                <button type="button" onClick={() => { closeMenu(); handleSellClick(); }} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-slate-900"><span className="inline-flex items-center gap-3"><Plus className="w-4 h-4" />{sellLabel}</span><ChevronRight className="w-4 h-4" /></button>
                <button type="button" onClick={() => { closeMenu(); navigateToPath(EXPLORE_PATH); }} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-slate-800"><span className="inline-flex items-center gap-3"><ShoppingBag className="w-4 h-4" />Market</span><ChevronRight className="w-4 h-4" /></button>
                <button type="button" onClick={() => { closeMenu(); navigateToPath(HOME_PATH); }} className={navButtonClass}><span className="inline-flex items-center gap-3"><House className="w-4 h-4 text-zinc-500" />Home</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
                <button type="button" onClick={() => handleSettingsClick(closeMenu)} className={navButtonClass}><span className="inline-flex items-center gap-3"><Settings className="w-4 h-4 text-zinc-500" />Settings</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
                {firebaseUser ? <button type="button" onClick={() => { closeMenu(); onProfileClick(); }} className={navButtonClass}><span className="inline-flex items-center gap-3"><User className="w-4 h-4 text-zinc-500" />Profile</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button> : <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => { closeMenu(); navigateToPath(LOGIN_PATH); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50">Sign In</button><button type="button" onClick={() => { closeMenu(); setAuthGuardOpen(true); }} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50">Sell</button></div>}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FeedbackModal open={authGuardOpen} type="error" title="Login required" message="You need to be logged in to access this page. Sign in or create an account to continue." onClose={() => setAuthGuardOpen(false)} actions={[{ label: "Log in", onClick: () => { setAuthGuardOpen(false); navigateToPath(LOGIN_PATH); } }, { label: "Cancel", onClick: () => setAuthGuardOpen(false), variant: "secondary" }]} />
    </>
  );
}
