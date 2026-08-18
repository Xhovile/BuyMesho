import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import { navigateToPath } from "../lib/appNavigation";
import { apiFetch } from "../lib/api";
import { verifyTotpChallenge } from "../lib/security";
import BrandMark from "./BrandMark";
import TotpChallengeModal from "./TotpChallengeModal";

type AuthSessionCheckpointProps = { mode: "login" | "signup"; children: ReactNode };
type ValidatorAccessState = "checking" | "approved" | "denied" | "unavailable" | "totp-required";
type TotpGateState = "checking" | "verified" | "required" | "unavailable";
type ValidatorHandoffResponse = { success?: boolean; code: string; expiresInSeconds?: number };

type TotpSessionResponse = {
  enabled?: boolean;
  verified?: boolean;
};

function getTicketValidatorReturnUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("client") !== "ticket-validator") return null;
  const returnTo = params.get("returnTo");
  if (!returnTo) return null;
  try {
    const target = new URL(returnTo);
    const allowedOrigin = import.meta.env.VITE_TICKET_VALIDATOR_URL?.trim() || "https://ticketvalidator.vercel.app";
    return target.origin === new URL(allowedOrigin).origin ? target : null;
  } catch {
    return null;
  }
}

async function checkValidatorAccess(): Promise<ValidatorHandoffResponse> {
  const handoff = await apiFetch("/api/validator/handoff", {
    method: "POST",
    body: JSON.stringify({ client: "ticket-validator" }),
  }) as ValidatorHandoffResponse;

  if (!handoff || typeof handoff.code !== "string" || !handoff.code) {
    throw new Error("BuyMesho returned an invalid Ticket Validator access handoff.");
  }

  return handoff;
}

function isTotpRequiredError(error: unknown) {
  const status = Number((error as { status?: unknown } | null)?.status);
  const message = String((error as { message?: unknown } | null)?.message || "");
  return status === 401 && /two-factor verification is required/i.test(message);
}

export default function AuthSessionCheckpoint({ mode, children }: AuthSessionCheckpointProps) {
  const [restoring, setRestoring] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sessionExistedOnEntry, setSessionExistedOnEntry] = useState<boolean | null>(null);
  const [validatorAccess, setValidatorAccess] = useState<ValidatorAccessState>("totp-required");
  const [validatorHandoff, setValidatorHandoff] = useState<string | null>(null);
  const [totpGateState, setTotpGateState] = useState<TotpGateState>("verified");
  const [totpChallengeOpen, setTotpChallengeOpen] = useState(false);
  const [totpChallengeCode, setTotpChallengeCode] = useState("");
  const [totpChallengeBusy, setTotpChallengeBusy] = useState(false);
  const [totpChallengeError, setTotpChallengeError] = useState("");
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
    if (!user || !sessionExistedOnEntry || isValidatorEntry) {
      if (!user || !sessionExistedOnEntry) setTotpGateState("verified");
      return;
    }

    let cancelled = false;
    setTotpGateState("checking");
    setTotpChallengeError("");

    void apiFetch("/api/totp/session")
      .then((response) => {
        if (cancelled) return;
        const data = (response as { data?: TotpSessionResponse })?.data ?? (response as TotpSessionResponse);
        if (data?.enabled && !data?.verified) {
          setTotpGateState("required");
          setTotpChallengeCode("");
          setTotpChallengeOpen(true);
          return;
        }
        setTotpGateState("verified");
      })
      .catch(() => {
        if (cancelled) return;
        setTotpGateState("unavailable");
      });

    return () => {
      cancelled = true;
    };
  }, [user?.uid, sessionExistedOnEntry, isValidatorEntry]);

  const requestValidatorHandoff = async () => {
    const handoff = await checkValidatorAccess();
    setValidatorHandoff(handoff.code);
    setValidatorAccess("approved");
    setTotpChallengeOpen(false);
    setTotpChallengeCode("");
    setTotpChallengeError("");
  };

  useEffect(() => {
    if (!user || !isValidatorEntry) {
      setValidatorAccess("totp-required");
      setValidatorHandoff(null);
      return;
    }

    let cancelled = false;
    setValidatorAccess("checking");
    setValidatorHandoff(null);
    setTotpChallengeError("");

    void (async () => {
      try {
        // Validator entry is a deliberate step-up authentication boundary.
        // Invalidate any existing BuyMesho TOTP session first so the handoff
        // cannot be authorized by a previous verification.
        await apiFetch("/api/totp/session", { method: "DELETE" });
        if (cancelled) return;
        await checkValidatorAccess().then((handoff) => {
          if (cancelled) return;
          setValidatorHandoff(handoff.code);
          setValidatorAccess("approved");
        });
      } catch (error) {
        if (cancelled) return;
        if (isTotpRequiredError(error)) {
          setValidatorAccess("totp-required");
          setTotpChallengeOpen(true);
          return;
        }
        const status = typeof (error as { status?: unknown })?.status === "number"
          ? Number((error as { status?: number })?.status)
          : null;
        setValidatorAccess(status === 403 ? "denied" : "unavailable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, isValidatorEntry]);

  const handleTotpSubmit = async () => {
    const code = totpChallengeCode.trim();
    if (!code) {
      setTotpChallengeError("Enter the 6-digit authenticator code.");
      return;
    }

    setTotpChallengeBusy(true);
    setTotpChallengeError("");
    try {
      const result = await verifyTotpChallenge(code);
      if (!result.ok) {
        setTotpChallengeError(result.message);
        return;
      }

      if (isValidatorEntry) {
        await requestValidatorHandoff();
      } else {
        setTotpGateState("verified");
        setTotpChallengeOpen(false);
        setTotpChallengeCode("");
        setTotpChallengeError("");
      }
    } catch (error) {
      setTotpChallengeError(error instanceof Error ? error.message : "We could not complete two-factor verification.");
    } finally {
      setTotpChallengeBusy(false);
    }
  };

  const handleTotpCancel = async () => {
    setTotpChallengeOpen(false);
    setTotpChallengeCode("");
    setTotpChallengeError("");
    await apiFetch("/api/totp/session", { method: "DELETE" }).catch(() => undefined);
    await signOut(auth);
  };

  if (restoring || sessionExistedOnEntry === null) {
    return <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="flex min-h-screen items-center justify-center px-4"><div className="flex items-center gap-3 text-sm font-bold text-zinc-600"><Loader2 className="h-5 w-5 animate-spin" />Checking your session…</div></main></div>;
  }

  if (!sessionExistedOnEntry) return <>{children}</>;
  if (!user) return <>{children}</>;

  const handleContinue = async () => {
    const target = getTicketValidatorReturnUrl();
    if (target) {
      try {
        const code = validatorHandoff || (await checkValidatorAccess()).code;
        target.searchParams.set("buymesho_session", code);
        window.location.replace(target.toString());
      } catch (error) {
        console.error("Failed to create Ticket Validator auth handoff:", error);
      }
      return;
    }
    navigateToPath("/");
  };

  const handleUseAnotherAccount = async () => {
    await apiFetch("/api/totp/session", { method: "DELETE" }).catch(() => undefined);
    await signOut(auth);
  };

  if (!isValidatorEntry) {
    if (totpGateState === "checking") {
      return <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="flex min-h-screen items-center justify-center px-4"><div className="flex items-center gap-3 text-sm font-bold text-zinc-600"><Loader2 className="h-5 w-5 animate-spin" />Checking your security verification…</div></main></div>;
    }

    if (totpGateState === "unavailable") {
      return <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"><section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10"><BrandMark /><div className="mt-10"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">Account security</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">We couldn’t verify your security status</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">BuyMesho could not confirm whether two-factor authentication has been completed on this session. Access is blocked until the security check succeeds.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white">Try again</button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900"><LogOut className="h-4 w-4" />Sign out</button></div></div></section></main></div>;
    }

    const alreadySignedIn = <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"><section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10"><BrandMark /><div className="mt-10"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Account</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">You’re already signed in</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">{mode === "signup" ? "This BuyMesho account is already active on this device. You do not need to create another account." : "Your BuyMesho session is already active. Continue with this account or sign out to use a different one."}</p><div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Signed-in account</p><p className="mt-1 truncate text-sm font-bold text-zinc-900">{user.email || "Current BuyMesho account"}</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void handleContinue()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800">Continue <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-50"><LogOut className="h-4 w-4" />Use another account</button></div></div></section></main><TotpChallengeModal open={totpChallengeOpen} title="Two-factor authentication" message="Enter the current code from your authenticator app to finish signing in to BuyMesho." code={totpChallengeCode} busy={totpChallengeBusy} onCodeChange={setTotpChallengeCode} onSubmit={() => void handleTotpSubmit()} onCancel={() => void handleTotpCancel()} />{totpChallengeError ? <div className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-xl">{totpChallengeError}</div> : null}</div>;
    return alreadySignedIn;
  }

  const validatorContent = () => {
    if (validatorAccess === "checking") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-400">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Checking your access</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">We’re checking whether this BuyMesho account is an approved event creator.</p><div className="mt-8 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-bold text-zinc-700"><Loader2 className="h-5 w-5 animate-spin" />Verifying Validator access…</div></>;
    if (validatorAccess === "totp-required") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Two-factor verification required</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">Complete your BuyMesho authenticator verification to continue to Ticket Validator.</p><div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-900">Your account is signed in, but Validator access requires a fresh 2FA verification.</div></>;
    if (validatorAccess === "approved") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">Access confirmed</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">This account is an approved event creator and can access Ticket Validator.</p><div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"><div className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Validator access available</div><p className="mt-1 truncate text-xs font-semibold text-emerald-700">{user.email || "Current BuyMesho account"}</p></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => void handleContinue()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white transition hover:bg-zinc-800">Continue to Validator <ArrowRight className="h-4 w-4" /></button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900 transition hover:bg-zinc-50"><LogOut className="h-4 w-4" />Use another account</button></div></>;
    if (validatorAccess === "unavailable") return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-amber-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">We couldn’t verify access</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">BuyMesho could not verify this account’s Validator access right now. Your account has not been signed out.</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white">Try again</button><button type="button" onClick={() => void handleUseAnotherAccount()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-300 bg-white px-5 py-3 font-bold text-zinc-900"><LogOut className="h-4 w-4" />Use another account</button></div></>;
    return <><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-red-600">Ticket Validator</p><h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900">This account doesn’t have access</h1><p className="mt-3 text-sm font-medium leading-relaxed text-zinc-600 sm:text-base">The BuyMesho account you’re currently signed in with is not an approved event creator account, so it cannot access Ticket Validator.</p><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3"><div className="flex items-center gap-2 text-sm font-bold text-red-800"><ShieldAlert className="h-4 w-4" />Validator access unavailable</div><p className="mt-1 truncate text-xs font-semibold text-red-700">{user.email || "Current BuyMesho account"}</p></div><button type="button" onClick={() => void handleUseAnotherAccount()} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 font-bold text-white"><LogOut className="h-4 w-4" />Use another account</button></>;
  };

  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,41,59,0.08),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_48%,_#f8fafc_100%)] text-zinc-900"><main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-4 py-10"><section className="w-full rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur sm:p-10"><BrandMark /><div className="mt-10">{validatorContent()}</div></section></main><TotpChallengeModal open={totpChallengeOpen} title="Two-factor verification" message="Enter the current code from your authenticator app to continue to Ticket Validator." code={totpChallengeCode} busy={totpChallengeBusy} onCodeChange={setTotpChallengeCode} onSubmit={() => void handleTotpSubmit()} onCancel={() => void handleTotpCancel()} />{totpChallengeError ? <div className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 shadow-xl">{totpChallengeError}</div> : null}</div>;
}
