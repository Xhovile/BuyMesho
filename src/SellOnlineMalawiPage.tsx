import { ArrowRight, BookOpen, CircleAlert, MessageSquareText, Package, ShieldCheck, WalletCards } from "lucide-react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import { EXPLORE_PATH, SELLER_HUB_PATH, SELLER_MESSAGES_PATH, SELLER_ORDERS_PATH, SELLER_PAYOUTS_MANAGE_PATH } from "./lib/appNavigation.paths";

const guideSections = [
  { id: "qualification", number: "01", label: "Seller qualification" },
  { id: "meaning", number: "02", label: "What selling means" },
  { id: "workspace", number: "03", label: "Seller workspace" },
  { id: "listings", number: "04", label: "Create & manage listings" },
  { id: "buyers", number: "05", label: "Reach & communicate with buyers" },
  { id: "orders", number: "06", label: "Orders, delivery & disputes" },
  { id: "earnings", number: "07", label: "Earnings, fees & payouts" },
  { id: "responsibilities", number: "08", label: "Seller responsibilities" },
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
    <section id={id} className="scroll-mt-28 border-t border-zinc-200 py-12 sm:py-16 lg:py-20">
      <div className="grid gap-5 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[132px_minmax(0,1fr)] lg:gap-10">
        <div className="pt-1">
          <p className="guide-chapter-number text-6xl leading-none sm:text-7xl lg:text-8xl">{number}</p>
        </div>
        <div className="max-w-5xl">
          <p className="mt-1 text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f] sm:text-base">{eyebrow}</p>
          <h2 className="guide-display mt-2 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-zinc-950 sm:text-5xl lg:text-6xl">
            {title}
          </h2>
          <div className="mt-7 space-y-6 text-base leading-7 text-zinc-700 sm:mt-9 sm:text-[17px] sm:leading-8">{children}</div>
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <p className="text-sm font-extrabold text-zinc-950">{title}</p>
      <div className="mt-1.5 text-sm leading-6 text-zinc-600">{children}</div>
    </div>
  );
}

export default function SellOnlineMalawiPage() {
  return (
    <div className="guide-page min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href={EXPLORE_PATH} aria-label="Open BuyMesho marketplace">
            <BrandMark subtitle="Selling guide" />
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
        <section className="py-10 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl px-1 text-center sm:px-0">
            <BookOpen className="mx-auto h-14 w-14 text-[#74152f] sm:h-16 sm:w-16 lg:h-20 lg:w-20" strokeWidth={1.8} aria-hidden="true" />
            <div className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#74152f] sm:text-base">
              BuyMesho Seller Guide
            </div>
            <h1 className="guide-display mx-auto mt-4 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-zinc-950 sm:text-6xl lg:text-7xl">
              Selling on BuyMesho, step by step.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              Understand what it means to sell on BuyMesho, how seller access works, what your workspace provides,
              how orders and disputes are handled, and how seller earnings are settled.
            </p>
          </div>

          <nav aria-label="Seller guide sections" className="mt-9 border-y border-zinc-200">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4">
              {guideSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex min-h-16 items-center gap-4 border-b border-zinc-200 px-1 py-4 text-base font-bold text-zinc-800 transition-colors hover:text-blue-700 sm:min-h-20 sm:border-r sm:px-4 sm:text-lg sm:[&:nth-child(even)]:border-r-0 lg:border-b-0 lg:[&:nth-child(4n)]:border-r-0"
                >
                  <span className="guide-chapter-number text-2xl sm:text-3xl">{section.number}</span>
                  <span>{section.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </nav>
        </section>

        <section className="py-8 sm:py-10">
          <div className="border-y border-zinc-200 bg-white/45 p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-950" />
              <div>
                <h2 className="guide-display text-xl font-semibold text-zinc-950 sm:text-2xl">The seller journey</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Apply → verify seller access → enter the seller workspace → publish listings → communicate with buyers →
                  manage orders and delivery → handle disputes when needed → receive seller earnings through the payout flow.
                </p>
              </div>
            </div>
          </div>
        </section>

        <GuideSection id="qualification" number="01" eyebrow="Seller qualification" title="Any eligible BuyMesho user can apply to become a seller.">
          <p>
            Seller access is a separate process after account creation. The application identifies who you are, what you intend
            to sell, and the information needed for BuyMesho to review the application.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow title="Choose your seller type">
              Applications can be made as a <strong>Student seller</strong>, <strong>Public / Non-student</strong>, or
              <strong> Business / Organisation</strong>.
            </InfoRow>
            <InfoRow title="Identity verification">
              Every applicant provides a National ID or Passport. The application also collects your full legal name and
              phone or WhatsApp number.
            </InfoRow>
            <InfoRow title="Student applicants">
              Student sellers also provide their institution, student number, and Student ID.
            </InfoRow>
            <InfoRow title="Business applicants">
              Business / Organisation applicants provide proof of business registration.
            </InfoRow>
          </div>

          <p>
            You also describe your business or offer, what you sell, and the services you may provide. Applications are
            submitted for <strong>manual review</strong>; completing the form does not by itself activate seller status.
          </p>
        </GuideSection>

        <GuideSection id="meaning" number="02" eyebrow="What selling means" title="Selling on BuyMesho gives your offer a public marketplace presence.">
          <p>
            A seller is a marketplace participant who publishes listings for buyers to discover. BuyMesho provides the
            public seller profile, listing pages, buyer communication, order handling, dispute workflows, and seller
            settlement infrastructure around those listings.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoRow title="Public seller profile">
              Buyers can inspect your public seller profile and the listings you have published.
            </InfoRow>
            <InfoRow title="Marketplace discovery">
              Your active listings become part of the marketplace where buyers can search, filter, and inspect products.
            </InfoRow>
            <InfoRow title="Structured transaction flow">
              Purchases can move through payment confirmation, escrow, delivery, disputes, and seller payout rather than
              relying only on informal communication.
            </InfoRow>
          </div>

          <p>
            This makes BuyMesho more than a place to post a product photo: it gives a seller a structured place to present
            an offer and manage the activity around it.
          </p>
        </GuideSection>

        <GuideSection id="workspace" number="03" eyebrow="Seller workspace" title="Your seller workspace brings the core selling tools together.">
          <p>
            The Seller Workspace is the starting point for day-to-day seller activity. Its current sections are designed
            around the work a seller needs to perform.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow title="Messages">
              Open BuyMesho messages and conversations with buyers. Unread-message counts are surfaced in the workspace.
            </InfoRow>
            <InfoRow title="Orders">
              View and manage purchases made from your listings, including order details, buyer delivery information,
              delivery progress, and dispute activity.
            </InfoRow>
            <InfoRow title="Earnings">
              View seller balances, payout history, and payout destinations.
            </InfoRow>
            <InfoRow title="My Listings">
              View, edit, update stock, mark items sold, and manage published listings.
            </InfoRow>
            <InfoRow title="Listings Performance">
              Review total, active, and sold listings, listing views, profile views, top-performing listings, and listing spread.
            </InfoRow>
            <InfoRow title="Settings & Security">
              Manage account settings and security controls, including available authentication and session options.
            </InfoRow>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-zinc-200 pt-4">
            <a href={SELLER_HUB_PATH} className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
              Open Seller Workspace
              <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a href={SELLER_MESSAGES_PATH} className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
              Open Messages
              <MessageSquareText className="h-4 w-4 text-blue-600" />
            </a>
          </div>
        </GuideSection>

        <GuideSection id="listings" number="04" eyebrow="Listings" title="Create clear listings, then manage them as your inventory changes.">
          <p>
            A seller's main public asset is the listing. Use the listing flow to describe what you are selling clearly,
            set the price, add relevant media and information, and make availability understandable to buyers.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow title="Create">
              Publish a new listing through the seller create-listing flow.
            </InfoRow>
            <InfoRow title="Manage">
              Edit listing details, update stock, mark a listing sold, restock it, or remove it when appropriate.
            </InfoRow>
            <InfoRow title="Performance">
              The seller dashboard shows views and listing activity so you can see which listings are attracting attention.
            </InfoRow>
            <InfoRow title="Public presentation">
              Buyers can inspect the listing details and then open your seller profile to see your other published listings.
            </InfoRow>
          </div>

          <a href="/create" className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
            Create a listing
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </a>
        </GuideSection>

        <GuideSection id="buyers" number="05" eyebrow="Buyer communication" title="Your seller profile and messages are part of the buying decision.">
          <p>
            Buyers can inspect your profile, view your other listings, and communicate with you through BuyMesho.
            The seller workspace keeps those conversations separate from order-management tasks.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow title="Messages">
              Use Seller Messages for marketplace conversations and buyer communication.
            </InfoRow>
            <InfoRow title="Seller profile">
              Your public profile gives buyers another place to understand who is selling and what else you have listed.
            </InfoRow>
            <InfoRow title="Listing quality">
              Clear descriptions, pricing, availability, and media help buyers understand the offer before purchase.
            </InfoRow>
            <InfoRow title="Safety">
              Keep important transaction communication on BuyMesho where the platform can retain relevant information for
              support and dispute handling.
            </InfoRow>
          </div>

          <a href={SELLER_MESSAGES_PATH} className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
            Open Seller Messages
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </a>
        </GuideSection>

        <GuideSection id="orders" number="06" eyebrow="Orders, delivery & disputes" title="A sale continues after the buyer pays.">
          <p>
            Seller Orders gives you the order-side workflow for purchases made from your listings. Buyer payment is only
            one part of the transaction; the order still has to move through delivery and, where applicable, dispute handling.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow title="New order">
              Open the seller order details to see the purchase, buyer delivery information, payment state, escrow state,
              and seller payout state.
            </InfoRow>
            <InfoRow title="Delivery">
              When the order is ready, the seller can mark it as sent. Once delivery is completed, the order reflects the
              completed delivery state.
            </InfoRow>
            <InfoRow title="Buyer disputes">
              A buyer may open a dispute under the applicable eligibility rules. The seller can review the issue and
              evidence where the seller-side resolution flow is available.
            </InfoRow>
            <InfoRow title="Seller resolution">
              Where seller resolution is available, the seller can respond with a refund, replacement, or rejection,
              with the required explanation and evidence for the selected path.
            </InfoRow>
            <InfoRow title="BuyMesho review">
              A dispute submitted before seller payout completion can be handled as a BuyMesho review, with the seller
              payout protected while the case is active.
            </InfoRow>
            <InfoRow title="Escrow">
              Escrow can delay seller settlement until the release conditions are satisfied. An active dispute can prevent
              escrow release while the case is being handled.
            </InfoRow>
          </div>

          <a href={SELLER_ORDERS_PATH} className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
            Open Seller Orders
            <ArrowRight className="h-4 w-4 text-blue-600" />
          </a>
        </GuideSection>

        <GuideSection id="earnings" number="07" eyebrow="Earnings, fees & payouts" title="Your seller earnings are calculated from the completed transaction and payout rules.">
          <p>
            BuyMesho separates the buyer's purchase from the seller's eventual payout. Once an eligible escrow release
            creates a seller payout, the payout calculation applies the current seller-side fee policy before settlement.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow title="BuyMesho commission">
              The current seller platform commission is <strong>3% of the gross collected amount</strong>.
            </InfoRow>
            <InfoRow title="Airtel Money payout">
              The current payout fee is <strong>1.8%</strong> for Airtel Money.
            </InfoRow>
            <InfoRow title="TNM Mpamba payout">
              The current payout fee is <strong>1.5%</strong> for TNM Mpamba.
            </InfoRow>
            <InfoRow title="Bank transfer payout">
              The current payout fee is <strong>1.7% plus MWK 700</strong>.
            </InfoRow>
          </div>

          <p>
            The seller payout view shows the transaction amount, applicable BuyMesho commission, PayChangu payout fee,
            any reserve, and the resulting amount to be received when the financial snapshot is available.
          </p>

          <p>
            Payout destinations are managed separately from the public seller profile. Supported destination types include
            mobile money and bank accounts, and the payout flow requires an active verified destination.
          </p>

          <a href={SELLER_PAYOUTS_MANAGE_PATH} className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
            Open Earnings
            <WalletCards className="h-4 w-4 text-blue-600" />
          </a>
        </GuideSection>

        <GuideSection id="responsibilities" number="08" eyebrow="Seller responsibilities" title="Selling on BuyMesho also means taking responsibility for what you publish and how you transact.">
          <p>
            Sellers are responsible for accurately representing what they offer and for complying with BuyMesho's marketplace
            rules. Seller access does not remove the seller's responsibility for the listing, the transaction, or the delivery arrangement.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow title="Represent the offer accurately">
              Keep product or service descriptions, pricing, quantities, conditions, and availability truthful and understandable.
            </InfoRow>
            <InfoRow title="Be prepared to fulfil">
              A published listing creates a buyer-facing offer. Maintain stock and delivery information so the buyer can
              understand what can actually be fulfilled.
            </InfoRow>
            <InfoRow title="Handle disputes properly">
              Review buyer issues in the seller order workflow and respond through the available BuyMesho resolution process.
            </InfoRow>
            <InfoRow title="Keep your account secure">
              Use the available BuyMesho account security controls and protect your sign-in credentials and devices.
            </InfoRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm leading-6 text-zinc-600">
              Seller approval and a Verified badge are platform signals, not guarantees that every listing, delivery, payment,
              or transaction outcome will be successful. Buyers and sellers should still communicate clearly and keep relevant records.
            </p>
          </div>
        </GuideSection>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="max-w-4xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Additional seller information</p>
            <h2 className="guide-display mt-2 text-3xl font-semibold text-zinc-950 sm:text-4xl">More about selling safely.</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">
              The sections above explain the selling workflow. The information below covers security, settlement protection,
              marketplace terms, and practical next steps.
            </p>
          </div>

          <div className="mt-7 border border-zinc-200 bg-white">
            <div className="grid gap-4 border-b border-zinc-200 p-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-sm font-extrabold text-zinc-950">Account security</p>
              </div>
              <p className="text-sm leading-6 text-zinc-600">
                BuyMesho provides password-based sign-in plus available email verification, passkeys, authenticator-app
                two-factor authentication, and session controls in account security settings.
              </p>
            </div>
            <div className="grid gap-4 border-b border-zinc-200 p-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6">
              <div className="flex items-start gap-2">
                <WalletCards className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p className="text-sm font-extrabold text-zinc-950">Settlement protection</p>
              </div>
              <p className="text-sm leading-6 text-zinc-600">
                Seller payout is not simply a button that turns a paid order into cash. Escrow release, payout eligibility,
                a verified destination, payout calculation, provider processing, and payout status all form part of the settlement flow.
              </p>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:p-6">
              <div className="flex items-start gap-2">
                <Package className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700" />
                <p className="text-sm font-extrabold text-zinc-950">Continue</p>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <a href="/become-seller" className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
                  Apply to become a seller
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </a>
                <a href="/explore/sellers" className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
                  View Sellers on BuyMesho
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </a>
                <a href="/buy-online-malawi" className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg">
                  Looking to buy instead?
                  <ArrowRight className="h-4 w-4 text-blue-600" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-zinc-500">Need the marketplace?</p>
              <h2 className="guide-display mt-2 text-2xl font-semibold text-zinc-950 sm:text-3xl">Go back to BuyMesho listings.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Use the marketplace to search, compare, inspect sellers, and see what other sellers are offering.
              </p>
            </div>
            <a
              href={EXPLORE_PATH}
              className="group inline-flex shrink-0 items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg"
            >
              Open Market
              <ArrowRight className="h-4 w-4 text-blue-600" />
            </a>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
