import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { submitConnectCallback } from "./modules/connect/api";

export default function ConnectCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Connecting your PayChangu account...");

  useEffect(() => {
    const run = async () => {
      try {
        const sellerUid = params.get("sellerUid") ?? "";
        if (!sellerUid) {
          throw new Error("Missing sellerUid");
        }

        await submitConnectCallback({
          sellerUid,
          accessToken: params.get("access_token") ?? undefined,
          refreshToken: params.get("refresh_token"),
          mode: params.get("mode") === "live" ? "live" : "test",
          scope: params.get("scope"),
          authorizationUrl: params.get("authorizationUrl"),
          rawPayload: Object.fromEntries(params.entries()),
        });

        setMessage("Connected. Redirecting...");
        navigate("/seller-payouts", { replace: true });
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Connect setup failed."
        );
      }
    };

    void run();
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-sm font-medium text-zinc-700">{message}</p>
    </div>
  );
}
