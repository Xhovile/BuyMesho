import { signOut } from "firebase/auth";
import {
  type Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
  type SetStateAction,
} from "react";

import { auth } from "../firebase";
import {
  BECOME_SELLER_PATH,
  CREATE_PATH,
  LOGIN_PATH,
  MESSAGES_PATH,
  PAYMENTS_HUB_PATH,
  PROFILE_PATH,
  SAVED_PATH,
  SELLER_PAYOUTS_PATH,
  SETTINGS_PATH,
  HIDDEN_PATH,
  MY_LISTINGS_PATH,
  navigateToAdminModerationQueue,
  navigateToCreateListing,
  navigateToLoginWithReturnPath,
  navigateToMessages,
  navigateToPath,
} from "../lib/appNavigation";
import { fetchInbox } from "../lib/messages";
import { getAvatarUrl } from "../lib/avatar";
import {
  readHiddenListingIds,
  readHiddenSellerUids,
  subscribeToHiddenCollectionsChanges,
} from "../lib/hiddenCollections";
import { useAccountProfile } from "./useAccountProfile";
import { useHomePageData } from "./useHomePageData";
import { useIsAdmin } from "./useIsAdmin";
import { featuredSections } from "../home/home.constants";
import type { SectionListing } from "../home/home.types";

export type HomePageController = {
  isLoggedIn: boolean;
  isGuest: boolean;
  isSeller: boolean;
  isSellerProfileLoading: boolean;
  fallbackLetter: string;
  avatarUrl: string | null;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: Dispatch<SetStateAction<boolean>>;
  desktopMenuOpen: boolean;
  setDesktopMenuOpen: Dispatch<SetStateAction<boolean>>;
  desktopMenuRef: RefObject<HTMLDivElement>;
  unreadCount: number;
  isAdmin: boolean;
  authGuardOpen: boolean;
  authReturnPath: string | null;
  setAuthGuardOpen: Dispatch<SetStateAction<boolean>>;
  setAuthReturnPath: Dispatch<SetStateAction<string | null>>;
  closeMenu: () => void;
  handleStartSelling: () => void;
  handleLogout: (afterClose?: () => void) => Promise<void>;
  handleSettingsClick: (afterClose?: () => void) => void;
  handleProfileClick: (afterClose?: () => void) => void;
  handleSavedClick: (afterClose?: () => void) => void;
  handleHiddenClick: (afterClose?: () => void) => void;
  handleMyListingsClick: (afterClose?: () => void) => void;
  handleMessagesClick: (afterClose?: () => void) => void;
  handleBuyerPaymentsClick: (afterClose?: () => void) => void;
  handleSellerPayoutsClick: (afterClose?: () => void) => void;
  loading: boolean;
  error: string | null;
  filteredRecommendedListings: SectionListing[];
  filteredFeaturedListings: SectionListing[];
  filteredNewestListings: SectionListing[];
  filteredSectionListings: Record<string, SectionListing[]>;
};

export function useHomePageController(): HomePageController {
  const { firebaseUser, profile, profileLoading } = useAccountProfile();
  const isLoggedIn = !!firebaseUser;
  const isGuest = !firebaseUser;
  const isSeller = !!(isLoggedIn && profile?.is_seller);
  const isSellerProfileLoading = isLoggedIn && profileLoading;
  const fallbackLetter = (profile?.email || firebaseUser?.email || "?").charAt(0).toUpperCase();
  const avatarUrl = getAvatarUrl(profile, firebaseUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const [authGuardOpen, setAuthGuardOpen] = useState(false);
  const [authReturnPath, setAuthReturnPath] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const [hiddenSellerUids, setHiddenSellerUids] = useState<string[]>(() =>
    readHiddenSellerUids()
  );
  const [hiddenListingIds, setHiddenListingIds] = useState<number[]>(() =>
    readHiddenListingIds()
  );
  const { isAdmin } = useIsAdmin(firebaseUser);
  const {
    recommendedListings,
    newestListings,
    featuredListings,
    sectionListings,
    loading,
    error,
  } = useHomePageData(featuredSections);

  useEffect(() => {
    const syncHiddenCollections = () => {
      setHiddenSellerUids(readHiddenSellerUids());
      setHiddenListingIds(readHiddenListingIds());
    };

    return subscribeToHiddenCollectionsChanges(syncHiddenCollections);
  }, []);

  const hiddenSellerSet = useMemo(() => new Set(hiddenSellerUids), [hiddenSellerUids]);
  const hiddenListingSet = useMemo(() => new Set(hiddenListingIds), [hiddenListingIds]);

  const filterHiddenListings = useCallback(
    (items: SectionListing[]) =>
      items.filter((item) => {
        const id = Number(item.id);
        const hiddenByListingId = Number.isInteger(id) && hiddenListingSet.has(id);
        const hiddenBySeller = !!item.seller_uid && hiddenSellerSet.has(item.seller_uid);
        return !hiddenByListingId && !hiddenBySeller;
      }),
    [hiddenListingSet, hiddenSellerSet]
  );

  const filteredRecommendedListings = useMemo(
    () => filterHiddenListings(recommendedListings),
    [recommendedListings, filterHiddenListings]
  );
  const filteredFeaturedListings = useMemo(
    () => filterHiddenListings(featuredListings),
    [featuredListings, filterHiddenListings]
  );
  const filteredNewestListings = useMemo(
    () => filterHiddenListings(newestListings),
    [newestListings, filterHiddenListings]
  );
  const filteredSectionListings = useMemo(() => {
    const next: Record<string, SectionListing[]> = {};
    for (const [key, items] of Object.entries(sectionListings)) {
      next[key] = filterHiddenListings(items);
    }
    return next;
  }, [sectionListings, filterHiddenListings]);

  const openAuthGuard = useCallback((returnPath: string, afterClose?: () => void) => {
    afterClose?.();
    setAuthReturnPath(returnPath);
    setAuthGuardOpen(true);
  }, []);

  const handleStartSelling = useCallback(() => {
    if (!firebaseUser) {
      openAuthGuard(CREATE_PATH);
      return;
    }

    if (profileLoading) return;

    if (!profile?.is_seller) {
      navigateToPath(BECOME_SELLER_PATH);
      return;
    }

    navigateToCreateListing();
  }, [firebaseUser, openAuthGuard, profile?.is_seller, profileLoading]);

  const handleLogout = useCallback(
    async (afterClose?: () => void) => {
      afterClose?.();
      try {
        await signOut(auth);
        navigateToPath(LOGIN_PATH);
      } catch {
        // Keep the UI usable even if sign-out fails briefly.
      }
    },
    []
  );

  const handleSettingsClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(SETTINGS_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(SETTINGS_PATH);
    },
    [firebaseUser, openAuthGuard]
  );

  const handleProfileClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(PROFILE_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(PROFILE_PATH);
    },
    [firebaseUser, openAuthGuard]
  );

  const handleSavedClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(SAVED_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(SAVED_PATH);
    },
    [firebaseUser, openAuthGuard]
  );

  const handleHiddenClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(HIDDEN_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(HIDDEN_PATH);
    },
    [firebaseUser, openAuthGuard]
  );

  const handleMyListingsClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(BECOME_SELLER_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(isSeller ? MY_LISTINGS_PATH : BECOME_SELLER_PATH);
    },
    [firebaseUser, isSeller, openAuthGuard]
  );

  const handleMessagesClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(MESSAGES_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToMessages();
    },
    [firebaseUser, openAuthGuard]
  );

  const handleBuyerPaymentsClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(PAYMENTS_HUB_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(PAYMENTS_HUB_PATH);
    },
    [firebaseUser, openAuthGuard]
  );

  const handleSellerPayoutsClick = useCallback(
    (afterClose?: () => void) => {
      if (!firebaseUser) {
        openAuthGuard(SELLER_PAYOUTS_PATH, afterClose);
        return;
      }
      afterClose?.();
      navigateToPath(SELLER_PAYOUTS_PATH);
    },
    [firebaseUser, openAuthGuard]
  );

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
        if (mounted) {
          setUnreadCount(0);
        }
      }
    };

    void loadUnread();

    return () => {
      mounted = false;
    };
  }, [firebaseUser]);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    setDesktopMenuOpen(false);
  }, []);

  return {
    isLoggedIn,
    isGuest,
    isSeller,
    isSellerProfileLoading,
    fallbackLetter,
    avatarUrl,
    mobileMenuOpen,
    setMobileMenuOpen,
    desktopMenuOpen,
    setDesktopMenuOpen,
    desktopMenuRef,
    unreadCount,
    isAdmin,
    authGuardOpen,
    authReturnPath,
    setAuthGuardOpen,
    setAuthReturnPath,
    closeMenu,
    handleStartSelling,
    handleLogout,
    handleSettingsClick,
    handleProfileClick,
    handleSavedClick,
    handleHiddenClick,
    handleMyListingsClick,
    handleMessagesClick,
    handleBuyerPaymentsClick,
    handleSellerPayoutsClick,
    loading,
    error,
    filteredRecommendedListings,
    filteredFeaturedListings,
    filteredNewestListings,
    filteredSectionListings,
  };
}
