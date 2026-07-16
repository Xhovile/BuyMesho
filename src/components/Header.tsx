import { Plus, Store, User, Menu, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
import type { HeaderChip } from "../constants";
import BrandMark from "./BrandMark";
import FeedbackModal from "./FeedbackModal";
import { auth } from "../firebase";
import { fetchInbox } from "../lib/messages";
import { useIsAdmin } from "../hooks/useIsAdmin";
import HeaderChips from "./header/HeaderChips";
import HeaderDesktopMenu from "./header/HeaderDesktopMenu";
import HeaderMobileDrawer from "./header/HeaderMobileDrawer";

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

  const pathname = typeof window === "undefined" ? HOME_PATH : window.location.pathname;
  const isMarketRoute = pathname === EXPLORE_PATH || pathname.startsWith(`${EXPLORE_PATH}/`);
  const primaryDrawerPath = isMarketRoute ? HOME_PATH : EXPLORE_PATH;
  const primaryDrawerLabel = isMarketRoute ? "Home" : "Market";

  useEffect(() => {
    const updateHeaderVisibility = () => {
      if (window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches) {
        setTopRowHidden(false);
        return;
      }
      setTopRowHidden((prev) => {
        if (prev) return window.scrollY >= 1;
        return window.scrollY > 20;
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

                    <HeaderDesktopMenu
                      menuRef={desktopMenuRef}
                      open={desktopMenuOpen}
                      isLoggedIn={!!firebaseUser}
                      isSeller={isSeller}
                      isAdmin={isAdmin}
                      unreadCount={unreadCount}
                      primaryDrawerLabel={primaryDrawerLabel}
                      onClose={closeMenu}
                      onPrimaryClick={() => navigateToPath(primaryDrawerPath)}
                      onBecomeSellerClick={() => navigateToPath(BECOME_SELLER_PATH)}
                      onMyListingsClick={() => navigateToPath(isSeller ? MY_LISTINGS_PATH : BECOME_SELLER_PATH)}
                      onMessagesClick={() => handleMessagesClick()}
                      onSavedClick={() => handleSavedClick()}
                      onHiddenClick={() => handleHiddenClick()}
                      onPaymentsClick={() => handlePaymentsClick()}
                      onSellerPayoutsClick={() => handleSellerPayoutsClick()}
                      onAdminClick={() => navigateToAdminModerationQueue()}
                      onSettingsClick={() => handleSettingsClick()}
                      onProfileClick={() => onProfileClick()}
                      onLogoutClick={() => handleLogout()}
                      onSignInClick={() => handleSignInClick()}
                      onCreateAccountClick={() => navigateToPath(SIGNUP_PATH)}
                    />
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
              <form
                onSubmit={(e: FormEvent<HTMLFormElement>) => {
                  e.preventDefault();
                  onSearch(searchValue.trim());
                }}
                className="w-full"
              >
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

          <HeaderChips selectedChip={selectedChip} onChipChange={onChipChange} />
        </div>
      </nav>

      <HeaderMobileDrawer
        open={mobileMenuOpen}
        isLoggedIn={!!firebaseUser}
        isSeller={isSeller}
        isAdmin={isAdmin}
        unreadCount={unreadCount}
        primaryDrawerLabel={primaryDrawerLabel}
        onClose={closeMenu}
        onPrimaryClick={() => navigateToPath(primaryDrawerPath)}
        onBecomeSellerClick={() => navigateToPath(BECOME_SELLER_PATH)}
        onMyListingsClick={() => navigateToPath(isSeller ? MY_LISTINGS_PATH : BECOME_SELLER_PATH)}
        onMessagesClick={() => handleMessagesClick()}
        onSavedClick={() => handleSavedClick()}
        onHiddenClick={() => handleHiddenClick()}
        onPaymentsClick={() => handlePaymentsClick()}
        onSellerPayoutsClick={() => handleSellerPayoutsClick()}
        onAdminClick={() => navigateToAdminModerationQueue()}
        onSettingsClick={() => handleSettingsClick()}
        onProfileClick={() => onProfileClick()}
        onLogoutClick={() => handleLogout()}
        onSignInClick={() => handleSignInClick()}
        onCreateAccountClick={() => navigateToPath(SIGNUP_PATH)}
      />

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
