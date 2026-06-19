import { Plus, Store, User, Menu, X, House, Settings, ChevronRight, LogOut, MessageSquareText, ShieldCheck, CreditCard, Wallet, Bookmark, EyeOff, Package } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { User as FirebaseUser } from "firebase/auth";
import { signOut } from "firebase/auth";
import type { UserProfile } from "../types";
import { getAvatarUrl } from "../lib/avatar";
import {
  navigateToAdminModerationQueue,
  BECOME_SELLER_PATH,
  CREATE_PATH,
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  SIGNUP_PATH,
  MESSAGES_PATH,
  PAYMENTS_HUB_PATH,
  SELLER_PAYOUTS_PATH,
  SETTINGS_PATH,
  PROFILE_PATH,
  SAVED_PATH,
  HIDDEN_PATH,
  MY_LISTINGS_PATH,
  navigateToLoginWithReturnPath,
  navigateToPath,
} from "../lib/appNavigation";
import { QUICK_CHIPS } from "../constants";
import type { HeaderChip } from "../constants";
import BrandMark from "./BrandMark";
import FeedbackModal from "./FeedbackModal";
import { auth } from "../firebase";
import { fetchInbox } from "../lib/messages";
import { useIsAdmin } from "../hooks/useIsAdmin";

type HeaderProps = {
  searchValue: string;
  onSearch: (val: string) => void;
  onAddListing: () => void;
  onProfileClick: () => void;
  userProfile?: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  activeChip?: HeaderChip;
  onChipChange?: (chip: HeaderChip) => void;
};

const DESKTOP_BREAKPOINT = 768;

export default function Header({
  searchValue,
  onSearch,
  onAddListing,
  onProfileClick,
  userProfile,
  firebaseUser,
  activeChip = "All",
  onChipChange,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const [authReturnPath, setAuthReturnPath] = useState<string | null>(null);
  const [topRowHidden, setTopRowHidden] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedChip, setSelectedChip] = useState<HeaderChip>(activeChip);
  const visibilityRafRef = useRef<number | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  const { isAdmin } = useIsAdmin(firebaseUser);

  const fallbackLetter = (userProfile?.email || firebaseUser?.email || "?")
    .charAt(0)
    .toUpperCase();
  const avatarUrl = getAvatarUrl(userProfile, firebaseUser);
  const isSeller = !!(firebaseUser && userProfile?.is_seller);

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
  };

  const openAuthGuard = (returnPath: string, afterClose?: () => void) => {
    afterClose?.();
    setAuthReturnPath(returnPath);
    setAuthGuardOpen(true);
  };

  const handleSettingsClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(SETTINGS_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(SETTINGS_PATH);
  };

  const handleMessagesClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(MESSAGES_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(MESSAGES_PATH);
  };

  const handleSellClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(CREATE_PATH, afterClose);
      return;
    }

    afterClose?.();
    if (userProfile?.is_seller) {
      onAddListing();
      return;
    }

    navigateToPath(BECOME_SELLER_PATH);
  };

  const handlePaymentsClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(PAYMENTS_HUB_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(PAYMENTS_HUB_PATH);
  };

  const handleSellerPayoutsClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(SELLER_PAYOUTS_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(SELLER_PAYOUTS_PATH);
  };

  const handleSavedClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(SAVED_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(SAVED_PATH);
  };

  const handleHiddenClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(HIDDEN_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(HIDDEN_PATH);
  };

  const handleMyListingsClick = (afterClose?: () => void) => {
    if (!firebaseUser) {
      openAuthGuard(BECOME_SELLER_PATH, afterClose);
      return;
    }
    afterClose?.();
    navigateToPath(isSeller ? MY_LISTINGS_PATH : BECOME_SELLER_PATH);
  };

  const handleSignInClick = (afterClose?: () => void) => {
    afterClose?.();
    navigateToLoginWithReturnPath(authReturnPath ?? undefined);
  };

  const handleLogout = async (afterClose?: () => void) => {
    afterClose?.();
    try {
      await signOut(auth);
      navigateToPath(LOGIN_PATH);
    } catch {
      // Keep UI usable even if sign-out fails briefly.
    }
  };

  const navButtonClass =
    "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

  const desktopNavButtonClass =
    "inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-zinc-50 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors";

  const desktopMenuItemClass =
    "w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

  const pathname = typeof window === "undefined" ? HOME_PATH : window.location.pathname;
  const isMarketRoute =
    pathname === EXPLORE_PATH ||
    pathname.startsWith(`${EXPLORE_PATH}/`);
  const primaryDrawerPath = isMarketRoute ? HOME_PATH : EXPLORE_PATH;
  const primaryDrawerLabel = isMarketRoute ? "Home" : "Market";

  useEffect(() => {
    const updateHeaderVisibility = () => {
      if (window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches) {
        setTopRowHidden(false);
        return;
      }
      setTopRowHidden((prev) => {
        if (prev) return window.scrollY >= 2;
        return window.scrollY > 30;
      });
    };

    const scheduleVisibilityUpdate = () => {
      if (visibilityRafRef.current !== null) return;
      visibilityRafRef.current = window.requestAnimationFrame(() => {
        visibilityRafRef.current = null;
        updateHeaderVisibility();
      });
    };

    updateHeaderVisibility();
    window.addEventListener("scroll", scheduleVisibilityUpdate, { passive: true });
    window.addEventListener("resize", scheduleVisibilityUpdate, { passive: true });
    return () => {
      window.removeEventListener("scroll", scheduleVisibilityUpdate);
      window.removeEventListener("resize", scheduleVisibilityUpdate);
      if (visibilityRafRef.current !== null) {
        window.cancelAnimationFrame(visibilityRafRef.current);
        visibilityRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setSelectedChip(activeChip);
  }, [activeChip]);

  useEffect(() => {
    if (!firebaseUser) {
      setUnreadCount(0);
      return;
    }

    let mounted = true;

    const loadUnread = async () => {
      try {
        const inbox = await fetchInbox();
        if (!mounted) return;

        const unread = inbox.filter((c: any) => Number(c.unread_count || 0) > 0).length;
        setUnreadCount(unread);
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };

    void loadUnread();

    return () => {
      mounted = false;
    };
  }, [firebaseUser]);

  useEffect(() => {
    if (!desktopMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && desktopMenuRef.current?.contains(target)) return;
      setDesktopMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopMenuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50">
        <div className="bg-zinc-100 border-b border-zinc-200 shadow-sm">
          <div className="mx-auto max-w-7xl overflow-visible">
            <div
              className={`overflow-hidden md:overflow-visible px-3 transition-[max-height,opacity,transform] duration-200 will-change-transform ${
                topRowHidden && !mobileMenuOpen ? "max-h-0 opacity-0 -translate-y-2" : "max-h-24 opacity-100 translate-y-0 pt-3"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <BrandMark />

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleSellClick()}
                    className="hidden sm:flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 sm:px-5 py-2.5 rounded-2xl text-sm font-bold transition-all hover:shadow-lg hover:shadow-zinc-200 active:scale-95"
                  >
                    {isSeller ? <Plus className="w-4 h-4 text-red-500" /> : <Store className="w-4 h-4 text-red-500" />}
                    <span className="hidden sm:inline">{isSeller ? "List Item" : "Sell"}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!firebaseUser) {
                        openAuthGuard(PROFILE_PATH);
                        return;
                      }
                      onProfileClick();
                    }}
                    className="w-11 h-11 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-white hover:border-red-900/20 hover:shadow-md transition-all overflow-hidden active:scale-95 bg-white"
                  >
                    {firebaseUser ? (
                      avatarUrl ? (
                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-red-900/5 flex items-center justify-center text-red-900 font-bold">
                          {fallbackLetter}
                        </div>
                      )
                    ) : (
                      <User className="w-5 h-5 text-zinc-600" />
                    )}
                  </button>

                  <div ref={desktopMenuRef} className="relative hidden md:block">
                    <button
                      type="button"
                      onClick={() => setDesktopMenuOpen((value) => !value)}
                      className="w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md transition-all active:scale-95"
                      aria-label={desktopMenuOpen ? "Close menu" : "Open menu"}
                      aria-expanded={desktopMenuOpen}
                      aria-haspopup="menu"
                    >
                      {desktopMenuOpen ? <X className="w-5 h-5 text-zinc-700" /> : <Menu className="w-5 h-5 text-zinc-700" />}
                    </button>

                    <AnimatePresence>
                      {desktopMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.98 }}
                          transition={{ duration: 0.16 }}
                          className="absolute right-0 top-full mt-3 w-72 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl z-[70]"
                          role="menu"
                          aria-label="Desktop header menu"
                        >
                          <div className="px-4 pt-4 pb-3 border-b border-zinc-100">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Menu</p>
                            <h2 className="mt-1 text-base font-black text-zinc-900">Start here</h2>
                          </div>

                          <div className="p-2 space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                navigateToPath(primaryDrawerPath);
                              }}
                              className={desktopMenuItemClass}
                              role="menuitem"
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                  {primaryDrawerLabel === "Home" ? <House className="w-4 h-4 text-white" /> : <Store className="w-4 h-4 text-white" />}
                                </span>
                                {primaryDrawerLabel}
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            {isSeller && (
                              <button
                                type="button"
                                onClick={() => {
                                  closeMenu();
                                  handleMyListingsClick();
                                }}
                                className={desktopMenuItemClass}
                                role="menuitem"
                              >
                                <span className="inline-flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                    {isSeller ? <Package className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                                  </span>
                                  {isSeller ? "My Listings" : "Become a Seller"}
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                handleMessagesClick();
                              }}
                              className={desktopMenuItemClass}
                              role="menuitem"
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                                  <MessageSquareText className="w-4 h-4 text-white" />
                                </span>
                                <span className="flex items-center gap-2">
                                  <span>Messages</span>
                                  {unreadCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{unreadCount}</span> : null}
                                </span>
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                handleSavedClick();
                              }}
                              className={desktopMenuItemClass}
                              role="menuitem"
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                  <Bookmark className="w-4 h-4 text-white" />
                                </span>
                                Saved
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                handleHiddenClick();
                              }}
                              className={desktopMenuItemClass}
                              role="menuitem"
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                                  <EyeOff className="w-4 h-4 text-white" />
                                </span>
                                Hidden
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                handlePaymentsClick();
                              }}
                              className={desktopMenuItemClass}
                              role="menuitem"
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                                  <CreditCard className="w-4 h-4 text-white" />
                                </span>
                                Payments
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            {isSeller ? (
                              <button
                                type="button"
                                onClick={() => {
                                  closeMenu();
                                  handleSellerPayoutsClick();
                                }}
                                className={desktopMenuItemClass}
                                role="menuitem"
                              >
                                <span className="inline-flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                    <Wallet className="w-4 h-4 text-white" />
                                  </span>
                                  Seller Payouts
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                              </button>
                            ) : null}

                            {isAdmin ? (
                              <button
                                type="button"
                                onClick={() => {
                                  closeMenu();
                                  navigateToAdminModerationQueue();
                                }}
                                className={desktopMenuItemClass}
                                role="menuitem"
                              >
                                <span className="inline-flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck className="w-4 h-4 text-white" />
                                  </span>
                                  ADMIN
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                closeMenu();
                                handleSettingsClick();
                              }}
                              className={desktopMenuItemClass}
                              role="menuitem"
                            >
                              <span className="inline-flex items-center gap-3">
                                <span className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center flex-shrink-0">
                                  <Settings className="w-4 h-4 text-white" />
                                </span>
                                Settings
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-400" />
                            </button>

                            {!isSeller && firebaseUser ? (
                              <button
                                type="button"
                                onClick={() => {
                                  closeMenu();
                                  handleMyListingsClick();
                                }}
                                className={desktopMenuItemClass}
                                role="menuitem"
                              >
                                <span className="inline-flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck className="w-4 h-4 text-white" />
                                  </span>
                                  Become a Seller
                                </span>
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                              </button>
                            ) : null}

                            {firebaseUser ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    closeMenu();
                                    onProfileClick();
                                  }}
                                  className={desktopMenuItemClass}
                                  role="menuitem"
                                >
                                  <span className="inline-flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                      <User className="w-4 h-4 text-white" />
                                    </span>
                                    Profile
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleLogout(closeMenu)}
                                  className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                  role="menuitem"
                                >
                                  <span className="inline-flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                                      <LogOut className="w-4 h-4 text-white" />
                                    </span>
                                    Logout
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-red-300" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    closeMenu();
                                    navigateToPath(primaryDrawerPath);
                                  }}
                                  className={desktopMenuItemClass}
                                  role="menuitem"
                                >
                                  <span className="inline-flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                      {primaryDrawerLabel === "Home" ? <House className="w-4 h-4 text-white" /> : <Store className="w-4 h-4 text-white" />}
                                    </span>
                                    {primaryDrawerLabel}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    closeMenu();
                                    navigateToPath(BECOME_SELLER_PATH);
                                  }}
                                  className={desktopMenuItemClass}
                                  role="menuitem"
                                >
                                  <span className="inline-flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                                      <ShieldCheck className="w-4 h-4 text-white" />
                                    </span>
                                    Become a Seller
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    closeMenu();
                                    handleSignInClick();
                                  }}
                                  className={desktopMenuItemClass}
                                  role="menuitem"
                                >
                                  <span className="inline-flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                      <User className="w-4 h-4 text-white" />
                                    </span>
                                    Sign In
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    closeMenu();
                                    navigateToPath(SIGNUP_PATH);
                                  }}
                                  className={desktopMenuItemClass}
                                  role="menuitem"
                                >
                                  <span className="inline-flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                      <User className="w-4 h-4 text-white" />
                                    </span>
                                    Sign Up
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                                </button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => setMobileMenuOpen((value) => !value)}
                    className="md:hidden w-11 h-11 rounded-2xl border border-slate-900 bg-slate-900 flex items-center justify-center hover:bg-slate-800 hover:border-slate-800 transition-all overflow-hidden active:scale-95"
                    aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-header-menu"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
                  </button>
                </div>
              </div>
            </div>

            <div className={`px-3 transition-[padding] duration-200 ${topRowHidden ? "pb-2 pt-2" : "pb-3 pt-2"}`}>
              <form onSubmit={(e: FormEvent<HTMLFormElement>) => {
                e.preventDefault();
                onSearch(searchValue.trim());
              }} className="w-full">
                <div className="mx-auto flex w-full max-w-3xl items-center gap-2 md:max-w-4xl">
                  <div className={`flex min-w-0 w-full items-center gap-2 rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all ${topRowHidden ? "px-3 py-1.5" : "px-3 py-2"}`}>
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => onSearch(e.target.value)}
                      placeholder="Search listings, products, or services..."
                      className="w-full min-w-0 bg-transparent pl-1 text-sm text-zinc-800 placeholder:text-zinc-500 outline-none"
                    />
                    <button type="submit" aria-label="Search listings" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-red-900 px-3 py-1.5 text-sm font-extrabold text-white hover:bg-red-800 sm:px-4">
                      Search
                    </button>
                  </div>

                  {topRowHidden ? (
                    <button
                      type="button"
                      onClick={() => setMobileMenuOpen((value) => !value)}
                      className="md:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-900 bg-slate-900 text-white hover:bg-slate-800 hover:border-slate-800 transition-all"
                      aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                      aria-expanded={mobileMenuOpen}
                      aria-controls="mobile-header-menu"
                    >
                      {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-zinc-100 border-t border-zinc-200">
            <div className="mx-auto max-w-7xl">
              <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max items-center gap-4 pb-0.5">
                  {QUICK_CHIPS.map((chip) => {
                    const isActive = chip === selectedChip;
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          setSelectedChip(chip);
                          onChipChange?.(chip);
                        }}
                        className={`inline-flex items-center whitespace-nowrap px-0 py-0.5 text-base font-bold font-sans leading-none transition-colors ${isActive ? "text-zinc-800" : "text-zinc-700 hover:text-zinc-800"}`}
                        aria-pressed={isActive}
                        aria-label={chip}
                      >
                        <span>{chip}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen && (
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
        )}
        {mobileMenuOpen && (
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
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Menu</p>
                <h2 id="drawer-title" className="mt-1 text-base font-black text-zinc-900">Start here</h2>
              </div>
              <button type="button" onClick={closeMenu} aria-label="Close menu" className="w-9 h-9 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors">
                <X className="w-4 h-4 text-zinc-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-[1px]">
              <button type="button" onClick={() => { closeMenu(); navigateToPath(primaryDrawerPath); }} className={navButtonClass}>
                <span className="inline-flex items-center gap-3">
                  {primaryDrawerLabel === "Home" ? (
                    <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <House className="w-4 h-4 text-white" />
                    </span>
                  ) : (
                <>
                  <button type="button" onClick={() => { closeMenu(); navigateToPath(primaryDrawerPath); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      {primaryDrawerLabel === "Home" ? (
                        <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <House className="w-4 h-4 text-white" />
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-white" />
                        </span>
                      )}
                      {primaryDrawerLabel}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button type="button" onClick={() => { closeMenu(); navigateToPath(BECOME_SELLER_PATH); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </span>
                      Become a Seller
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button type="button" onClick={() => { closeMenu(); handleSignInClick(); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                      Sign In
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button type="button" onClick={() => { closeMenu(); navigateToPath(SIGNUP_PATH); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                      Sign Up
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </>
                  {primaryDrawerLabel}
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {isSeller && (
                <button type="button" onClick={() => { closeMenu(); handleMyListingsClick(); }} className={navButtonClass}>
                  <span className="inline-flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      {isSeller ? <Package className="w-4 h-4 text-white" /> : <ShieldCheck className="w-4 h-4 text-white" />}
                    </span>
                    {isSeller ? "My Listings" : "Become a Seller"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              )}

              <button type="button" onClick={() => handleMessagesClick(closeMenu)} className={navButtonClass}>
                <span className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                    <MessageSquareText className="w-4 h-4 text-white" />
                  </span>
                  <div className="flex items-center gap-2">
                    <span>Messages</span>
                    {unreadCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{unreadCount}</span> : null}
                  </div>
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button type="button" onClick={() => handleSavedClick(closeMenu)} className={navButtonClass}>
                <span className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <Bookmark className="w-4 h-4 text-white" />
                  </span>
                  Saved
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button type="button" onClick={() => handleHiddenClick(closeMenu)} className={navButtonClass}>
                <span className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <EyeOff className="w-4 h-4 text-white" />
                  </span>
                  Hidden
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              <button type="button" onClick={() => handlePaymentsClick(closeMenu)} className={navButtonClass}>
                <span className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-white" />
                  </span>
                  Payments
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {isSeller ? (
                <button type="button" onClick={() => handleSellerPayoutsClick(closeMenu)} className={navButtonClass}>
                  <span className="inline-flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 text-white" />
                    </span>
                    Seller Payouts
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              ) : null}

              {isAdmin ? (
                <button type="button" onClick={() => { closeMenu(); navigateToAdminModerationQueue(); }} className={navButtonClass}>
                  <span className="inline-flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </span>
                    ADMIN
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              ) : null}

              <button type="button" onClick={() => handleSettingsClick(closeMenu)} className={navButtonClass}>
                <span className="inline-flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-4 h-4 text-white" />
                  </span>
                  Settings
                </span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>

              {!isSeller && firebaseUser ? (
                <button type="button" onClick={() => { closeMenu(); handleMyListingsClick(); }} className={navButtonClass}>
                  <span className="inline-flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </span>
                    Become a Seller
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400" />
                </button>
              ) : null}

              {firebaseUser ? (
                <>
                  <button type="button" onClick={() => { closeMenu(); onProfileClick(); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                      Profile
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLogout(closeMenu)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <LogOut className="w-4 h-4 text-white" />
                      </span>
                      Logout
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => { closeMenu(); navigateToPath(primaryDrawerPath); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      {primaryDrawerLabel === "Home" ? (
                        <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <House className="w-4 h-4 text-white" />
                        </span>
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-white" />
                        </span>
                      )}
                      {primaryDrawerLabel}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button type="button" onClick={() => { closeMenu(); navigateToPath(BECOME_SELLER_PATH); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </span>
                      Become a Seller
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button type="button" onClick={() => { closeMenu(); handleSignInClick(); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                      Sign In
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>

                  <button type="button" onClick={() => { closeMenu(); navigateToPath(SIGNUP_PATH); }} className={navButtonClass}>
                    <span className="inline-flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                      Sign Up
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  </button>
                </>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackModal
        open={authGuardOpen}
        type="error"
        title="Login required"
        message="You need to be logged in to access this page. Sign in or create an account to continue."
        onClose={() => {
          setAuthGuardOpen(false);
          setAuthReturnPath(null);
        }}
        actions={[
          {
            label: "Log in",
            onClick: () => {
              setAuthGuardOpen(false);
              navigateToLoginWithReturnPath(authReturnPath ?? undefined);
              setAuthReturnPath(null);
            },
          },
          {
            label: "Cancel",
            onClick: () => {
              setAuthGuardOpen(false);
              setAuthReturnPath(null);
            },
            variant: "secondary",
          },
        ]}
      />
    </>
  );
 }
