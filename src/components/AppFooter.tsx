import React from "react";
import {
  navigateToPath,
  PRIVACY_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  TERMS_PATH,
} from "../lib/appNavigation";

export default function AppFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-100 py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-red-900 rounded-xl flex items-center justify-center text-white font-extrabold text-sm">
            B
          </div>
          <span className="text-sm font-bold text-zinc-900">
            <span className="text-red-900">Buy</span>
            <span className="text-zinc-700">Mesho</span> Malawi
          </span>
        </div>

        <div className="flex items-center gap-8 text-xs font-bold text-zinc-400 uppercase tracking-widest">
          <button
            type="button"
            onClick={() => navigateToPath(PRIVACY_PATH)}
            className="hover:text-primary transition-colors"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => navigateToPath(TERMS_PATH)}
            className="hover:text-primary transition-colors"
          >
            Terms
          </button>
          <button
            type="button"
            onClick={() => navigateToPath(SAFETY_PATH)}
            className="hover:text-primary transition-colors"
          >
            Safety
          </button>
          <button
            type="button"
            onClick={() => navigateToPath(REPORT_PATH)}
            className="hover:text-primary transition-colors"
          >
            Report
          </button>
        </div>

        <div className="text-xs font-bold text-zinc-300">© 2026 Crafted for Students</div>
      </div>
    </footer>
  );
}
