import { BECOME_SELLER_PATH, EXPLORE_PATH, LOGIN_PATH, SIGNUP_PATH, navigateToAdminModerationQueue, navigateToPath } from "../../lib/appNavigation";
import HeaderMobileDrawer from "../header/HeaderMobileDrawer";
import type { HomePageController } from "../../hooks/useHomePageController";

/** Home uses the shared mobile drawer while retaining its own page controller. */
export default function HomeMobileDrawer({ controller }: { controller: HomePageController }) {
  return (
    <HeaderMobileDrawer
      open={controller.mobileMenuOpen}
      isLoggedIn={!controller.isGuest}
      isSeller={controller.isSeller}
      isAdmin={controller.isAdmin}
      unreadCount={controller.unreadCount}
      primaryDrawerLabel="Market"
      onClose={controller.closeMenu}
      onPrimaryClick={() => {
        controller.closeMenu();
        controller.handleStartSelling();
      }}
      onBecomeSellerClick={() => {
        controller.closeMenu();
        navigateToPath(BECOME_SELLER_PATH);
      }}
      onMessagesClick={() => controller.handleMessagesClick(controller.closeMenu)}
      onSavedClick={() => controller.handleSavedClick(controller.closeMenu)}
      onHiddenClick={() => controller.handleHiddenClick(controller.closeMenu)}
      onPaymentsClick={() => controller.handleBuyerPaymentsClick(controller.closeMenu)}
      onSellerPayoutsClick={() => controller.handleSellerPayoutsClick(controller.closeMenu)}
      onAdminClick={() => {
        controller.closeMenu();
        navigateToAdminModerationQueue();
      }}
      onSettingsClick={() => controller.handleSettingsClick(controller.closeMenu)}
      onProfileClick={() => controller.handleProfileClick(controller.closeMenu)}
      onLogoutClick={() => controller.handleLogout(controller.closeMenu)}
      onSignInClick={() => {
        controller.closeMenu();
        navigateToPath(LOGIN_PATH);
      }}
      onCreateAccountClick={() => {
        controller.closeMenu();
        navigateToPath(SIGNUP_PATH);
      }}
    />
  );
}
