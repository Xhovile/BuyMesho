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
  tone?: "default" | "minimal";
};

export default function AccountPageShell({
  eyebrow,
  title,
  description,
  children,
  backLabel = "Back",
  onBack,
  childrenSectionClassName,
  tone = "default",
}: AccountPageShellProps) {
  const { firebaseUser } = useAccountProfile();
  const isMinimal = tone === "minimal";

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } finally {
      navigateToPath(LOGIN_PATH);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            {firebaseUser && (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            )}
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="hidden sm:inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
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

      <main className={`${isMinimal ? "mx-auto max-w-5xl px-4 py-8 sm:py-10" : "max-w-7xl mx-auto px-4 py-5 sm:py-6"}`}>
        {isMinimal ? (
          <section className="mb-8">
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">
                  {description}
                </p>
              </div>
              <button
                type="button"
                onClick={onBack || (() => navigateBackOrPath(EXPLORE_PATH))}
                className="inline-flex items-center gap-2 self-start rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
              >
                <ChevronLeft className="w-4 h-4" />
                {backLabel}
              </button>
            </div>
          </section>
        ) : (
          <section className="mb-4 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
                <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">{title}</h1>
                <p className="mt-3 max-w-2xl text-sm sm:text-base font-medium leading-relaxed text-zinc-600">
                  {description}
                </p>
              </div>
              <button
                type="button"
                onClick={onBack || (() => navigateBackOrPath(EXPLORE_PATH))}
                className="inline-flex items-center gap-2 self-start rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
              >
                <ChevronLeft className="w-4 h-4" />
                {backLabel}
              </button>
            </div>
          </section>
        )}

        <section
          className={
            childrenSectionClassName ||
            (isMinimal
              ? "overflow-visible"
              : "overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm")
          }
        >
          {children}
        </section>
      </main>
    </div>
  );
}
