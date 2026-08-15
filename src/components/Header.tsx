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
  subtitle?: string;
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
  subtitle,
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

  const fallbackLetter = (userProfile?.email || firebaseUser?.email || "?").charAt(0).toUpperCase();
  const avatarUrl = getAvatarUrl(userProfile, firebaseUser);
  const isSeller = !!(firebaseUser && userProfile?.is_seller);
  const headerSubtitle = (subtitle || selectedChip).toLowerCase();

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
      // Force a real document reload so Firebase/WebAuthn/browser credential
      // manager state is fully reset before the next passkey attempt.
      window.location.replace(LOGIN_PATH);
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
