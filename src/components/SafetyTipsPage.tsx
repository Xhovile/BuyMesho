import React from "react";
import { ShieldCheck, X } from "lucide-react";

type Props = {
  onBack: () => void;
  onClose: () => void;
  showBackButton?: boolean;
};

export default function SafetyTipsPage({
  onBack,
  onClose,
  showBackButton = true,
}: Props) {
  return (
    <div className="p-6 overflow-y-auto flex-1">
      <div className="flex items-center justify-between mb-6">
        {showBackButton ? (
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-sm font-bold"
          >
            ← Back to Settings
          </button>
        ) : (
          <div />
        )}

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-zinc-700" />
          <h2 className="text-2xl font-extrabold text-zinc-900">Safety Tips</h2>
        </div>

        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
          <ul className="space-y-4 text-sm text-zinc-700 leading-7 list-disc pl-5">
            <li>Meet in public and familiar campus locations when possible.</li>
            <li>Inspect items properly before making payment.</li>
            <li>Be cautious of prices that are unusually low or rushed deals.</li>
            <li>Do not share sensitive personal or financial information unnecessarily.</li>
            <li>Use WhatsApp carefully and confirm the identity of the seller or buyer.</li>
            <li>Report suspicious, misleading, or abusive listings through the platform.</li>
            <li>Where possible, transact during daytime and let someone know where you are going.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
