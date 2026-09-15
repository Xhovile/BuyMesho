import { useEffect, useState } from "react";
import { CheckCircle2, WifiOff } from "lucide-react";

export default function NetworkStatusBanner() {
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setOffline(true);
      setReconnected(false);
    };

    const handleOnline = () => {
      setOffline(false);
      setReconnected(true);
      window.setTimeout(() => setReconnected(false), 3500);
    };

    setOffline(!navigator.onLine);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!offline && !reconnected) return null;

  return (
    <div
      className="fixed inset-x-3 bottom-4 z-[120] mx-auto max-w-md sm:inset-x-auto sm:right-5 sm:left-auto"
      role="status"
      aria-live="polite"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md ${
          offline
            ? "border-amber-200 bg-amber-50/95 text-amber-950"
            : "border-emerald-200 bg-emerald-50/95 text-emerald-950"
        }`}
      >
        {offline ? (
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-extrabold">
            {offline ? "You're offline" : "You're back online"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed opacity-80">
            {offline
              ? "BuyMesho will keep using available cached data. Actions that require the internet may be unavailable."
              : "Your connection has been restored. BuyMesho can now sync normally."}
          </p>
        </div>
      </div>
    </div>
  );
}
