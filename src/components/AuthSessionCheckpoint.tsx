import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Loader2, LogOut } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { navigateToLogin, navigateToPath } from "../lib/appNavigation";
import BrandMark from "./BrandMark";

type AuthSessionCheckpointProps = { mode: "login" | "signup"; children: ReactNode };

export default function AuthSessionCheckpoint({ mode, children }: AuthSessionCheckpointProps) {
  const [restoring, setRestoring] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setRestoring(false); }), []);

  if (restoring) return <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="flex min-h-screen items-center justify-center px-4"><div className="flex items-center gap-3 text-sm font-bold text-zinc-600"><Loader2 className="h-5 w-5 animate-spin" />Checking your session…</div></main></div>;
  if (!user) return <>{children}</>;

  const handleContinue = async () => {
    const params = new URLSearchParams(window.location.search);
    const client = params.get("client"); const returnTo = params.get("returnTo");
    if (client === "ticket-validator" && returnTo) {
      try {
        const target = new URL(returnTo);
        const allowedOrigin = import.meta.env.VITE_TICKET_VALIDATOR_URL?.trim() || "https://ticket-validator.vercel.app";
        if (target.origin === new URL(allowedOrigin).origin) {
          target.searchParams.set("buymesho_session", await user.getIdToken(true));
          window.location.replace(target.toString()); return;
        }
      } catch { /* fall through to the normal account route */ }
    }
    navigateToPath("/");
  };

  const handleUseAnotherAccount = async () => { await signOut(auth); navigateToLogin(); };

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"><section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10"><BrandMark /><div className="mt-10"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Account</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">You’re already signed in</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">{mode === "signup" ? "This BuyMesho account is already active on this device. You do not need to create another account." : "Your BuyMesho session is already active. Continue with this account or sign out to use a different one."}</p><div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Signed-in account</p><p className="mt-1 truncate text-sm font-bold text-zinc-900">{user.email || "Current BuyMesho account"}</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void handleContinue()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800">Continue <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-50"><LogOut className="h-4 w-4" />Use another account</button></div></div></section></main></div>;
}
