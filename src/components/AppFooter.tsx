import React from "react";
import {
  navigateToPath,
  ABOUT_PATH,
  PRIVACY_PATH,
  SAFETY_PATH,
  TERMS_PATH,
} from "../lib/appNavigation";
import Logo from "../../photos/Logo.png";

export default function AppFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-100 bg-white py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-4 sm:flex-row">
        <button type="button" onClick={() => navigateToPath(ABOUT_PATH)} className="flex items-center gap-2.5 text-left">
          <span className="inline-flex h-10 w-10 flex-shrink-0 overflow-hidden bg-transparent">
            <img src={Logo} alt="BuyMesho logo" className="h-full w-full object-cover" />
          </span>
          <span className="text-sm font-bold text-zinc-900">
            <span className="text-red-900">Buy</span>
            <span className="text-zinc-700">Mesho Mw</span>
          </span>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <button type="button" onClick={() => navigateToPath(ABOUT_PATH)} className="transition-colors hover:text-primary">
            About
          </button>
          <button type="button" onClick={() => navigateToPath(PRIVACY_PATH)} className="transition-colors hover:text-primary">
            Privacy
          </button>
          <button type="button" onClick={() => navigateToPath(TERMS_PATH)} className="transition-colors hover:text-primary">
            Terms
          </button>
          <button type="button" onClick={() => navigateToPath(SAFETY_PATH)} className="transition-colors hover:text-primary">
            Safety
          </button>
        </div>

        <div className="text-xs font-bold text-zinc-300">© 2026 Crafted for Students</div>
      </div>
    </footer>
  );
}
