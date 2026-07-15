import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  ChevronRight,
  CreditCard,
  EyeOff,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
  Wallet,
} from "lucide-react";

import {
  BECOME_SELLER_PATH,
  EXPLORE_PATH,
  LOGIN_PATH,
  SIGNUP_PATH,
  navigateToAdminModerationQueue,
  navigateToPath,
} from "../../lib/appNavigation";
import type { HomePageController } from "../../hooks/useHomePageController";

const desktopMenuItemClass =
  "w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

function MenuRow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={desktopMenuItemClass} role="menuitem">
      <span className="inline-flex items-center gap-3">
        {icon}
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-zinc-400" />
    </button>
  );
}

export default function HomeDesktopMenu({ controller }: { controller: HomePageController }) {
  return (
    <AnimatePresence>
      {controller.desktopMenuOpen ? (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className="absolute right-0 top-full z-[70] mt-3 w-72 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl"
          role="menu"
          aria-label="Homepage header menu"
        >
          <div className="border-b border-zinc-100 px-4 pb-3 pt-4">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
              Menu
            </p>
            <h2 className="mt-1 text-base font-black text-zinc-900">Start here</h2>
          </div>

          <div className="space-y-1 p-2">
            {controller.isGuest ? (
              <>
                <MenuRow
                  label="Market"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600">
                      <ShoppingBag className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => {
                    controller.closeMenu();
                    navigateToPath(EXPLORE_PATH);
                  }}
                />
                <MenuRow
                  label="Become Seller"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                      <ShieldCheck className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => {
                    controller.closeMenu();
                    navigateToPath(BECOME_SELLER_PATH);
                  }}
                />
                <MenuRow
                  label="Log In"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                      <UserRound className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => {
                    controller.closeMenu();
                    navigateToPath(LOGIN_PATH);
                  }}
                />
                <MenuRow
                  label="Create Account"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                      <UserRound className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => {
                    controller.closeMenu();
                    navigateToPath(SIGNUP_PATH);
                  }}
                />
              </>
            ) : (
              <>
                <MenuRow
                  label="Market"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600">
                      <ShoppingBag className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => {
                    controller.closeMenu();
                    navigateToPath(EXPLORE_PATH);
                  }}
                />
                <MenuRow
                  label={controller.isSeller ? "My Listings" : "Become a Seller"}
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                      {controller.isSeller ? (
                        <Store className="h-4 w-4 text-white" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-white" />
                      )}
                    </span>
                  }
                  onClick={() => controller.handleMyListingsClick(controller.closeMenu)}
                />
                <MenuRow
                  label="Messages"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500">
                      <MessageSquareText className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => controller.handleMessagesClick(controller.closeMenu)}
                />
                <MenuRow
                  label="Saved"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                      <Bookmark className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => controller.handleSavedClick(controller.closeMenu)}
                />
                <MenuRow
                  label="Hidden"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                      <EyeOff className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => controller.handleHiddenClick(controller.closeMenu)}
                />
                <MenuRow
                  label="Payments"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500">
                      <CreditCard className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => controller.handleBuyerPaymentsClick(controller.closeMenu)}
                />

                {controller.isSeller ? (
                  <MenuRow
                    label="Seller Payouts"
                    icon={
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                        <Wallet className="h-4 w-4 text-white" />
                      </span>
                    }
                    onClick={() => controller.handleSellerPayoutsClick(controller.closeMenu)}
                  />
                ) : null}

                {controller.isAdmin ? (
                  <MenuRow
                    label="ADMIN"
                    icon={
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700">
                        <ShieldCheck className="h-4 w-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      controller.closeMenu();
                      navigateToAdminModerationQueue();
                    }}
                  />
                ) : null}

                <MenuRow
                  label="Settings"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-500">
                      <Settings className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => controller.handleSettingsClick(controller.closeMenu)}
                />
                <MenuRow
                  label="Profile"
                  icon={
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                      <UserRound className="h-4 w-4 text-white" />
                    </span>
                  }
                  onClick={() => controller.handleProfileClick(controller.closeMenu)}
                />

                {controller.isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => void controller.handleLogout(controller.closeMenu)}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 transition-colors hover:bg-red-50"
                    role="menuitem"
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500">
                        <LogOut className="h-4 w-4 text-white" />
                      </span>
                      Log Out
                    </span>
                    <ChevronRight className="h-4 w-4 text-red-300" />
                  </button>
                ) : null}
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
