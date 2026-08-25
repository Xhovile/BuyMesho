import { AnimatePresence, motion } from "motion/react";
import { Bookmark, CreditCard, EyeOff, LogOut, MessageSquareText, Plus, Settings, ShieldCheck, Store, User } from "lucide-react";
import HeaderMenuItem from "./HeaderMenuItem";
import { EXPLORE_PATH, HOME_PATH, navigateToPath } from "../../lib/appNavigation";

const navButtonClass = "w-full flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm font-bold text-zinc-800 hover:bg-zinc-50 transition-colors";
const navSeparatorClass = "mx-4 border-t border-zinc-200";
const primaryButtonClass = "w-full rounded-xl bg-white px-4 py-3 text-center text-base font-black uppercase tracking-wide text-zinc-900 hover:bg-zinc-50 transition-colors";
const primaryWrapperClass = "rounded-2xl border border-zinc-100 bg-white p-1 shadow-sm mb-2";

type HeaderMobileDrawerProps = {
  open: boolean; isLoggedIn: boolean; isSeller: boolean; isAdmin: boolean; unreadCount: number; primaryDrawerLabel: string;
  onClose: () => void; onPrimaryClick: () => void; onBecomeSellerClick: () => void; onMyListingsClick?: () => void;
  onMessagesClick: () => void; onSavedClick: () => void; onHiddenClick: () => void; onPaymentsClick: () => void;
  onSellerPayoutsClick: () => void; onAdminClick: () => void; onSettingsClick: () => void; onProfileClick: () => void;
  onLogoutClick: () => void | Promise<void>; onSignInClick: () => void; onCreateAccountClick: () => void;
};

export default function HeaderMobileDrawer({ open, isLoggedIn, isSeller, isAdmin, unreadCount, primaryDrawerLabel, onClose, onPrimaryClick, onBecomeSellerClick, onMyListingsClick: _onMyListingsClick, onMessagesClick, onSavedClick, onHiddenClick, onPaymentsClick, onSellerPayoutsClick, onAdminClick, onSettingsClick, onProfileClick, onLogoutClick, onSignInClick, onCreateAccountClick }: HeaderMobileDrawerProps) {
  void _onMyListingsClick;
  const primaryPath = primaryDrawerLabel === "Home" ? HOME_PATH : EXPLORE_PATH;
  const handlePrimaryNavigation = () => { onClose(); navigateToPath(primaryPath); };
  const handleSellAction = () => { onClose(); onPrimaryClick(); };
  return <AnimatePresence>{open ? <>
    <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="md:hidden fixed inset-0 z-[60] bg-zinc-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
    <motion.div key="drawer-panel" id="mobile-header-menu" role="dialog" aria-modal="true" aria-labelledby="drawer-title" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 32 }} className="md:hidden fixed top-0 right-0 z-[61] h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-100"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">Menu</p><h2 id="drawer-title" className="mt-1 text-base font-black text-zinc-900">Start here</h2></div><div className="rounded-2xl border border-zinc-100 bg-white p-1 shadow-sm"><button type="button" onClick={onClose} aria-label="Close menu" className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-zinc-50 transition-colors"><span className="text-zinc-600 text-lg leading-none">×</span></button></div></div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className={primaryWrapperClass}><HeaderMenuItem label={primaryDrawerLabel} icon={null} onClick={handlePrimaryNavigation} className={primaryButtonClass} /></div>
        <HeaderMenuItem label={isSeller ? "List Item" : "Sell"} icon={<span className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0"><Plus className="w-4 h-4 text-white" /></span>} onClick={handleSellAction} className={navButtonClass} />
        {isLoggedIn ? <>
          <HeaderMenuItem label="Messages" extra={unreadCount > 0 ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{unreadCount}</span> : null} icon={<span className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0"><MessageSquareText className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onMessagesClick(); }} className={navButtonClass} />
          <HeaderMenuItem label="Saved" icon={<span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0"><Bookmark className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onSavedClick(); }} className={navButtonClass} />
          <HeaderMenuItem label="Hidden" icon={<span className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0"><EyeOff className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onHiddenClick(); }} className={navButtonClass} />
          <HeaderMenuItem label="Payments" icon={<span className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0"><CreditCard className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onPaymentsClick(); }} className={navButtonClass} />
          {isSeller ? <HeaderMenuItem label="Seller Console" icon={<span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0"><Store className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onSellerPayoutsClick(); }} className={navButtonClass} /> : null}
          {isSeller && isAdmin ? <div className={navSeparatorClass} aria-hidden="true" /> : null}{isAdmin ? <HeaderMenuItem label="ADMIN" icon={<span className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onAdminClick(); }} className={navButtonClass} /> : null}
          {!isSeller && !isAdmin ? <div className={navSeparatorClass} aria-hidden="true" /> : null}{isSeller && !isAdmin ? <div className={navSeparatorClass} aria-hidden="true" /> : null}
          <HeaderMenuItem label="Settings" icon={<span className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center flex-shrink-0"><Settings className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onSettingsClick(); }} className={navButtonClass} />
          <HeaderMenuItem label="Profile" icon={<span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onProfileClick(); }} className={navButtonClass} /><div className={navSeparatorClass} aria-hidden="true" />
          <HeaderMenuItem label="Log Out" icon={<span className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0"><LogOut className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); void onLogoutClick(); }} className="w-full flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 transition-colors" />
        </> : <><HeaderMenuItem label="Become Seller" icon={<span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onBecomeSellerClick(); }} className={navButtonClass} /><div className={navSeparatorClass} aria-hidden="true" /><HeaderMenuItem label="Log In" icon={<span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onSignInClick(); }} className={navButtonClass} /><HeaderMenuItem label="Create Account" icon={<span className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-white" /></span>} onClick={() => { onClose(); onCreateAccountClick(); }} className={navButtonClass} /></>}
      </div>
    </motion.div>
  </> : null}</AnimatePresence>;
}
