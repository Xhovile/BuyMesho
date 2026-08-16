import React from "react";
import { Facebook, Instagram, Twitter } from "lucide-react";
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
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-4">
        <button
          type="button"
          onClick={() => navigateToPath(ABOUT_PATH)}
          className="flex items-center gap-2.5 text-left"
        >
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

        <div className="flex items-center justify-center gap-4">
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all duration-300 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md"
            aria-label="Facebook"
          >
            <Facebook className="h-5.5 w-5.5 stroke-[1.75]" />
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all duration-300 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md"
            aria-label="Instagram"
          >
            <Instagram className="h-5.5 w-5.5 stroke-[1.75]" />
          </a>
          <a
            href="https://x.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm transition-all duration-300 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-md"
            aria-label="X (Twitter)"
          >
            <Twitter className="h-5.5 w-5.5 stroke-[1.75]" />
          </a>
        </div>

        <div className="h-px w-full max-w-[240px] bg-zinc-200" />

        <div className="text-xs font-bold text-zinc-300">© 2026 Crafted For You</div>
      </div>
    </footer>
  );
}
