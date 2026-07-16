import { type RefObject } from "react";

import { AnimatePresence, motion } from "motion/react";
import {
  Bookmark,
  CreditCard,
  EyeOff,
  House,
  LogOut,
  MessageSquareText,
  Package,
  Settings,
  ShieldCheck,
  Store,
  User,
  Wallet,
} from "lucide-react";

import HeaderMenuItem from "./HeaderMenuItem";

const desktopMenuItemClass =
  "w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";

type HeaderDesktopMenuProps = {
  menuRef: RefObject<HTMLDivElement | null>;
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

export default function HeaderDesktopMenu({
  menuRef,
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
}: HeaderDesktopMenuProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={menuRef}
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
            {isLoggedIn ? (
              <>
                <HeaderMenuItem
                  label={primaryDrawerLabel}
                  icon={
                    <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      {primaryDrawerLabel === "Home" ? (
                        <House className="w-4 h-4 text-white" />
                      ) : (
                        <Store className="w-4 h-4 text-white" />
                      )}
                    </span>
                  }
                  onClick={() => {
                    onClose();
                    onPrimaryClick();
                  }}
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                    className={desktopMenuItemClass}
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
                    className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
                />

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    void onLogoutClick();
                  }}
                  className="w-full flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                  role="menuitem"
                >
                  <span className="inline-flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <LogOut className="w-4 h-4 text-white" />
                    </span>
                    Log Out
                  </span>
                  <span className="sr-only">Logout</span>
                </button>
              </>
            ) : (
              <>
                <HeaderMenuItem
                  label={primaryDrawerLabel}
                  icon={
                    <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      {primaryDrawerLabel === "Home" ? (
                        <House className="w-4 h-4 text-white" />
                      ) : (
                        <Store className="w-4 h-4 text-white" />
                      )}
                    </span>
                  }
                  onClick={() => {
                    onClose();
                    onPrimaryClick();
                  }}
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
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
                  className={desktopMenuItemClass}
                />
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
