import { Search, Plus, User, Menu, X, House, Settings, ShoppingBag, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { User as FirebaseUser } from "firebase/auth";
import type { UserProfile } from "../types";
import { getAvatarUrl } from "../lib/avatar";
import {
  EXPLORE_PATH,
  HOME_PATH,
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

export default function Header({
  onSearch,
  onAddListing,
  onProfileClick,
  userProfile,
  firebaseUser,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const fallbackLetter = (userProfile?.email || firebaseUser?.email || "?")
    .charAt(0)
    .toUpperCase();
  const avatarUrl = getAvatarUrl(userProfile, firebaseUser);

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

  const handleProfileClick = () => {
    if (!firebaseUser) {
      setAuthGuardOpen(true);
      return;
    }
    onProfileClick();
  };
  const navButtonClass =
    "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />

          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <House className="w-4 h-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-900 text-white text-sm font-bold hover:bg-red-800"
            >
              <ShoppingBag className="w-4 h-4" />
              Market
            </button>
            <button
              type="button"
              onClick={() => handleSettingsClick()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>

            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPath(HOME_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                <House className="w-4 h-4" />
                Home
              </button>
            ) : null}

            <button
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="md:hidden w-11 h-11 rounded-2xl border border-slate-900 bg-slate-900 flex items-center justify-center hover:bg-slate-800 hover:border-slate-800 transition-all overflow-hidden active:scale-95"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-header-menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </button>

            <button
              onClick={handleProfileClick}
              className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-white hover:border-red-900/20 hover:shadow-md transition-all overflow-hidden active:scale-95 bg-white"
            >
              {firebaseUser ? (
                avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-red-900/5 flex items-center justify-center text-red-900 font-bold">
                    {fallbackLetter}
                  </div>
                )
              ) : (
                <User className="w-5 h-5 text-zinc-600" />
              )}
            </button>
          </div>
        </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {firebaseUser && userProfile?.is_seller ? (
                <button
                  onClick={onAddListing}
                  className="hidden sm:flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-zinc-200 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">List Item</span>
                </button>
              ) : null}

              <button
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="md:hidden w-11 h-11 rounded-2xl border border-slate-900 bg-slate-900 flex items-center justify-center hover:bg-slate-800 hover:border-slate-800 transition-all overflow-hidden active:scale-95"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-header-menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-white" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSettingsClick(closeMenu)}
                className={navButtonClass}
              >
                {firebaseUser ? (
                  avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-red-900/5 flex items-center justify-center text-red-900 font-bold">
                      {fallbackLetter}
                    </div>
                  )
                ) : (
                  <User className="w-5 h-5 text-zinc-600" />
                )}
              </button>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-900 transition-colors" />
            <input
              type="text"
              placeholder="Search listings, products, or services..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-300 rounded-2xl text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:shadow-md outline-none transition-all"
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
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

            {/* Drawer */}
            <motion.div
              key="drawer-panel"
              id="mobile-header-menu"
              role="dialog"
              aria-modal="true"
              aria-labelledby="drawer-title"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="md:hidden fixed top-0 right-0 z-[61] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                    Menu
                  </p>
                  <h2 id="drawer-title" className="mt-1 text-base font-black text-zinc-900">
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

              {/* Drawer body */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {firebaseUser && userProfile?.is_seller ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onAddListing();
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-left text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Plus className="w-4 h-4" />
                      List Item
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : null}

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
                  onClick={() => {
                    closeMenu();
                    navigateToPath(SETTINGS_PATH);
                  }}
                  className={navButtonClass}
                >
                  <span className="inline-flex items-center gap-3">
                    <Settings className="w-4 h-4 text-zinc-500" />
                    Settings
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>

                {firebaseUser ? (
                  <button
                    type="button"
                    onClick={() => {
                      closeMenu();
                      onProfileClick();
                    }}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <User className="w-4 h-4 text-zinc-500" />
                      Profile
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-red-900 transition-colors" />
          <input
            type="text"
            placeholder="Search listings, products, or services..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-300 rounded-2xl text-sm text-zinc-800 placeholder:text-zinc-400 shadow-sm focus:border-red-900 focus:ring-4 focus:ring-red-900/10 focus:shadow-md outline-none transition-all"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <FeedbackModal
        open={authGuardOpen}
        type="error"
        title="Login required"
        message="You need to be logged in to access this page. Sign in or create an account to continue."
        onClose={() => setAuthGuardOpen(false)}
      />
    </nav>
  );
}
