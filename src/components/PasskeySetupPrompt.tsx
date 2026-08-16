import { useEffect, useState } from "react";
import { Fingerprint, ShieldCheck, X } from "lucide-react";
import { useAuthUser } from "../hooks/useAuthUser";
import {
  clearPasskeySetupOffer,
  getPasskeyStatus,
  hasPasskeySetupOffer,
  registerCurrentPasskey,
  supportsPasskeys,
} from "../lib/passkeys";

type State = "idle" | "checking" | "ready" | "busy" | "success" | "error";

export default function PasskeySetupPrompt() {
  const { user, loading } = useAuthUser();
  const [state, setState] = useState<State>("idle");
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (loading || !user || !user.emailVerified || !supportsPasskeys()) return;
    if (!hasPasskeySetupOffer()) return;

    let cancelled = false;
    let retryTimer: number | null = null;

    const prepare = async () => {
      setState("checking");
      try {
        const status = await getPasskeyStatus();
        if (cancelled) return;

        // The offer is now consumed only after the status request succeeds.
        clearPasskeySetupOffer();

        if (status.enabled) {
          setState("idle");
          return;
        }

        setState("ready");
        setOpen(true);
      } catch (error) {
        console.warn("[passkeys] post-login status check failed", error);
        if (cancelled) return;

        setState("idle");
        // Keep the offer marker so a transient auth/API race does not silently
        // discard the post-login passkey prompt.
        retryTimer = window.setTimeout(() => {
          void prepare();
        }, 1200);
      }
    };

    void prepare();

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [loading, user]);

  const close = () => {
    setOpen(false);
    setState("idle");
    setErrorMessage("");
  };

  const handleSetup = async () => {
    setState("busy");
    setErrorMessage("");

    try {
      await registerCurrentPasskey();
      clearPasskeySetupOffer();
      setState("success");
      window.setTimeout(close, 1200);
    } catch (error: any) {
      if (error?.name === "NotAllowedError") {
        clearPasskeySetupOffer();
        close();
        return;
      }

      setErrorMessage(
        error?.message || "We could not add a passkey right now. You can try again from Settings → Security.",
      );
      setState("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">Security</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">Set up a passkey?</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              clearPasskeySetupOffer();
              close();
            }}
            disabled={state === "busy"}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close passkey setup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-6">
          {state === "success" ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-xl font-black text-zinc-950">Passkey added</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                This device can now sign you in securely with your device authentication.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-900 shadow-sm">
                    <Fingerprint className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-extrabold text-zinc-950">Faster, safer sign-in</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                      Use your fingerprint, Face ID, device PIN, or security key instead of entering your password every time.
                    </p>
                  </div>
                </div>
              </div>

              {state === "error" ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-800">
                  {errorMessage}
                </div>
              ) : null}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    clearPasskeySetupOffer();
                    close();
                  }}
                  disabled={state === "busy"}
                  className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={() => void handleSetup()}
                  disabled={state === "busy" || state === "checking"}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Fingerprint className="h-4 w-4" />
                  {state === "busy" ? "Setting up…" : state === "error" ? "Try again" : "Set up passkey"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
