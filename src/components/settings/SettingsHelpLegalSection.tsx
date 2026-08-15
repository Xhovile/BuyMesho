import React from "react";
import { ChevronDown, ChevronRight, FileText, HelpCircle, Settings, ShieldCheck } from "lucide-react";

type SettingsView = "privacy" | "terms" | "safety" | "report";

interface Props {
  expanded: boolean;
  onToggle: () => void;
  onOpenView: (view: SettingsView) => void;
}

export default function SettingsHelpLegalSection({ expanded, onToggle, onOpenView }: Props) {
  return <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
    <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-zinc-50 transition-colors" aria-expanded={expanded}>
      <span className="inline-flex items-center gap-3 min-w-0"><span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0"><Settings className="w-5 h-5 text-zinc-700" /></span><span className="min-w-0"><span className="block text-sm font-extrabold uppercase tracking-[0.14em] text-zinc-400">Help &amp; Legal</span></span></span>
      <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-zinc-500">{expanded ? "Hide" : "Show"}<ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} /></span>
    </button>
    {expanded ? <div className="divide-y divide-zinc-100">
      {[
        { key: "privacy" as const, label: "Privacy Policy", icon: FileText },
        { key: "terms" as const, label: "Terms of Use", icon: FileText },
        { key: "safety" as const, label: "Safety Tips", icon: ShieldCheck },
        { key: "report" as const, label: "Report a Problem", icon: HelpCircle },
      ].map((item) => {
        const Icon = item.icon;
        return <button key={item.key} type="button" onClick={() => onOpenView(item.key)} className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50 transition-colors"><span className="inline-flex items-center gap-3 min-w-0"><span className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-zinc-700" /></span><span className="font-bold text-zinc-900">{item.label}</span></span><ChevronRight className="w-4 h-4 text-zinc-400" /></button>;
      })}
    </div> : null}
  </section>;
}
