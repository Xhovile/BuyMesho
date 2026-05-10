import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, CreditCard } from "lucide-react";
import { PAYMENTS_HUB_PATH, navigateBackOrPath } from "./lib/appNavigation";

const PAYMENT_METHODS_KEY = "__buymesho_payment_methods";

type SavedPaymentMethods = {
  card?: {
    cardholderName: string;
    last4: string;
    expiry: string;
  };
  mobileMoney?: {
    provider: string;
    isConfigured: boolean;
  };
};

function readSavedPaymentMethods(): SavedPaymentMethods {
  try {
    const raw = localStorage.getItem(PAYMENT_METHODS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedPaymentMethods;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function savePaymentMethods(value: SavedPaymentMethods) {
  localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(value));
}

export default function PaymentMethodPage() {
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethods>({});
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [mobileProvider, setMobileProvider] = useState("Airtel Money");
  const [mobileNumber, setMobileNumber] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedMethods(readSavedPaymentMethods());
  }, []);

  const handleCardSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = cardNumber.replace(/\D/g, "");
    if (cardholderName.trim().length < 2 || digits.length < 4 || !cardExpiry.trim()) {
      setMessage("Add a cardholder name, expiry, and at least the last four card digits.");
      return;
    }

    const next = {
      ...savedMethods,
      card: {
        cardholderName: cardholderName.trim(),
        last4: digits.slice(-4),
        expiry: cardExpiry.trim(),
      },
    };

    setSavedMethods(next);
    savePaymentMethods(next);
    setCardNumber("");
    setMessage("Card details updated. Only the last four digits are saved on this device.");
  };

  const handleMobileMoneySave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = mobileNumber.replace(/\D/g, "");
    if (digits.length < 6) {
      setMessage("Add a valid mobile money number before saving.");
      return;
    }

    const next = {
      ...savedMethods,
      mobileMoney: {
        provider: mobileProvider,
        isConfigured: true,
      },
    };

    setSavedMethods(next);
    savePaymentMethods(next);
    setMobileNumber("");
    setMessage("Mobile money details updated.");
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(PAYMENTS_HUB_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-zinc-600">Payment Method</p>

        <section className="mt-2 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="mt-1 text-3xl font-black tracking-tight text-zinc-950">Card and mobile money setup</h1>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">{message}</div>
          ) : null}

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <form onSubmit={handleCardSave} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
              <h2 className="text-base font-black text-zinc-950">Card details</h2>
              <div className="mt-4 space-y-3">
                <input value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} placeholder="Cardholder name" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="Card number" inputMode="numeric" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                <input value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} placeholder="Expiry (MM/YY)" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                <button type="submit" className="inline-flex rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">Save card</button>
              </div>
              {savedMethods.card ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                  <p className="font-bold text-zinc-900">{savedMethods.card.cardholderName}</p>
                  <p className="mt-1">•••• {savedMethods.card.last4} · {savedMethods.card.expiry}</p>
                </div>
              ) : null}
            </form>

            <form onSubmit={handleMobileMoneySave} className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50 p-5">
              <h2 className="text-base font-black text-zinc-950">Mobile money</h2>
              <div className="mt-4 space-y-3">
                <select value={mobileProvider} onChange={(event) => setMobileProvider(event.target.value)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="TNM Mpamba">TNM Mpamba</option>
                </select>
                <input value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="Mobile money number" inputMode="numeric" className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                <button type="submit" className="inline-flex rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">Save mobile money</button>
              </div>
              {savedMethods.mobileMoney ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">
                  <p className="font-bold text-zinc-900">{savedMethods.mobileMoney.provider}</p>
                  <p className="mt-1">Number added for this device.</p>
                </div>
              ) : null}
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
