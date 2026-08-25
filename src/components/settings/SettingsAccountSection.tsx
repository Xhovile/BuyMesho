import React from "react";
import { ChevronDown, ChevronRight, LogOut, ShieldAlert, User, Wallet } from "lucide-react";
import type { UserProfile } from "../../types";

interface Props {
  expanded: boolean;
  onToggle: () => void;
  profile: UserProfile | null;
  firebaseUser: { email?: string | null } | null;
  isAdmin: boolean;
  verifiedAccountRequiredDisabled: boolean;
  onNavigate: (path: string) => void;
  onSellerPayouts: () => void;
  onLogout: () => void | Promise<void>;
  onDeleteAccount: () => void;
  paths: {
    editAccount: string;
    editProfile: string;
    becomeSeller: string;
    moderationQueue: string;
    adminSetup: string;
  };
}

export default function SettingsAccountSection({
  expanded,
  onToggle,
  profile,
  firebaseUser,
  verifiedAccountRequiredDisabled,
  onNavigate,
  onSellerPayouts,
  onLogout,
  onDeleteAccount,
  paths,
}: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors" aria-expanded={expanded}>
        <span className="inline-flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-zinc-700" /></span>
          <span className="min-w-0"><span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">Account</span></span>
        </span>
        <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">{expanded ? "Hide" : "Show"}<ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
      </button>
      {expanded ? (
        <div className="divide-y divide-zinc-100">
          <div className="px-5 py-4 bg-zinc-50/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">Email</p><p className="mt-1 text-sm font-semibold text-zinc-900">{profile?.email || firebaseUser?.email || "Not available"}</p></div>
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3"><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-zinc-400">University</p><p className="mt-1 text-sm font-semibold text-zinc-900">{profile?.university || "Not set"}</p></div>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate(paths.editAccount)} disabled={verifiedAccountRequiredDisabled} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"><span className="font-bold text-zinc-900">Edit Account</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
          {profile?.is_seller ? <>
            <button type="button" 
              onClick={() => onNavigate(paths.editProfile)} 
              disabled={verifiedAccountRequiredDisabled} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100">
              <span className="font-bold text-zinc-900">Edit Seller Profile</span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
            <button type="button" 
              onClick={onSellerPayouts} 
              disabled={verifiedAccountRequiredDisabled} 
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-emerald-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100">
              <span className="font-bold text-zinc-900 inline-flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-700" />Seller Workspace</span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </> : <button type="button" 
                  onClick={() => onNavigate(paths.becomeSeller)}
                  disabled={verifiedAccountRequiredDisabled} 
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100">
            <span className="font-bold text-zinc-900">Become Seller</span>
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
          }
          <button type="button" 
            onClick={() => void onLogout()} disabled={!firebaseUser} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"><span className="font-bold text-zinc-900 inline-flex items-center gap-2"><LogOut className="w-4 h-4" />Logout</span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
          <button type="button" 
            onClick={onDeleteAccount} disabled={!firebaseUser} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:bg-zinc-100"><span className="font-bold text-red-700 inline-flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Delete Account</span><ChevronRight className="w-4 h-4 text-red-300" /></button>
        </div>
      ) : null}
    </section>
  );
}
