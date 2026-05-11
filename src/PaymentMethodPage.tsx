import { ArrowLeft, ChevronDown, CreditCard, Smartphone, Trash2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { useEffect, useState, type FormEvent } from "react";
import { LOGIN_PATH, VERIFY_EMAIL_PATH, PAYMENTS_HUB_PATH, navigateToPath } from "./lib/appNavigation"; 
function useRequireVerifiedUser() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigateToPath(LOGIN_PATH);
        return;
      }

      if (!user.emailVerified) {
        navigateToPath(VERIFY_EMAIL_PATH);
        return;
      }

      setReady(true);
    });

    return () => unsubscribe();
  }, []);

  return ready;
} 

function getPaymentMethodsKey() {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return `__buymesho_payment_methods_${uid}`;
}

type SavedCard = {
  id: string;
  cardholderName: string;
  last4: string;
  expiry: string;
  savedAt: string;
};

type SavedMobileMoney = {
  id: string;
  provider: string;
  number: string;
  savedAt: string;
};

type SavedPaymentMethods = {
  cards: SavedCard[];
  mobileMoney: SavedMobileMoney[];
};

type LegacySavedPaymentMethods = {
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

const emptySavedMethods = (): SavedPaymentMethods => ({ cards: [], mobileMoney: [] });

const normalizeDigits = (value: string) => value.replace(/\D/g, "");

const makeCardId = (cardholderName: string, last4: string, expiry: string) =>
  `${cardholderName.trim().toLowerCase()}-${last4}-${expiry.trim().toLowerCase()}`;

const makeMobileMoneyId = (provider: string, number: string) =>
  `${provider.trim().toLowerCase()}-${normalizeDigits(number)}`;

function normalizeSavedCard(value: unknown): SavedCard | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entry = value as Record<string, unknown>;
  const cardholderName = typeof entry.cardholderName === "string" ? entry.cardholderName.trim() : "";
  const last4 = typeof entry.last4 === "string" ? entry.last4.trim().replace(/\D/g, "").slice(-4) : "";
  const expiry = typeof entry.expiry === "string" ? entry.expiry.trim() : "";

  if (!cardholderName || last4.length < 2 || !expiry) return null;

  return {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : makeCardId(cardholderName, last4, expiry),
    cardholderName,
    last4,
    expiry,
    savedAt: typeof entry.savedAt === "string" && entry.savedAt.trim() ? entry.savedAt : new Date().toISOString(),
  };
}

function normalizeSavedMobileMoney(value: unknown): SavedMobileMoney | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const entry = value as Record<string, unknown>;
  const provider = typeof entry.provider === "string" ? entry.provider.trim() : "";
  const number = typeof entry.number === "string" ? normalizeDigits(entry.number) : "";

  if (!provider || number.length < 6) return null;

  return {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : makeMobileMoneyId(provider, number),
    provider,
    number,
    savedAt: typeof entry.savedAt === "string" && entry.savedAt.trim() ? entry.savedAt : new Date().toISOString(),
  };
}

function readSavedPaymentMethods(): SavedPaymentMethods {
  try {
    const raw = localStorage.getItem(getPaymentMethodsKey());
    if (!raw) return emptySavedMethods();

    const parsed = JSON.parse(raw) as SavedPaymentMethods | LegacySavedPaymentMethods;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return emptySavedMethods();

    const cards = Array.isArray((parsed as SavedPaymentMethods).cards)
      ? (parsed as SavedPaymentMethods).cards.map(normalizeSavedCard).filter((item): item is SavedCard => Boolean(item))
      : [];

    const mobileMoney = Array.isArray((parsed as SavedPaymentMethods).mobileMoney)
      ? (parsed as SavedPaymentMethods).mobileMoney.map(normalizeSavedMobileMoney).filter((item): item is SavedMobileMoney => Boolean(item))
      : [];

    const legacy = parsed as LegacySavedPaymentMethods;

    if (legacy.card) {
      const legacyCard = normalizeSavedCard({
        ...legacy.card,
        id: makeCardId(legacy.card.cardholderName, legacy.card.last4, legacy.card.expiry),
      });
      if (legacyCard && !cards.some((entry) => entry.id === legacyCard.id)) {
        cards.unshift(legacyCard);
      }
    }

    if (legacy.mobileMoney?.provider) {
      const legacyMobile = normalizeSavedMobileMoney({
        provider: legacy.mobileMoney.provider,
        number: "000000",
        id: makeMobileMoneyId(legacy.mobileMoney.provider, "000000"),
      });
      if (legacyMobile && !mobileMoney.some((entry) => entry.id === legacyMobile.id)) {
        mobileMoney.unshift(legacyMobile);
      }
    }

    return { cards, mobileMoney };
  } catch {
    return emptySavedMethods();
  }
}

function savePaymentMethods(value: SavedPaymentMethods) {
  localStorage.setItem(getPaymentMethodsKey(), JSON.stringify(value));
}

function PaymentSectionTitle({
  icon,
  title,
  subtitle,
  countLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  countLabel: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-black tracking-tight text-zinc-950">{title}</h2>
        <p className="text-sm text-zinc-500">{subtitle}</p>
      </div>
      <span className="ml-auto rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-600">
        {countLabel}
      </span>
    </div>
  );
}

function PaymentMethodGate() {
  const ready = useRequireVerifiedUser();
  if (!ready) return null;
  return <PaymentMethodPageContent />;
}

function PaymentMethodPageContent() {
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethods>(emptySavedMethods());
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [mobileProvider, setMobileProvider] = useState("Airtel Money");
  const [mobileNumber, setMobileNumber] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<"card" | "mobile">("card");

  useEffect(() => {
    const refreshSavedMethods = () => {
      const loaded = readSavedPaymentMethods();
      setSavedMethods(loaded);
      setOpenSection(loaded.cards.length > 0 || loaded.mobileMoney.length === 0 ? "card" : "mobile");
    };

    const unsubscribe = onAuthStateChanged(auth, refreshSavedMethods);
    return () => unsubscribe();
  }, []);

  const persistMethods = (updater: (current: SavedPaymentMethods) => SavedPaymentMethods) => {
    setSavedMethods((current) => {
      const next = updater(current);
      savePaymentMethods(next);
      return next;
    });
  };

  const handleCardSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const digits = normalizeDigits(cardNumber);
    if (cardholderName.trim().length < 2 || digits.length < 4 || !cardExpiry.trim()) {
      setMessage("Add a cardholder name, expiry, and at least the last four card digits.");
      return;
    }
    
    const nextCard: SavedCard = {
      id: makeCardId(cardholderName, digits.slice(-4), cardExpiry),
      cardholderName: cardholderName.trim(),
      last4: digits.slice(-4),
      expiry: cardExpiry.trim(),
      savedAt: new Date().toISOString(),
    };

    persistMethods((current) => ({
      ...current,
      cards: [nextCard, ...current.cards.filter((entry) => entry.id !== nextCard.id)],
    }));

    setCardNumber("");
    setMessage("Card saved. Only the last four digits are shown here.");
    setOpenSection("card");
  };

  const handleCardRemove = (id: string) => {
    persistMethods((current) => ({
      ...current,
      cards: current.cards.filter((entry) => entry.id !== id),
    }));
    setMessage("Card removed.");
  };

  const handleMobileMoneySave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const digits = normalizeDigits(mobileNumber);
    if (digits.length < 6) {
      setMessage("Add a valid mobile money number before saving.");
      return;
    }

    const nextMobile: SavedMobileMoney = {
      id: makeMobileMoneyId(mobileProvider, digits),
      provider: mobileProvider,
      number: digits,
      savedAt: new Date().toISOString(),
    };

    persistMethods((current) => ({
      ...current,
      mobileMoney: [nextMobile, ...current.mobileMoney.filter((entry) => entry.id !== nextMobile.id)],
    }));

    setMobileNumber("");
    setMessage("Mobile money saved.");
    setOpenSection("mobile");
  };

  const handleMobileMoneyRemove = (id: string) => {
    persistMethods((current) => ({
      ...current,
      mobileMoney: current.mobileMoney.filter((entry) => entry.id !== id),
    }));
    setMessage("Mobile money method removed.");
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

        <p className="mt-6 text-lg font-black uppercase tracking-[0.28em] text-zinc-600 sm:text-xl">
          Payment methods
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
          Manage payout details
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-600 sm:text-base">
          Keep the methods you actually use. Card and mobile money are separated, each with its own list of saved entries.
        </p>

        {message ? (
          <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm">
            {message}
          </div>
        ) : null}

        <div className="mt-8 space-y-4">
          <section className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection((current) => (current === "card" ? "mobile" : "card"))}
              aria-expanded={openSection === "card"}
              className="flex w-full items-center gap-4 px-5 py-5 text-left"
            >
              <PaymentSectionTitle
                icon={<CreditCard className="h-5 w-5" />}
                title="Card details"
                subtitle="Save one or more cards locally"
                countLabel={`${savedMethods.cards.length} saved`}
              />
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${openSection === "card" ? "rotate-180" : ""}`}
              />
            </button>

            {openSection === "card" ? (
              <div className="border-t border-zinc-200 px-5 py-5">
                <form onSubmit={handleCardSave} className="space-y-3">
                  <input
                    value={cardholderName}
                    onChange={(event) => setCardholderName(event.target.value)}
                    placeholder="Cardholder name"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <input
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value)}
                    placeholder="Card number"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <input
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value)}
                    placeholder="Expiry (MM/YY)"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="submit"
                    className="inline-flex rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
                  >
                    Save card
                  </button>
                </form>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Saved cards</h3>
                    <p className="text-xs text-zinc-500">Stored on this device only</p>
                  </div>

                  {savedMethods.cards.length ? (
                    savedMethods.cards.map((card) => (
                      <div key={card.id} className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-zinc-950">{card.cardholderName}</p>
                            <p className="mt-1 text-sm text-zinc-600">•••• {card.last4} · {card.expiry}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCardRemove(card.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-[1.25rem] border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      No card saved yet.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => setOpenSection((current) => (current === "mobile" ? "card" : "mobile"))}
              aria-expanded={openSection === "mobile"}
              className="flex w-full items-center gap-4 px-5 py-5 text-left"
            >
              <PaymentSectionTitle
                icon={<Smartphone className="h-5 w-5" />}
                title="Mobile money"
                subtitle="Save one or more numbers locally"
                countLabel={`${savedMethods.mobileMoney.length} saved`}
              />
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${openSection === "mobile" ? "rotate-180" : ""}`}
              />
            </button>

            {openSection === "mobile" ? (
              <div className="border-t border-zinc-200 px-5 py-5">
                <form onSubmit={handleMobileMoneySave} className="space-y-3">
                  <select
                    value={mobileProvider}
                    onChange={(event) => setMobileProvider(event.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="TNM Mpamba">TNM Mpamba</option>
                  </select>
                  <input
                    value={mobileNumber}
                    onChange={(event) => setMobileNumber(event.target.value)}
                    placeholder="Mobile money number"
                    inputMode="numeric"
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="submit"
                    className="inline-flex rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
                  >
                    Save mobile money
                  </button>
                </form>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">Saved mobile money</h3>
                    <p className="text-xs text-zinc-500">Stored on this device only</p>
                  </div>

                  {savedMethods.mobileMoney.length ? (
                    savedMethods.mobileMoney.map((item) => (
                      <div key={item.id} className="rounded-[1.25rem] border border-zinc-200 bg-zinc-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-zinc-950">{item.provider}</p>
                            <p className="mt-1 text-sm text-zinc-600">•••• {item.number.slice(-4)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleMobileMoneyRemove(item.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-[1.25rem] border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500">
                      No mobile money account saved yet.
                    </p>
                  )}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
export default function PaymentMethodPage() {
  return <PaymentMethodGate />;
}
