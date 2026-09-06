import type { ReactNode } from "react";
import { ChevronLeft, House, LogOut, ShoppingBag } from "lucide-react";
import { signOut } from "firebase/auth";
import {
  EXPLORE_PATH,
  HOME_PATH,
  LOGIN_PATH,
  navigateBackOrPath,
  navigateToPath,
} from "../lib/appNavigation";
import { auth } from "../firebase";
import { useAccountProfile } from "../hooks/useAccountProfile";
import BrandMark from "./BrandMark";
import EventTicketSearchPanel from "./EventTicketSearchPanel";

type AccountPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  backButtonClassName?: string;
  headerActions?: ReactNode;
  childrenSectionClassName?: string;
  hideNavigation?: boolean;
  hideBackButton?: boolean;
  showBrandHero?: boolean;
};

export default function AccountPageShell({
  eyebrow,
  title,
  description,
  children,
  backLabel = "Back",
  onBack,
  backButtonClassName,
  headerActions,
  childrenSectionClassName,
  hideNavigation = false,
  hideBackButton = false,
  showBrandHero = false,
}: AccountPageShellProps) {
  const { firebaseUser } = useAccountProfile();
  const isProfilePage = title === "My profile";
  const pathname = window.location.pathname;
  const showEventTicketSearch = pathname === "/explore/events/manage" || pathname === "/explore/events/dashboard";

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      navigateToPath(LOGIN_PATH);
    }
  };

  const childrenWrapperClassName =
    childrenSectionClassName ||
    (isProfilePage
      ? "overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/40"
      : "w-full");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900">
      {!hideNavigation && (
        <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <BrandMark />
            <div className="flex items-center gap-3">
              {firebaseUser && (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-bold hover:bg-zinc-50 md:px-4"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Log out</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateToPath(HOME_PATH)}
                className="hidden items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50 sm:inline-flex"
              >
                <House className="h-4 w-4" />
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                <ShoppingBag className="h-4 w-4" />
                Market
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {showBrandHero && (
            <div className="rounded-[2rem] border border-white/80 bg-white/90 px-5 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <BrandMark />
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">{description}</p>
            </div>

            {!hideBackButton && (
              <div className="flex flex-wrap items-start gap-3 self-start">
                <button
                  type="button"
                  onClick={onBack || (() => navigateBackOrPath(EXPLORE_PATH))}
                  className={backButtonClassName || "inline-flex items-center gap-2 rounded-2xl border border-zinc-900 bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {backLabel}
                </button>
                {headerActions}
              </div>
            )}
          </div>

          {showEventTicketSearch ? <EventTicketSearchPanel mode="creator" /> : null}
          <div className={childrenWrapperClassName}>{children}</div>
        </div>
      </main>
    </div>
  );
}
