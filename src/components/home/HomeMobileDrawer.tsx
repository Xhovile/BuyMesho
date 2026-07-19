import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  ChevronRight,
  CreditCard,
  EyeOff,
  LogOut,
  MessageSquareText,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  UserRound,
  Wallet,
  X,
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

const navButtonClass =
  "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

export default function HomeMobileDrawer({ controller }: { controller: HomePageController }) {
  return (
    <AnimatePresence>
      {controller.mobileMenuOpen ? (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm md:hidden"
            onClick={controller.closeMenu}
            aria-hidden="true"
          />

          <motion.div
            key="drawer-panel"
            id="mobile-home-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-drawer-title"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-[61] flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 pb-4 pt-5">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">
                  Menu
                </p>
                <h2 id="home-drawer-title" className="mt-1 text-base font-black text-zinc-900">
                  Start here
                </h2>
              </div>
              <button
                type="button"
                onClick={controller.closeMenu}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-zinc-200 transition-colors hover:bg-zinc-50"
              >
                <X className="h-4 w-4 text-zinc-600" />
              </button>
            </div>

            <div className="flex-1 space-y-[1px] overflow-y-auto px-4 py-4">
              {controller.isGuest ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      controller.closeMenu();
                      controller.handleStartSelling();
                    }}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                        {controller.isSeller ? (
                          <Plus className="h-4 w-4 text-white" />
                        ) : (
                          <Store className="h-4 w-4 text-white" />
                        )}
                      </span>
                      List Item
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      controller.closeMenu();
                      navigateToPath(BECOME_SELLER_PATH);
                    }}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                        <ShieldCheck className="h-4 w-4 text-white" />
                      </span>
                      Become Seller
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      controller.closeMenu();
                      navigateToPath(LOGIN_PATH);
                    }}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                        <UserRound className="h-4 w-4 text-white" />
                      </span>
                      Log In
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      controller.closeMenu();
                      navigateToPath(SIGNUP_PATH);
                    }}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                        <UserRound className="h-4 w-4 text-white" />
                      </span>
                      Create Account
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      controller.closeMenu();
                      controller.handleStartSelling();
                    }}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                        {controller.isSeller ? (
                          <Plus className="h-4 w-4 text-white" />
                        ) : (
                          <Store className="h-4 w-4 text-white" />
                        )}
                      </span>
                      List Item
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.handleMyListingsClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                        {controller.isSeller ? (
                          <Store className="h-4 w-4 text-white" />
                        ) : (
                          <ShieldCheck className="h-4 w-4 text-white" />
                        )}
                      </span>
                      {controller.isSeller ? "My Listings" : "Become a Seller"}
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.handleMessagesClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500">
                        <MessageSquareText className="h-4 w-4 text-white" />
                      </span>
                      <div className="flex items-center gap-2">
                        <span>Messages</span>
                        {controller.unreadCount > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                            {controller.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.handleSavedClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                        <Bookmark className="h-4 w-4 text-white" />
                      </span>
                      Saved
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.handleHiddenClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700">
                        <EyeOff className="h-4 w-4 text-white" />
                      </span>
                      Hidden
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.handleBuyerPaymentsClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500">
                        <CreditCard className="h-4 w-4 text-white" />
                      </span>
                      Payments
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  {controller.isSeller ? (
                    <button
                      type="button"
                      onClick={() => controller.handleSellerPayoutsClick(controller.closeMenu)}
                      className={navButtonClass}
                    >
                      <span className="inline-flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                          <Wallet className="h-4 w-4 text-white" />
                        </span>
                        Seller Payouts
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </button>
                  ) : null}

                  {controller.isAdmin ? (
                    <button
                      type="button"
                      onClick={() => {
                        controller.closeMenu();
                        navigateToAdminModerationQueue();
                      }}
                      className={navButtonClass}
                    >
                      <span className="inline-flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700">
                          <ShieldCheck className="h-4 w-4 text-white" />
                        </span>
                        ADMIN
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => controller.handleSettingsClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-500">
                        <Settings className="h-4 w-4 text-white" />
                      </span>
                      Settings
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => controller.handleProfileClick(controller.closeMenu)}
                    className={navButtonClass}
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500">
                        <UserRound className="h-4 w-4 text-white" />
                      </span>
                      Profile
                    </span>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>

                  {controller.isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => void controller.handleLogout(controller.closeMenu)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500">
                          <LogOut className="h-4 w-4 text-white" />
                        </span>
                        Log Out
                      </span>
                      <ChevronRight className="h-4 w-4 text-zinc-400" />
                    </button>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
