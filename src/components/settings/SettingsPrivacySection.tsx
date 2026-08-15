import React from "react";
import { ChevronDown, UserCheck } from "lucide-react";
import FormDropdown from "../FormDropdown";
import type { UserProfile, VisibilitySetting } from "../../types";

interface Props {
  expanded: boolean;
  onToggle: () => void;
  profile: UserProfile | null;
  profileLoading: boolean;
  firebaseUser: unknown;
  savingPrivacyField: "profile_visibility" | "seller_visibility" | "saved_visibility" | null;
  onUpdateVisibility: (field: "profile_visibility" | "seller_visibility" | "saved_visibility", value: VisibilitySetting) => void;
  visibilityLabel: Record<VisibilitySetting, string>;
  visibilityOptions: string[];
  labelToVisibility: Record<string, VisibilitySetting>;
}

export default function SettingsPrivacySection({ expanded, onToggle, profile, profileLoading, firebaseUser, savingPrivacyField, onUpdateVisibility, visibilityLabel, visibilityOptions, labelToVisibility }: Props) {
  return <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors" aria-expanded={expanded}>
      <span className="inline-flex items-center gap-3 min-w-0"><span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0"><UserCheck className="w-5 h-5 text-zinc-700" /></span><span className="min-w-0"><span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">Privacy</span></span></span>
      <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">{expanded ? "Hide" : "Show"}<ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
    </button>
    {expanded ? <div className="divide-y divide-zinc-100">
      <div className="px-5 py-4 bg-zinc-50/60"><FormDropdown label="Profile visibility" value={visibilityLabel[profile?.profile_visibility || "everyone"]} options={visibilityOptions} disabled={!firebaseUser || savingPrivacyField === "profile_visibility"} onChange={(value) => void onUpdateVisibility("profile_visibility", labelToVisibility[value] ?? "everyone")} /></div>
      <div className="px-5 py-4 bg-white"><FormDropdown label="Seller visibility" value={visibilityLabel[profile?.seller_visibility || "everyone"]} options={visibilityOptions} disabled={!firebaseUser || savingPrivacyField === "seller_visibility" || !profile?.is_seller} onChange={(value) => void onUpdateVisibility("seller_visibility", labelToVisibility[value] ?? "everyone")} />{!firebaseUser ? <p className="mt-2 text-xs text-zinc-500">Sign in to view seller status.</p> : profileLoading ? <p className="mt-2 text-xs text-zinc-500">Loading seller status...</p> : !profile?.is_seller ? <p className="mt-2 text-xs text-zinc-500">Available after becoming a seller.</p> : null}</div>
      <div className="px-5 py-4 bg-zinc-50/60"><FormDropdown label="Saved items visibility" value={visibilityLabel[profile?.saved_visibility || "only_me"]} options={visibilityOptions} disabled={!firebaseUser || savingPrivacyField === "saved_visibility"} onChange={(value) => void onUpdateVisibility("saved_visibility", labelToVisibility[value] ?? "only_me")} /></div>
      {!firebaseUser ? <div className="px-5 py-4 text-sm text-zinc-600 bg-white">Sign in to save privacy preferences.</div> : null}
    </div> : null}
  </section>;
}
