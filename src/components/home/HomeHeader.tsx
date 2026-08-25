import { Menu, Plus, UserRound, X } from "lucide-react";
import { useEffect } from "react";

import BrandMark from "../BrandMark";
import type { HomePageController } from "../../hooks/useHomePageController";
import HeaderDesktopMenu from "../header/HeaderDesktopMenu";
import PasskeySetupPrompt from "../PasskeySetupPrompt";
import {
  BECOME_SELLER_PATH,
  EXPLORE_PATH,
  LOGIN_PATH,
  SIGNUP_PATH,
  navigateToAdminModerationQueue,
  navigateToPath,
} from "../../lib/appNavigation";

const cardButtonClass =
  "rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-md transition-all hover:border-zinc-300 hover:shadow-lg active:scale-95";
const desktopProfileButtonClass =
  `w-11 h-11 ${cardButtonClass} flex items-center justify-center overflow-hidden`;
const desktopMenuButtonClass =
  `w-11 h-11 ${cardButtonClass} flex items-center justify-center`;
const desktopActionButtonClass =
  `hidden items-center gap-2 ${cardButtonClass} px-4 py-2.5 text-sm font-bold sm:flex sm:px-5`;

export default function HomeHeader({ controller }: { controller: HomePageController }) {
  const {
    desktopMenuOpen,
    desktopMenuRef,
    setDesktopMenuOpen,
    isLoggedIn,
    isSeller,
    isAdmin,
    unreadCount,
    avatarUrl,
    fallbackLetter,
    isSellerProfileLoading,
  } = controller;

  const handleMessagesClick = () => controller.handleMessagesClick();
  const handleSavedClick = () => controller.handleSavedClick();
  const handleHiddenClick = () => controller.handleHiddenClick();
  const handlePaymentsClick = () => controller.handleBuyerPaymentsClick();
  const handleSellerPayoutsClick = () => controller.handleSellerPayoutsClick();
  const handleSettingsClick = () => controller.handleSettingsClick();
  const handleProfileClick = () => controller.handleProfileClick();
  const handleLogout = () => controller.handleLogout();

  useEffect(() => {
    if (!desktopMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && desktopMenuRef.current?.contains(target)) return;
      setDesktopMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDesktopMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [desktopMenuOpen, desktopMenuRef, setDesktopMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />

            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className={`${desktopActionButtonClass} !px-4 sm:!px-5`}
                aria-label="Go to Market"
              >
                Market
              </button>

              <button
                onClick={controller.handleStartSelling}
                disabled={isSellerProfileLoading}
                className={desktopActionButtonClass}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {isSellerProfileLoading
                    ? "Loading..."
                    : isSeller
                      ? "List Item"
                      : "Sell"}
                </span>
              </button>

              <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={handleProfileClick}
                  className={desktopProfileButtonClass}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : isLoggedIn ? (
                    <div className="flex h-full w-full items-center justify-center bg-red-900/5 font-bold text-red-900">
                      {fallbackLetter}
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-zinc-500">
                      <UserRound className="h-5 w-5" />
                    </div>
                  )}
                </button>

                <div ref={desktopMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setDesktopMenuOpen((value) => !value)}
                    className={desktopMenuButtonClass}
                    aria-label={desktopMenuOpen ? "Close menu" : "Open menu"}
                    aria-expanded={desktopMenuOpen}
                    aria-haspopup="menu"
                  >
                    {desktopMenuOpen ? (
                      <X className="h-5 w-5 text-zinc-700" />
                    ) : (
                      <Menu className="h-5 w-5 text-zinc-700" />
                    )}
                  </button>

                  <HeaderDesktopMenu
                    menuRef={desktopMenuRef}
                    open={desktopMenuOpen}
                    isLoggedIn={isLoggedIn}
                    isSeller={isSeller}
                    isAdmin={isAdmin}
                    unreadCount={unreadCount}
                    primaryDrawerLabel="Market"
                    onClose={controller.closeMenu}
                    onPrimaryClick={controller.handleStartSelling}
                    onBecomeSellerClick={() => navigateToPath(BECOME_SELLER_PATH)}
                    onMessagesClick={handleMessagesClick}
                    onSavedClick={handleSavedClick}
                    onHiddenClick={handleHiddenClick}
                    onPaymentsClick={handlePaymentsClick}
                    onSellerPayoutsClick={handleSellerPayoutsClick}
                    onAdminClick={() => navigateToAdminModerationQueue()}
                    onSettingsClick={handleSettingsClick}
                    onProfileClick={handleProfileClick}
                    onLogoutClick={handleLogout}
                    onSignInClick={() => navigateToPath(LOGIN_PATH)}
                    onCreateAccountClick={() => navigateToPath(SIGNUP_PATH)}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className={`inline-flex items-center ${cardButtonClass} px-3 py-2.5 text-sm font-bold md:hidden`}
                aria-label="Go to Market"
              >
                Market
              </button>

              <button
                onClick={() => controller.setMobileMenuOpen((value) => !value)}
                className={`flex h-11 w-11 items-center justify-center overflow-hidden ${cardButtonClass} md:hidden`}
                aria-label={controller.mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={controller.mobileMenuOpen}
                aria-controls="mobile-home-menu"
              >
                {controller.mobileMenuOpen ? (
                  <X className="h-5 w-5 text-zinc-700" />
                ) : (
                  <Menu className="h-5 w-5 text-zinc-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <PasskeySetupPrompt />
    </>
  );
}
