import React from "react";
import {
  navigateToPath,
  ABOUT_PATH,
  PRIVACY_PATH,
  REPORT_PATH,
  SAFETY_PATH,
  TERMS_PATH,
} from "../lib/appNavigation";
import Logo from "../../photos/Logo.png";

const footerLinks = [
  { label: "About", path: ABOUT_PATH },
  { label: "Privacy", path: PRIVACY_PATH },
  { label: "Terms", path: TERMS_PATH },
  { label: "Safety", path: SAFETY_PATH },
  { label: "Report", path: REPORT_PATH },
] as const;

export default function AppFooter() {
  return (
    <footer className="mt-24 border-t border-zinc-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 pt-12 pb-24 sm:pt-14 sm:pb-28">
        <div className="flex flex-col gap-10">
          <button
            type="button"
            onClick={() => navigateToPath(ABOUT_PATH)}
            className="flex items-center gap-3 self-start text-left"
          >
            <span className="inline-flex h-10 w-10 flex-shrink-0 overflow-hidden bg-transparent">
              <img src={Logo} alt="BuyMesho logo" className="h-full w-full object-cover" />
            </span>
            <span className="text-sm font-bold text-zinc-900 sm:text-base">
              <span className="text-red-900">Buy</span>
              <span className="text-zinc-700">Mesho Mw</span>
            </span>
          </button>

          <div className="border-y border-zinc-100 py-4">
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold uppercase tracking-[0.22em] text-zinc-400 sm:gap-x-10">
              {footerLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigateToPath(link.path)}
                  className="transition-colors hover:text-primary"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-bold text-zinc-300">© 2026 Crafted for Students</div>
        </div>
      </div>
    </footer>
  );
}
