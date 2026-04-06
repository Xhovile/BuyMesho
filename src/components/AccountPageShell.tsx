import type { ReactNode } from "react";
import { ChevronLeft, House, LogOut, Search } from "lucide-react";
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
          <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 bg-red-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-900/20">B</div>
            <div className="text-left">
              <p className="text-lg font-extrabold tracking-tight"><span className="text-red-900">Buy</span><span className="text-zinc-700">Mesho</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            {firebaseUser && (
              <button type="button" onClick={() => void handleLogout()} className="inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2">
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            )}
            <button type="button" onClick={() => navigateToPath(HOME_PATH)} className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2"><House className="w-4 h-4" />Home</button>
            <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 items-center gap-2 inline-flex"><Search className="w-4 h-4" />Explore</button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-zinc-400">{eyebrow}</p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-zinc-900">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm sm:text-base text-zinc-600 leading-relaxed font-medium">{description}</p>
            </div>
            <button type="button" onClick={onBack || (() => navigateBackOrPath(EXPLORE_PATH))} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200 bg-white text-sm font-bold hover:bg-zinc-50 self-start"><ChevronLeft className="w-4 h-4" />{backLabel}</button>
          </div>
        </section>
        <section
          className={childrenSectionClassName || "rounded-[2rem] border border-zinc-200 bg-white shadow-sm overflow-hidden"}
        >
          {children}
        </section>
      </main>
    </div>
  );
}
