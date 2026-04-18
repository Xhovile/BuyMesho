import { Plus, Store, User, Menu, X, House, Settings, ShoppingBag, ChevronRight } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
  searchValue: string;
  onSearch: (val: string) => void;
  onAddListing: () => void;
  onProfileClick: () => void;
  userProfile?: UserProfile | null;
  firebaseUser: FirebaseUser | null;
};

export default function Header({
  searchValue,
  onSearch,
  onAddListing,
  onProfileClick,
  userProfile,
  firebaseUser,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const [mobileNavHidden, setMobileNavHidden] = useState(false);

  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  const fallbackLetter = (userProfile?.email || firebaseUser?.email || "?")
    .charAt(0)
    .toUpperCase();
  const avatarUrl = getAvatarUrl(userProfile, firebaseUser);
  const isSeller = !!(firebaseUser && userProfile?.is_seller);

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

  const handleSellClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      afterClose?.();
      setAuthGuardOpen(true);
      return;
    }

    afterClose?.();
    if (userProfile?.is_seller) {
      onAddListing();
      return;
    }

    navigateToPath(BECOME_SELLER_PATH);
  };

  const navButtonClass =
    "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

  useEffect(() => {
    const updateHeaderVisibility = () => {
      const isMobile = window.innerWidth < 768;
      const currentY = window.scrollY;
      const lastY = lastScrollYRef.current;
      const delta = currentY - lastY;
      const scrollThreshold = 8;

      if (!isMobile) {
        setMobileNavHidden(false);
      } else if (mobileMenuOpen) {
        setMobileNavHidden(false);
      } else if (currentY < 24) {
        setMobileNavHidden(false);
      } else if (delta > scrollThreshold) {
        setMobileNavHidden(true);
      } else if (delta < -scrollThreshold) {
        setMobileNavHidden(false);
      }

      lastScrollYRef.current = currentY;
    };

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      window.requestAnimationFrame(() => {
        updateHeaderVisibility();
        tickingRef.current = false;
      });
    };

    lastScrollYRef.current = window.scrollY;
    updateHeaderVisibility();

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm px-4 py-3 transform-gpu will-change-transform transition-transform duration-300 ease-out ${
          mobileNavHidden && !mobileMenuOpen ? "-translate-y-full" : "translate-y-0"
        } md:translate-y-0`}
      >
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />

            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPath(HOME_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <House className="w-4 h-4" />
                Home
              </button>

              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white text-sm font-bold hover:bg-zinc-800 transition-colors"
              >
                <ShoppingBag className="w-4 h-4" />
                Market
              </button>

              <button
                type="button"
                onClick={() => handleSettingsClick()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-900 hover:bg-zinc-100 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleSellClick()}
                className="hidden sm:flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-zinc-200 active:scale-95"
              >
                {isSeller ? <Plus className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                <span className="hidden sm:inline">{isSeller ? "List Item" : "Sell"}</span>
              </button>

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
                onClick={() => {
                  if (!firebaseUser) {
                    setAuthGuardOpen(true);
                    return;
                  }
                  onProfileClick();
                }}
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

          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              onSearch(searchValue.trim());
            }}
            className="w-full"
          >
            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-sm">
              <input
                type="text"
                value={searchValue}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search listings, products, or services..."
                className="w-full bg-transparent pl-2 text-sm text-zinc-800 placeholder:text-zinc-400 outline-none"
              />
              <button
                type="submit"
                aria-label="Search listings"
                className="inline-flex items-center justify-center rounded-xl bg-red-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-red-800"
              >
                Search
              </button>
            </div>
          </form>
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
                <button
                  type="button"
                  onClick={() => handleSellClick(closeMenu)}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl bg-zinc-900 px-4 py-3 text-left text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
                >
                  <span className="inline-flex items-center gap-3">
                    {isSeller ? <Plus className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                    {isSeller ? "List Item" : "Sell"}
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
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigateToPath("/signup");
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 hover:bg-zinc-50"
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigateToPath("/login");
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
    </>
  );
}
