import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { navigateToPath } from "../lib/appNavigation";
import BrandMark from "./BrandMark";

type AuthSessionCheckpointProps = { mode: "login" | "signup"; children: ReactNode };
type ValidatorAccessState = "checking" | "approved" | "denied" | "unavailable" | "not-validator";

function getTicketValidatorReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("client") !== "ticket-validator") return null;
  const returnTo = params.get("returnTo");
  if (!returnTo) return null;
  try {
    const target = new URL(returnTo);
    const allowedOrigin = import.meta.env.VITE_TICKET_VALIDATOR_URL?.trim() || "https://ticket-validator.vercel.app";
    return target.origin === new URL(allowedOrigin).origin ? target : null;
  } catch { return null; }
}

async function checkValidatorAccess() {
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdToken();
  const response = await fetch("/api/event-creator/overview", { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Validator access check failed: ${response.status}`);
  const payload = await response.json();
  const creator = payload?.creator;
  if (!creator) return false;
  if (String(creator.status || "").trim().toLowerCase() !== "approved") return false;
  if (creator.active_until) {
    const activeUntil = new Date(creator.active_until).getTime();
    if (Number.isFinite(activeUntil) && activeUntil < Date.now()) return false;
  }
  return true;
}

export default function AuthSessionCheckpoint({ mode, children }: AuthSessionCheckpointProps) {
  const [restoring, setRestoring] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sessionExistedOnEntry, setSessionExistedOnEntry] = useState<boolean | null>(null);
  const [validatorAccess, setValidatorAccess] = useState<ValidatorAccessState>("not-validator");
  const isValidatorEntry = Boolean(getTicketValidatorReturnUrl());

  useEffect(() => {
    let initialSessionResolved = false;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      if (!initialSessionResolved) {
        initialSessionResolved = true;
        setSessionExistedOnEntry(Boolean(nextUser));
      }
      setRestoring(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !isValidatorEntry) { setValidatorAccess("not-validator"); return; }
    let cancelled = false;
    setValidatorAccess("checking");
    void checkValidatorAccess()
      .then((approved) => { if (!cancelled) setValidatorAccess(approved ? "approved" : "denied"); })
      .catch(() => { if (!cancelled) setValidatorAccess("unavailable"); });
    return () => { cancelled = true; };
  }, [user?.uid, isValidatorEntry]);

  if (restoring || sessionExistedOnEntry === null) return <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="flex min-h-screen items-center justify-center px-4"><div className="flex items-center gap-3 text-sm font-bold text-zinc-600"><Loader2 className="h-5 w-5 animate-spin" />Checking your session…</div></main></div>;
  if (!sessionExistedOnEntry) return <>{children}</>;
  if (!user) return <>{children}</>;

  const handleContinue = async () => {
    const target = getTicketValidatorReturnUrl();
    if (target) { target.searchParams.set("buymesho_session", await user.getIdToken(true)); window.location.replace(target.toString()); return; }
    navigateToPath("/");
  };
  const handleUseAnotherAccount = async () => { await signOut(auth); };

  const validatorContent = () => {
    if (validatorAccess === "checking") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Checking your access</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">We’re checking whether this BuyMesho account is an approved event creator.</p><div className="mt-8 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-bold text-zinc-700"><Loader2 className="h-5 w-5 animate-spin" />Verifying Validator access…</div></>;
    if (validatorAccess === "approved") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Access confirmed</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">This account is an approved event creator and can access Ticket Validator.</p><div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Validator access available</div><p className="mt-1 truncate text-xs font-semibold text-emerald-700">{user.email || "Current BuyMesho account"}</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void handleContinue()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800">Continue to Validator <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-50"><LogOut className="h-4 w-4" />Use another account</button></div></>;
    if (validatorAccess === "unavailable") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">We couldn’t verify access</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">BuyMesho could not verify this account’s Validator access right now. Your account has not been signed out.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800">Try again</button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-50"><LogOut className="h-4 w-4" />Use another account</button></div></>;
    return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">This account doesn’t have access</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">The BuyMesho account you’re currently signed in with is not an approved event creator account, so it cannot access Ticket Validator.</p><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"><div className="flex items-center gap-2 text-sm font-bold text-red-800"><ShieldAlert className="h-4 w-4" />Validator access unavailable</div><p className="mt-1 truncate text-xs font-semibold text-red-700">{user.email || "Current BuyMesho account"}</p></div><button type="button" onClick={() => void handleUseAnotherAccount()} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800"><LogOut className="h-4 w-4" />Use another account</button></>;
  };

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"><section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10"><BrandMark /><div className="mt-10">{isValidatorEntry ? validatorContent() : <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Account</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">You’re already signed in</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">{mode === "signup" ? "This BuyMesho account is already active on this device. You do not need to create another account." : "Your BuyMesho session is already active. Continue with this account or sign out to use a different one."}</p><div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Signed-in account</p><p className="mt-1 truncate text-sm font-bold text-zinc-900">{user.email || "Current BuyMesho account"}</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void handleContinue()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800">Continue <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-50"><LogOut className="h-4 w-4" />Use another account</button></div></>}</div></section></main></div>;
}
