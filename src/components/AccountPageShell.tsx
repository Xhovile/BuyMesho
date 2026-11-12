import type { ReactNode } from "react";
import { ArrowLeft, ChevronLeft, House, LogOut, ShoppingBag } from "lucide-react";
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
  const normalizedTitle = title.trim().toLowerCase();
  const brandHeroSubtitle = normalizedTitle.startsWith("log in")
    ? "Log In"
    : normalizedTitle.includes("create") && normalizedTitle.includes("account")
      ? "Create Account"
      : eyebrow;

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
      ? "overflow-hidden rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface shadow-[0_24px_70px_rgba(15,23,42,0.12)] ring-1 ring-bm-border"
      : "w-full");

  return (
    <div className="min-h-screen bg-bm-bg text-bm-text dark:text-bm-text">
      {!hideNavigation && (
        <header className="buymesho-brand-header sticky top-0 z-40 border-b border-bm-border dark:border-bm-border bg-bm-surface/85 dark:bg-bm-surface/85 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <BrandMark />
            <div className="flex items-center gap-3">
              {firebaseUser && (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-3 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted md:px-4"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Log out</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => navigateToPath(HOME_PATH)}
                className="hidden items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted sm:inline-flex"
              >
                <House className="h-4 w-4" />
                Home
              </button>
              <button
                type="button"
                onClick={() => navigateToPath(EXPLORE_PATH)}
                className="inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
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
            <div className="flex items-center justify-between gap-4 rounded-[2rem] border border-bm-border bg-bm-surface/90 dark:bg-bm-surface/90 px-5 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              <BrandMark subtitle={brandHeroSubtitle} />
              <button
                type="button"
                onClick={() => navigateBackOrPath(HOME_PATH)}
                aria-label="Go back"
                title="Go back"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-bm-brand transition-colors hover:bg-bm-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bm-brand focus-visible:ring-offset-2 active:bg-bm-danger-bg"
              >
                <ArrowLeft className="h-6 w-6" strokeWidth={2.5} />
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-4xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-bm-text-muted dark:text-bm-text-muted sm:text-base">{description}</p>
            </div>

            {!hideBackButton && (
              <div className="flex flex-wrap items-start gap-3 self-start">
                <button
                  type="button"
                  onClick={onBack || (() => navigateBackOrPath(EXPLORE_PATH))}
                  className={backButtonClassName || "inline-flex items-center gap-2 rounded-2xl border border-bm-brand bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"}
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
