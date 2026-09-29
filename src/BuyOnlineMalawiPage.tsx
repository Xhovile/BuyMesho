import { ArrowRight, BookOpen, CheckCircle2, CircleAlert, FileSearch, ShieldCheck, WalletCards } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EXPLORE_PATH } from "./lib/appNavigation.paths";

const guideSections = [
  { id: "account", number: "01", label: "Account & access" },
  { id: "find", number: "02", label: "Find a product" },
  { id: "seller", number: "03", label: "Check the seller" },
  { id: "buy", number: "04", label: "Start a purchase" },
  { id: "checkout", number: "05", label: "Complete checkout" },
  { id: "after-payment", number: "06", label: "After payment" },
  { id: "delivery", number: "07", label: "Delivery & escrow" },
  { id: "disputes", number: "08", label: "Disputes" },
];

function GuideSection({
  id,
  number,
  eyebrow,
  title,
  children,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-zinc-200 py-10 sm:py-12">
      <div className="grid gap-6 lg:grid-cols-[100px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-black text-blue-600">{number}</p>
          <p className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-zinc-400">{eyebrow}</p>
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">{title}</h2>
          <div className="mt-5 space-y-5 text-sm leading-7 text-zinc-700 sm:text-base">{children}</div>
        </div>
      </div>
    </section>
  );
}

function FlowRow({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "red";
}) {
  const toneClasses =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/60"
      : tone === "red"
        ? "border-red-200 bg-red-50/60"
        : "border-zinc-200 bg-white";

  return (
    <div className={`rounded-2xl border ${toneClasses} p-4 sm:p-5`}>
      <p className="text-sm font-extrabold text-zinc-950">{title}</p>
      <div className="mt-1.5 text-sm leading-6 text-zinc-600">{children}</div>
    </div>
  );
}

function PathCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.9em] font-bold text-zinc-800">{children}</code>
  );
}

export default function BuyOnlineMalawiPage() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href={EXPLORE_PATH} aria-label="Open BuyMesho marketplace">
            <BrandMark subtitle="Buying guide" />
          </a>
          <a
            href={EXPLORE_PATH}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Browse Market
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="border-b border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-red-50/40 py-10 sm:py-14 lg:py-16">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">
              <BookOpen className="h-4 w-4 text-blue-600" />
              BuyMesho buying guide
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              Buying on BuyMesho, step by step.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              This guide explains what happens from the moment you find a product to the point where
              payment, delivery, escrow, order tracking, and disputes are handled.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guideSections.slice(0, 4).map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="border-t border-zinc-300 py-3 text-sm font-bold text-zinc-800 transition-colors hover:text-blue-700"
              >
                <span className="mr-2 text-blue-600">{section.number}</span>
                {section.label}
              </a>
            ))}
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className="border border-zinc-200 bg-white p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h2 className="text-lg font-black text-zinc-950">The complete buying path</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Find a listing → open its details → sign in or create an account → checkout →
                  payment page → payment verification → order tracking → delivery → confirm delivery.
                </p>
              </div>
            </div>
          </div>
        </section>

        <GuideSection id="account" number="01" eyebrow="Account & access" title="You can browse first, but buying requires an account.">
          <p>
            Public marketplace pages can be browsed before you create an account. When you decide to buy a listing,
            BuyMesho checks whether you are signed in.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Already signed in" tone="blue">
              Select <strong>Buy</strong> or the purchase action on the listing. BuyMesho opens the checkout flow
              for that listing.
            </FlowRow>
            <FlowRow title="Not signed in" tone="red">
              Selecting <strong>Buy</strong> first opens a login prompt. Continue to <strong>Log in</strong>;
              the original listing path is saved so the purchase can continue after authentication.
            </FlowRow>
          </div>

          <p>
            When the account does not yet exist, the login screen provides <strong>Create account</strong>.
            A new account is created with your name, email address, and password. BuyMesho then sends you through
            email verification and account setup before returning you to the saved page you were trying to use.
          </p>

          <div className="border-l-2 border-blue-600 pl-4 text-sm text-zinc-600">
            <strong className="text-zinc-900">For a new buyer:</strong> create account → verify email → complete
            account setup → return to the original listing → start checkout.
          </div>
        </GuideSection>

        <GuideSection id="find" number="02" eyebrow="Product discovery" title="Look up products using the marketplace, categories, and search.">
          <p>
            Start from the main marketplace to search listings and narrow what you see. Category pages provide a
            focused view of a product group, while seller pages let you browse everything a particular seller has
            published.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <FlowRow title="Marketplace">
              Use the main marketplace for broader search, filters, sorting, and general discovery.
            </FlowRow>
            <FlowRow title="Categories">
              Open a category such as Phones & Gadgets or Fashion & Clothing, then narrow by the available filters.
            </FlowRow>
            <FlowRow title="Seller directory">
              Open the seller directory to find a public seller profile and inspect that seller's listings together.
            </FlowRow>
          </div>

          <p>
            When you find a listing, open the listing details before buying. The details page is where you can inspect
            the item, seller information, pricing, availability, and other listing-specific information.
          </p>

          <a
            href={EXPLORE_PATH}
            className="group inline-flex items-center gap-1.5 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700"
          >
            Open the marketplace
            <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
          </a>
        </GuideSection>

        <GuideSection id="seller" number="03" eyebrow="Seller verification" title="Check the seller before committing to the purchase.">
          <p>
            BuyMesho exposes several seller signals so that a buyer can inspect the seller rather than relying only on
            the listing title or price.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Verified badge" tone="blue">
              A public seller profile can display a <strong>Verified</strong> badge when the seller is marked as
              verified by BuyMesho.
            </FlowRow>
            <FlowRow title="Ratings">
              Check the seller's average rating and rating count where available. A new seller may have no ratings yet.
            </FlowRow>
            <FlowRow title="Seller profile">
              Open the seller profile to see the seller's public description, join date, profile views, and published
              listings.
            </FlowRow>
            <FlowRow title="Listing consistency">
              Compare the listing you are considering with the seller's other listings and the information shown on
              the listing details page.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              These are signals to help you inspect a seller. The Verified badge does not replace checking the actual
              listing details, delivery arrangements, ratings, and communication.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="buy" number="04" eyebrow="Starting a purchase" title="What happens when you press Buy?">
          <p>
            The purchase path depends on your account state.
          </p>

          <div className="space-y-3">
            <FlowRow title="You are signed in">
              BuyMesho checks that you are not attempting to purchase your own listing, then opens the checkout window.
            </FlowRow>
            <FlowRow title="You are not signed in">
              BuyMesho opens a login prompt instead of opening checkout. After you authenticate, the saved return path
              brings you back to the listing so you can start the purchase.
            </FlowRow>
          </div>

          <p>
            The checkout window starts with the listing you selected. It does not send you to a generic shopping cart
            first when using the listing's direct purchase action.
          </p>
        </GuideSection>

        <GuideSection id="checkout" number="05" eyebrow="Checkout & payment" title="Complete the order details, then continue to the payment page.">
          <p>
            Before payment is initialized, checkout asks for the buyer's delivery details and the quantity being
            purchased. The total is calculated from the listing price and selected quantity.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Delivery details">
              Enter your full name, phone number, address line, area, and town or district. A landmark can also be
              provided.
            </FlowRow>
            <FlowRow title="Quantity">
              Where the listing has more than one unit available, choose the quantity before confirming checkout.
            </FlowRow>
            <FlowRow title="Payment">
              The current checkout form sends the purchase through the marketplace's mobile-money payment flow.
            </FlowRow>
            <FlowRow title="Escrow">
              The current buyer-facing option is <strong>Pay and confirm later</strong>. Funds are held in escrow
              until the order reaches the delivery-confirmation stage.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              When checkout is confirmed, BuyMesho creates the payment/order attempt and redirects you to the payment
              gateway. Keep the payment session open until it returns you to BuyMesho.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="after-payment" number="06" eyebrow="Successful checkout" title="Know exactly where you land after payment.">
          <p>
            A successful payment does not leave you on the product page. The payment provider returns you to BuyMesho's
            payment-return route, where the app checks the payment status server-side.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="1. Payment return">
              BuyMesho receives the payment reference and checks whether the payment was actually captured or otherwise
              confirmed.
            </FlowRow>
            <FlowRow title="2. Order tracking" tone="blue">
              Once confirmed, BuyMesho resolves the order flow and sends you to the buyer order-tracking page at
              <PathCode>/orders/&lt;reference&gt;</PathCode>.
            </FlowRow>
          </div>

          <p>
            The order tracking page is the place to continue after checkout. It shows payment state, escrow state,
            order details, and delivery progress.
          </p>

          <div className="border border-zinc-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
              <div>
                <p className="font-extrabold text-zinc-950">What the order can show</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Order placed → Payment pending → Payment confirmed → Funds in escrow → Delivered → Funds released.
                </p>
              </div>
            </div>
          </div>

          <p>
            If the payment is cancelled or fails, the success redirect does not happen. BuyMesho keeps the payment
            result in the payment-return flow so you can return to the marketplace and try again.
          </p>
        </GuideSection>

        <GuideSection id="delivery" number="07" eyebrow="Delivery, escrow & confirmation" title="What you should do after a successful checkout.">
          <p>
            After payment, do not treat the order as complete simply because the payment succeeded. The order moves
            into the delivery and escrow stages.
          </p>

          <div className="space-y-3">
            <FlowRow title="During delivery" tone="blue">
              Track the order and coordinate the delivery or handover. BuyMesho's order tracking page is the central
              status view.
            </FlowRow>
            <FlowRow title="When you receive the order">
              Check that the item has actually been delivered and that the order is ready to be completed before using
              the delivery-confirmation action.
            </FlowRow>
            <FlowRow title="Confirm delivery">
              Confirming delivery releases the escrow-held funds according to the order's release flow. Do this only
              after the delivery stage has actually been reached.
            </FlowRow>
          </div>

          <p>
            The order may expose an eligible dispute action while the escrow is still held. This becomes important when
            delivery has not happened within the order's delivery window.
          </p>
        </GuideSection>

        <GuideSection id="disputes" number="08" eyebrow="Problems & disputes" title="How to report a problem and what the dispute process does.">
          <p>
            BuyMesho has a dedicated disputes page for order problems. You must be signed in with the account that
            can access the relevant order.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Find the order">
              Open <PathCode>/disputes</PathCode> and search using the order reference, order ID, or a ticket ID where
              applicable.
            </FlowRow>
            <FlowRow title="Before the delivery deadline">
              If the order is still within its delivery period and delivery has not yet been confirmed, the dispute form
              can be temporarily unavailable. The page tells you the date when the dispute becomes available.
            </FlowRow>
            <FlowRow title="When a dispute is available" tone="red">
              Choose what happened, choose the outcome you want, explain the problem, and submit the case.
            </FlowRow>
            <FlowRow title="Evidence">
              You can attach up to 3 photos and 1 video. Each uploaded file must be 10 MB or smaller.
            </FlowRow>
          </div>

          <div className="border border-zinc-200 bg-white p-5">
            <p className="font-extrabold text-zinc-950">Available issue types include</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Order cancellation, seller non-fulfilment, product/item problems, delivery problems, payment/platform
              problems, and exceptional issues.
            </p>
          </div>

          <div className="border border-zinc-200 bg-white p-5">
            <p className="font-extrabold text-zinc-950">Available requested resolutions include</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Refund, return, return plus refund, or asking BuyMesho to review the issue.
            </p>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm leading-6 text-zinc-600">
              A submitted dispute is reviewed based on the circumstances and evidence provided; submitting one does not
              guarantee a particular outcome. An active dispute blocks a second dispute, and a settled dispute cannot
              be submitted again through the normal dispute form.
            </p>
          </div>

          <p>
            The current eligibility rules also allow a post-delivery dispute for up to 30 days after confirmed delivery.
            Once that period ends, the order is no longer eligible through the standard dispute path.
          </p>

          <p>
            Where payment has already been released, BuyMesho can still receive a report, but the dispute page explicitly
            states that a post-payout request does not guarantee a refund and may require the seller to resolve the issue,
            with BuyMesho intervening where appropriate.
          </p>

          <a
            href="/disputes"
            className="group inline-flex items-center gap-1.5 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700"
          >
            Open Disputes
            <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
          </a>
        </GuideSection>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Need the marketplace?</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Go back to BuyMesho listings.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Use the marketplace to search, filter, compare, inspect sellers, and start a purchase.
              </p>
            </div>
            <a
              href={EXPLORE_PATH}
              className="group inline-flex shrink-0 items-center gap-2 py-2 text-sm font-extrabold text-zinc-900 hover:text-blue-700"
            >
              Open Market
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
            </a>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
