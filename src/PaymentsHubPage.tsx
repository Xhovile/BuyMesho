import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CreditCard,
  ShieldAlert,
  ShoppingCart,
  Truck,
  Wallet,
} from "lucide-react";
import type { Listing } from "./types";
import { formatMoney } from "./shared/utils/formatMoney";
import { apiFetch } from "./lib/api";
import {
  BUYER_PAYMENTS_PATH,
  CART_PATH,
  EXPLORE_PATH,
  navigateBackOrPath,
  navigateToListingDetails,
  navigateToOrderDispute,
  navigateToOrderTracking,
  navigateToPath,
} from "./lib/appNavigation";
import {
  readBuyerCart,
  readBuyerPayments,
  type BuyerCartItem,
  type BuyerPaymentRecord,
} from "./lib/buyerState";
import { summarizePayments } from "./lib/paymentsOverview";
import { fetchMyOrders, type OrderBundle } from "./lib/orderApi";

const PAYMENT_METHODS_KEY = "__buymesho_payment_methods";

const sectionIds = [
  { id: "balance", label: "Balance" },
  { id: "payment-method", label: "Payment Method" },
  { id: "cart", label: "Cart" },
  { id: "track-order", label: "Track Order" },
  { id: "buyer-payments", label: "Buyer Payments" },
  { id: "disputes", label: "Disputes" },
] as const;

type SavedPaymentMethods = {
  card?: {
    cardholderName: string;
    last4: string;
    expiry: string;
  };
  mobileMoney?: {
    provider: string;
    maskedNumber: string;
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

function statusPillClass(status: "pending" | "paid" | "rejected" | "error") {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "rejected") return "bg-amber-100 text-amber-800";
  if (status === "error") return "bg-red-100 text-red-700";
  return "bg-zinc-200 text-zinc-700";
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-3 text-2xl font-black tracking-tight text-zinc-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-600">{hint}</p>
    </div>
  );
}

export default function PaymentsHubPage() {
  const [orders, setOrders] = useState<OrderBundle[]>([]);
  const [paymentRecords, setPaymentRecords] = useState<BuyerPaymentRecord[]>([]);
  const [cartItems, setCartItems] = useState<BuyerCartItem[]>([]);
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trackReference, setTrackReference] = useState("");
  const [disputeReference, setDisputeReference] = useState("");
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethods>({});
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [mobileProvider, setMobileProvider] = useState("Airtel Money");
  const [mobileNumber, setMobileNumber] = useState("");
  const [methodMessage, setMethodMessage] = useState<string | null>(null);

  useEffect(() => {
    setSavedMethods(readSavedPaymentMethods());
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncLocal = () => {
      if (cancelled) return;
      setCartItems(readBuyerCart());
      setPaymentRecords(readBuyerPayments());
    };

    const load = async () => {
      setLoading(true);
      setError(null);
      syncLocal();

      const [ordersResult, listingsResult] = await Promise.allSettled([
        fetchMyOrders(),
        apiFetch("/api/listings?pageSize=4"),
      ]);

      if (cancelled) return;

      if (ordersResult.status === "fulfilled") {
        setOrders(Array.isArray(ordersResult.value) ? ordersResult.value : []);
      } else {
        setOrders([]);
        setError(ordersResult.reason instanceof Error ? ordersResult.reason.message : "Could not load payment data.");
      }

      if (listingsResult.status === "fulfilled") {
        const payload = listingsResult.value as { items?: Listing[] } | null;
        setAvailableListings(Array.isArray(payload?.items) ? payload.items.slice(0, 4) : []);
      } else {
        setAvailableListings([]);
      }

      setLoading(false);
    };

    void load();

    window.addEventListener("storage", syncLocal);
    window.addEventListener("focus", syncLocal);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", syncLocal);
      window.removeEventListener("focus", syncLocal);
    };
  }, []);

  const summary = useMemo(() => summarizePayments(orders, paymentRecords), [orders, paymentRecords]);
  const latestPendingCheckoutUrl = useMemo(
    () => paymentRecords.find((record) => record.status === "pending" && record.checkoutUrl)?.checkoutUrl ?? null,
    [paymentRecords],
  );

  const handleTrackOrderSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reference = trackReference.trim();
    if (!reference) return;
    navigateToOrderTracking(reference);
  };

  const handleDisputeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reference = disputeReference.trim();
    if (!reference) return;
    navigateToOrderDispute(reference);
  };

  const handleCardSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = cardNumber.replace(/\D/g, "");
    if (cardholderName.trim().length < 2 || digits.length < 4 || !cardExpiry.trim()) {
      setMethodMessage("Add a cardholder name, expiry, and at least the last four card digits.");
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
    setMethodMessage("Card details updated. Only the last four digits are saved on this device.");
  };

  const handleMobileMoneySave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const digits = mobileNumber.replace(/\D/g, "");
    if (digits.length < 6) {
      setMethodMessage("Add a valid mobile money number before saving.");
      return;
    }

    const next = {
      ...savedMethods,
      mobileMoney: {
        provider: mobileProvider,
        maskedNumber: `••• ••• ${digits.slice(-3)}`,
      },
    };

    setSavedMethods(next);
    savePaymentMethods(next);
    setMobileNumber("");
    setMethodMessage("Mobile money details updated.");
  };

  const handlePayNow = () => {
    if (latestPendingCheckoutUrl) {
      window.location.href = latestPendingCheckoutUrl;
      return;
    }
    navigateToPath(CART_PATH);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigateBackOrPath(EXPLORE_PATH)}
          className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Payments hub</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">Payments stays the main financial hub</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            The hierarchy stays fixed: Balance first, then payment setup, cart actions, order tracking, buyer payment status, and disputes.
          </p>

          <nav className="mt-6 overflow-x-auto rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-2">
            <ol className="flex min-w-max gap-2">
              {sectionIds.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 shadow-sm hover:bg-zinc-900 hover:text-white"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-xs font-black text-zinc-600">
                      {index + 1}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {error ? (
            <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {error}
            </div>
          ) : null}

          <div className="mt-8 space-y-6">
            <section id="balance" className="scroll-mt-24 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">1. Balance</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Main financial summary first</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Balance stays first so the current money status is visible before any payment action.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Available balance" value={formatMoney(summary.balance.available)} hint="Released or completed order value ready in the finished flow." />
                <StatCard label="Pending balance" value={formatMoney(summary.balance.pending)} hint="Payments that are still waiting for confirmation." />
                <StatCard label="Paid balance" value={formatMoney(summary.balance.paid)} hint="All successful paid order value tracked so far." />
                <StatCard label="Rejected balance" value={formatMoney(summary.balance.rejected)} hint="Cancelled or refunded payment value." />
                <StatCard label="Held / disputed" value={formatMoney(summary.balance.held)} hint="Escrow held or disputed amounts, when applicable." />
              </div>
            </section>

            <section id="payment-method" className="scroll-mt-24 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">2. Payment Method</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Card and mobile money setup</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Save a safe payment setup for this device. Full card numbers are not stored.
                  </p>
                </div>
              </div>

              {methodMessage ? (
                <div className="mt-4 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700">{methodMessage}</div>
              ) : null}

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <form onSubmit={handleCardSave} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                  <h3 className="text-base font-black text-zinc-950">Card details</h3>
                  <div className="mt-4 space-y-3">
                    <input value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} placeholder="Cardholder name" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                    <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="Card number" inputMode="numeric" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                    <input value={cardExpiry} onChange={(event) => setCardExpiry(event.target.value)} placeholder="Expiry (MM/YY)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                    <button type="submit" className="inline-flex rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">Save card</button>
                  </div>
                  {savedMethods.card ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                      <p className="font-bold text-zinc-900">{savedMethods.card.cardholderName}</p>
                      <p className="mt-1">•••• {savedMethods.card.last4} · {savedMethods.card.expiry}</p>
                    </div>
                  ) : null}
                </form>

                <form onSubmit={handleMobileMoneySave} className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                  <h3 className="text-base font-black text-zinc-950">Mobile money</h3>
                  <div className="mt-4 space-y-3">
                    <select value={mobileProvider} onChange={(event) => setMobileProvider(event.target.value)} className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900">
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="TNM Mpamba">TNM Mpamba</option>
                    </select>
                    <input value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} placeholder="Mobile money number" inputMode="numeric" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900" />
                    <button type="submit" className="inline-flex rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">Save mobile money</button>
                  </div>
                  {savedMethods.mobileMoney ? (
                    <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                      <p className="font-bold text-zinc-900">{savedMethods.mobileMoney.provider}</p>
                      <p className="mt-1">{savedMethods.mobileMoney.maskedNumber}</p>
                    </div>
                  ) : null}
                </form>
              </div>
            </section>

            <section id="cart" className="scroll-mt-24 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">3. Cart</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Added items, available items, and Pay</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Review what is already in the cart, jump back to the market to add more items, and continue to Pay from one place.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-black text-zinc-950">Added items</h3>
                    <button type="button" onClick={() => navigateToPath(CART_PATH)} className="text-sm font-bold text-zinc-700 underline-offset-4 hover:underline">Open cart</button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {cartItems.length ? cartItems.slice(0, 4).map((item) => (
                      <div key={`${item.listingId}-${item.addedAt}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                        <p className="font-bold text-zinc-900">{item.listingTitle}</p>
                        <p className="mt-1">Quantity: {item.quantity} · {formatMoney(item.totalPrice)}</p>
                      </div>
                    )) : (
                      <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-600">No items are in the cart yet. Use the market shortcuts below to add more.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-zinc-200 bg-white p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-black text-zinc-950">Available items</h3>
                    <button type="button" onClick={() => navigateToPath(EXPLORE_PATH)} className="text-sm font-bold text-zinc-700 underline-offset-4 hover:underline">Browse market</button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {availableListings.length ? availableListings.map((item) => (
                      <button key={item.id} type="button" onClick={() => navigateToListingDetails(item.id)} className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm hover:bg-zinc-100">
                        <p className="font-bold text-zinc-900">{item.name}</p>
                        <p className="mt-1 text-zinc-600">{item.university ?? "Campus listing"} · {formatMoney(Number(item.price) || 0)}</p>
                      </button>
                    )) : (
                      <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-sm text-zinc-600">Available listings will appear here when the market feed is ready.</p>
                    )}
                  </div>

                  <button type="button" onClick={handlePayNow} className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800">
                    Pay
                  </button>
                </div>
              </div>
            </section>

            <section id="track-order" className="scroll-mt-24 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">4. Track Order</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Use the existing order tracking form</h2>
                </div>
              </div>

              <form onSubmit={handleTrackOrderSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={trackReference}
                  onChange={(event) => setTrackReference(event.target.value)}
                  placeholder="Enter order reference"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800">
                  Track order
                </button>
              </form>
            </section>

            <section id="buyer-payments" className="scroll-mt-24 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">5. Buyer Payments</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Payment statuses stay visible</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <StatCard label="Pending" value={String(summary.statusCounts.pending)} hint="Waiting for payment confirmation." />
                <StatCard label="Paid" value={String(summary.statusCounts.paid)} hint="Successfully captured or completed payments." />
                <StatCard label="Rejected" value={String(summary.statusCounts.rejected)} hint="Refunded or cancelled payment attempts." />
                <StatCard label="Error" value={String(summary.statusCounts.error)} hint="Payments that returned an error." />
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <p className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">Loading payment activity…</p>
                ) : summary.records.length ? summary.records.slice(0, 4).map((record) => (
                  <button key={record.key} type="button" onClick={() => navigateToOrderTracking(record.reference)} className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left hover:bg-zinc-50">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-zinc-900">{record.title}</p>
                        <p className="mt-1 text-sm text-zinc-500">{record.reference}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${statusPillClass(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-bold text-zinc-900">{formatMoney(record.amount, record.currency)}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">{record.detail}</p>
                  </button>
                )) : (
                  <p className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600">No buyer payment records are available yet.</p>
                )}
              </div>

              <button type="button" onClick={() => navigateToPath(BUYER_PAYMENTS_PATH)} className="mt-4 inline-flex rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800">
                Open Buyer Payments
              </button>
            </section>

            <section id="disputes" className="scroll-mt-24 rounded-[1.75rem] border border-zinc-200 bg-zinc-50 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-zinc-800">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">6. Disputes</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">Handle payment or order disputes</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Active held or disputed records: <span className="font-bold text-zinc-900">{summary.disputeCount}</span>
                  </p>
                </div>
              </div>

              <form onSubmit={handleDisputeSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  value={disputeReference}
                  onChange={(event) => setDisputeReference(event.target.value)}
                  placeholder="Enter order or payment reference"
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <button type="submit" className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800">
                  Open dispute
                </button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
