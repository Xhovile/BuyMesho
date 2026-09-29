import { useState, type MouseEvent } from "react";
import { X } from "lucide-react";

import ConfirmModal from "../ConfirmModal";
import TicketHolderForm, { type TicketHolderInformation } from "../tickets/TicketHolderForm";
import { apiFetch } from "../../lib/api";
import { navigateToLoginWithReturnPath } from "../../lib/appNavigation";
import { useAuthUser } from "../../hooks/useAuthUser";

type DirectEventCheckoutProps = {
  eventId: number;
  eventTitle: string;
  initialValue: Partial<TicketHolderInformation>;
  price: string;
};

export default function DirectEventCheckout({
  eventId,
  eventTitle,
  initialValue,
  price,
}: DirectEventCheckoutProps) {
  const { user: firebaseUser } = useAuthUser();
  const [ticketHolderOpen, setTicketHolderOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const handleBuy = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!firebaseUser?.uid) {
      setAuthPromptOpen(true);
      return;
    }

    setTicketHolderOpen(true);
  };

  const submitTicketHolder = async (ticketHolder: TicketHolderInformation) => {
    if (!firebaseUser?.uid) return;

    try {
      setCheckoutLoading(true);

      const result = (await apiFetch("/api/payments/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          items: [{ eventId: String(eventId), quantity: 1 }],
          method: "mobile_money",
          settlementRoute: "direct",
          ticketHolder,
          returnUrl: window.location.origin + "/payment/return",
          cancelUrl: window.location.origin + "/payment/return?cancelled=1",
        }),
      })) as { checkoutUrl?: string | null; payment?: { checkoutUrl?: string | null } };

      const checkoutUrl = result.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
      if (!checkoutUrl) {
        throw new Error("Payment gateway did not return a checkout URL.");
      }

      window.location.href = checkoutUrl;
    } catch (error: unknown) {
      setCheckoutLoading(false);
      const message = error instanceof Error ? error.message : "Failed to start ticket checkout.";
      window.alert(message);
    }
  };

  return (
    <>
      <div className="mt-3 overflow-hidden rounded-2xl border border-orange-200 bg-white">
        <div className="flex items-stretch">
          <button
            type="button"
            onClick={handleBuy}
            className="relative z-20 flex flex-1 items-center justify-center bg-orange-700 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-orange-800"
            aria-label={"Buy ticket for " + eventTitle}
          >
            Buy Ticket
          </button>
          <div className="flex min-w-[6.5rem] items-center justify-center border-l border-orange-200 bg-white px-4 py-3 text-sm font-black tracking-tight text-zinc-950">
            {price}
          </div>
        </div>
      </div>

      {ticketHolderOpen ? (
        <div className="fixed inset-0 z-[98] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Close ticket holder form"
            onClick={() => setTicketHolderOpen(false)}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setTicketHolderOpen(false)}
              disabled={checkoutLoading}
              className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <TicketHolderForm
              initialValue={initialValue}
              onSubmit={submitTicketHolder}
              onCancel={() => setTicketHolderOpen(false)}
              submitting={checkoutLoading}
            />
          </div>
        </div>
      ) : null}

      <ConfirmModal
        open={authPromptOpen}
        title="Sign in to buy"
        message="You need to sign in or create an account before you can buy this ticket."
        confirmText="Continue"
        cancelText="Cancel"
        onCancel={() => setAuthPromptOpen(false)}
        onConfirm={() => {
          setAuthPromptOpen(false);
          navigateToLoginWithReturnPath();
        }}
      />
    </>
  );
}
