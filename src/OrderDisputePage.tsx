import { useEffect } from "react";
import { navigateToPath } from "./lib/appNavigation";

export default function OrderDisputePage() {
  useEffect(() => {
    const parts = window.location.pathname.split("/");
    const disputeIndex = parts.indexOf("dispute");
    const orderId = disputeIndex > 0 ? decodeURIComponent(parts[disputeIndex - 1]) : "";
    const ticketId = new URLSearchParams(window.location.search).get("ticketId")?.trim() ?? "";
    if (!orderId) {
      navigateToPath("/disputes");
      return;
    }

    const query = new URLSearchParams({ reference: orderId });
    if (ticketId) query.set("ticketId", ticketId);
    navigateToPath(`/disputes?${query.toString()}`);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 text-sm text-zinc-500">
      Opening Disputes…
    </div>
  );
}
