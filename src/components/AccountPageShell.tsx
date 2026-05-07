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

type AccountPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  childrenSectionClassName?: string;
};

export default function AccountPageShell({
  eyebrow,
  title,
  description,
  children,
  backLabel = "Back",
  onBack,
  childrenSectionClassName,
}: AccountPageShellProps) {
  const { firebaseUser } = useAccountProfile();
  const isProfilePage = title === "My profile";

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
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            {firebaseUser && (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2"
            >
              <House className="w-4 h-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              <ShoppingBag className="w-4 h-4" />
              Market
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">{eyebrow}</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={onBack || (() => navigateBackOrPath(EXPLORE_PATH))}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-900 bg-black text-sm font-bold text-white hover:bg-zinc-800 self-start"
            >
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </button>
          </div>

          <div className={childrenWrapperClassName}>{children}</div>
        </div>
      </main>
    </div>
  );
}
