import { Menu, Plus, ShoppingBag, UserRound, X } from "lucide-react";

import BrandMark from "../BrandMark";
import type { HomePageController } from "../../hooks/useHomePageController";
import HomeDesktopMenu from "./HomeDesktopMenu";
import PasskeySetupPrompt from "../PasskeySetupPrompt";
import { EXPLORE_PATH, navigateToPath } from "../../lib/appNavigation";

const cardButtonClass =
  "rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-md transition-all hover:border-zinc-300 hover:shadow-lg active:scale-95";
const desktopProfileButtonClass =
  `w-11 h-11 ${cardButtonClass} flex items-center justify-center overflow-hidden`;
const desktopMenuButtonClass =
  `w-11 h-11 ${cardButtonClass} flex items-center justify-center`;
const desktopActionButtonClass =
  `hidden items-center gap-2 ${cardButtonClass} px-4 py-2.5 text-sm font-bold sm:flex sm:px-5`;

export default function HomeHeader({ controller }: { controller: HomePageController }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />

            <div className="ml-auto flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className={`${desktopActionButtonClass} !px-4 sm:!px-5`}
                aria-label="Go to Market"
              >
                Market
              </button>

              <button
                onClick={controller.handleStartSelling}
                disabled={controller.isSellerProfileLoading}
                className={desktopActionButtonClass}
              >
                <Plus className="h-4 w-4" />
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
                className={`inline-flex items-center ${cardButtonClass} px-3 py-2.5 text-sm font-bold md:hidden`}
                aria-label="Go to Market"
              >
                Market
              </button>

              <button
                onClick={() => controller.setMobileMenuOpen((value) => !value)}
                className={`flex h-11 w-11 items-center justify-center overflow-hidden ${cardButtonClass} md:hidden`}
                aria-label={controller.mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={controller.mobileMenuOpen}
                aria-controls="mobile-home-menu"
              >
                {controller.mobileMenuOpen ? (
                  <X className="h-5 w-5 text-zinc-700" />
                ) : (
                  <Menu className="h-5 w-5 text-zinc-700" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <PasskeySetupPrompt />
    </>
  );
}
