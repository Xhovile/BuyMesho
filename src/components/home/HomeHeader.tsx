import { Menu, Plus, ShoppingBag, Store, UserRound, X } from "lucide-react";

import BrandMark from "../BrandMark";
import type { HomePageController } from "../../hooks/useHomePageController";
import HomeDesktopMenu from "./HomeDesktopMenu";
import { EXPLORE_PATH, navigateToPath } from "../../lib/appNavigation";

const desktopProfileButtonClass =
  "w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-white hover:border-red-900/20 hover:shadow-md transition-all overflow-hidden active:scale-95";
const desktopMenuButtonClass =
  "w-11 h-11 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md transition-all active:scale-95";

export default function HomeHeader({ controller }: { controller: HomePageController }) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <BrandMark />

          <div className="ml-auto flex flex-shrink-0 items-center gap-2">
            <button
              onClick={controller.handleStartSelling}
              disabled={controller.isSellerProfileLoading}
              className="hidden items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-zinc-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-slate-900 disabled:hover:shadow-none sm:flex sm:px-5"
            >
              {controller.isSeller ? <Plus className="h-4 w-4" /> : <Store className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {controller.isSellerProfileLoading
                  ? "Loading..."
                  : controller.isSeller
                    ? "List Item"
                    : "Sell"}
              </span>
            </button>

            <div className="hidden flex-shrink-0 items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => controller.handleProfileClick()}
                className={desktopProfileButtonClass}
              >
                {controller.avatarUrl ? (
                  <img src={controller.avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : controller.isLoggedIn ? (
                  <div className="flex h-full w-full items-center justify-center bg-red-900/5 font-bold text-red-900">
                    {controller.fallbackLetter}
                  </div>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-50 text-zinc-500">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}
              </button>

              <div ref={controller.desktopMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => controller.setDesktopMenuOpen((value) => !value)}
                  className={desktopMenuButtonClass}
                  aria-label={controller.desktopMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={controller.desktopMenuOpen}
                  aria-haspopup="menu"
                >
                  {controller.desktopMenuOpen ? (
                    <X className="h-5 w-5 text-zinc-700" />
                  ) : (
                    <Menu className="h-5 w-5 text-zinc-700" />
                  )}
                </button>

                <HomeDesktopMenu controller={controller} />
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2.5 text-sm font-bold text-white hover:bg-slate-800 md:hidden"
              aria-label="Go to Market"
            >
              <ShoppingBag className="h-4 w-4" />
              Market
            </button>

            <button
              onClick={() => controller.setMobileMenuOpen((value) => !value)}
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-900 bg-slate-900 transition-all active:scale-95 hover:bg-slate-800 hover:border-slate-800 md:hidden"
              aria-label={controller.mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={controller.mobileMenuOpen}
              aria-controls="mobile-home-menu"
            >
              {controller.mobileMenuOpen ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
