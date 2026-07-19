import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  CreditCard,
  EyeOff,
  LogOut,
  MessageSquareText,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  User,
  Wallet,
} from "lucide-react";

import HeaderMenuItem from "./HeaderMenuItem";

const navButtonClass =
  "w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

type HeaderMobileDrawerProps = {
  open: boolean;
  isLoggedIn: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  unreadCount: number;
  primaryDrawerLabel: string;
  onClose: () => void;
  onPrimaryClick: () => void;
  onBecomeSellerClick: () => void;
  onMyListingsClick: () => void;
  onMessagesClick: () => void;
  onSavedClick: () => void;
  onHiddenClick: () => void;
  onPaymentsClick: () => void;
  onSellerPayoutsClick: () => void;
  onAdminClick: () => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
  onLogoutClick: () => void | Promise<void>;
  onSignInClick: () => void;
  onCreateAccountClick: () => void;
};

export default function HeaderMobileDrawer({
  open,
  isLoggedIn,
  isSeller,
  isAdmin,
  unreadCount,
  primaryDrawerLabel,
  onClose,
  onPrimaryClick,
  onBecomeSellerClick,
  onMyListingsClick,
  onMessagesClick,
  onSavedClick,
  onHiddenClick,
  onPaymentsClick,
  onSellerPayoutsClick,
  onAdminClick,
  onSettingsClick,
  onProfileClick,
  onLogoutClick,
  onSignInClick,
  onCreateAccountClick,
}: HeaderMobileDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

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
                <h2 id="drawer-title" className="mt-1 text-base font-black text-zinc-900">
                  Start here
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="w-9 h-9 rounded-2xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors"
              >
                <span className="text-zinc-600 text-lg leading-none">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-[1px]">
              {isLoggedIn ? (
                <>
                  <HeaderMenuItem
                    label="List Item"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                        {isSeller ? (
                          <Plus className="w-4 h-4 text-white" />
                        ) : (
                          <Store className="w-4 h-4 text-white" />
                        )}
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onPrimaryClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label={isSeller ? "My Listings" : "Become Seller"}
                    icon={
                      <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        {isSeller ? (
                          <Package className="w-4 h-4 text-white" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-white" />
                        )}
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      if (isSeller) {
                        onMyListingsClick();
                      } else {
                        onBecomeSellerClick();
                      }
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Messages"
                    extra={
                      unreadCount > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                          {unreadCount}
                        </span>
                      ) : null
                    }
                    icon={
                      <span className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquareText className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onMessagesClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Saved"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <Bookmark className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onSavedClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Hidden"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
                        <EyeOff className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onHiddenClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Payments"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onPaymentsClick();
                    }}
                    className={navButtonClass}
                  />

                  {isSeller ? (
                    <HeaderMenuItem
                      label="Seller Payouts"
                      icon={
                        <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                          <Wallet className="w-4 h-4 text-white" />
                        </span>
                      }
                      onClick={() => {
                        onClose();
                        onSellerPayoutsClick();
                      }}
                      className={navButtonClass}
                    />
                  ) : null}

                  {isAdmin ? (
                    <HeaderMenuItem
                      label="ADMIN"
                      icon={
                        <span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                          <ShieldCheck className="w-4 h-4 text-white" />
                        </span>
                      }
                      onClick={() => {
                        onClose();
                        onAdminClick();
                      }}
                      className={navButtonClass}
                    />
                  ) : null}

                  <HeaderMenuItem
                    label="Settings"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onSettingsClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Profile"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onProfileClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Log Out"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <LogOut className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      void onLogoutClick();
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  />
                </>
              ) : (
                <>
                  <HeaderMenuItem
                    label="List Item"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                        {isSeller ? (
                          <Plus className="w-4 h-4 text-white" />
                        ) : (
                          <Store className="w-4 h-4 text-white" />
                        )}
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onPrimaryClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Become Seller"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onBecomeSellerClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Log In"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onSignInClick();
                    }}
                    className={navButtonClass}
                  />

                  <HeaderMenuItem
                    label="Create Account"
                    icon={
                      <span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </span>
                    }
                    onClick={() => {
                      onClose();
                      onCreateAccountClick();
                    }}
                    className={navButtonClass}
                  />
                </>
              )}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
