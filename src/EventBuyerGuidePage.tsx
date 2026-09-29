import { ArrowRight, BookOpen, FileText, QrCode, ShieldCheck, Ticket, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import {
  EVENT_CREATOR_GUIDE_PATH,
  EVENTS_PATH,
  EXPLORE_PATH,
  BUY_ONLINE_MALAWI_PATH,
  SELL_ONLINE_MALAWI_PATH,
  TICKETS_PATH,
  REPORT_PATH,
} from "./lib/appNavigation.paths";

const guideSections = [
  { id: "discover", number: "01", label: "Find & choose" },
  { id: "pay", number: "02", label: "Pay for your ticket" },
  { id: "ticket", number: "03", label: "Get your ticket" },
  { id: "enter", number: "04", label: "Arrive & enter" },
  { id: "problems", number: "05", label: "Problems & refunds" },
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
  children: ReactNode;
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

function FlowRow({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
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

function GuideLink({
  href,
  children,
  tone = "burgundy",
}: {
  href: string;
  children: ReactNode;
  tone?: "burgundy" | "dark";
}) {
  const toneClasses = tone === "dark" ? "text-zinc-950 hover:text-zinc-700" : "text-[#74152f] hover:text-[#560d22]";

  return (
    <a
      href={href}
      className={`group inline-flex items-center gap-2 py-2 text-base font-extrabold ${toneClasses} sm:text-lg`}
    >
      {children}
      <ArrowRight className="h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
    </a>
  );
}

export default function EventBuyerGuidePage() {
  return (
    <div className="guide-page min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href={EXPLORE_PATH} aria-label="Open BuyMesho marketplace">
            <BrandMark subtitle="Event ticket guide" />
          </a>
          <a
            href={EVENTS_PATH}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Browse Events
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <section className="py-10 sm:py-14 lg:py-16">
          <div className="mx-auto max-w-4xl px-1 text-center sm:px-0">
            <BookOpen className="mx-auto h-14 w-14 text-[#74152f] sm:h-16 sm:w-16 lg:h-20 lg:w-20" strokeWidth={1.8} aria-hidden="true" />
            <div className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#74152f] sm:text-base">
              BuyMesho Event Ticket Guide
            </div>
            <h1 className="guide-display mx-auto mt-4 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-zinc-950 sm:text-6xl lg:text-7xl">
              Buying an event ticket on BuyMesho, step by step.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              Everything you need to know from finding an event and paying for a ticket to receiving it and entering the event.
            </p>
          </div>

          <nav aria-label="Event buyer guide sections" className="mt-9 border-y border-zinc-200">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5">
              {guideSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex min-h-16 items-center gap-4 border-b border-zinc-200 px-1 py-4 text-base font-bold text-zinc-800 transition-colors hover:text-blue-700 sm:min-h-20 sm:border-r sm:px-4 sm:[&:nth-child(even)]:border-r-0 lg:border-b-0 lg:[&:nth-child(5n)]:border-r-0"
                >
                  <span className="guide-chapter-number text-2xl sm:text-3xl">{section.number}</span>
                  <span>{section.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </nav>
        </section>

        <GuideSection id="discover" number="01" eyebrow="Find & choose" title="Find an event, check the details, and choose your ticket.">
          <p>
            Start from the public Events directory. Open the event you are interested in and review the information before you buy.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowRow title="Event details">Check the event date, time, venue, location, organizer, and description.</FlowRow>
            <FlowRow title="Ticket option" tone="blue">Review the ticket option and price shown for the event before continuing.</FlowRow>
            <FlowRow title="Quantity">Choose how many tickets you need where more than one ticket is available.</FlowRow>
            <FlowRow title="Ticket holder">Enter the full name, email, and phone number for the person who will use the ticket.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              Check the event information carefully before moving on to payment.
            </p>
          </div>

          <GuideLink href={EVENTS_PATH}>Browse BuyMesho events</GuideLink>
        </GuideSection>

        <GuideSection id="pay" number="02" eyebrow="Checkout & payment" title="Pay for your ticket and wait for confirmation.">
          <p>
            Enter the required ticket details, choose the available payment method, and continue to the payment page to authorize your purchase.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Payment method" tone="blue">
              The current event checkout uses mobile-money payment through BuyMesho's payment integration.
            </FlowRow>
            <FlowRow title="Payment checkout">
              Follow the payment provider's instructions and complete the payment before returning to BuyMesho.
            </FlowRow>
            <FlowRow title="Confirmation">
              Your ticket purchase is only complete after the payment has been successfully confirmed.
            </FlowRow>
            <FlowRow title="Keep your reference">
              Keep your payment or order reference until your ticket appears in My Tickets.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              A payment page returning to BuyMesho does not by itself mean the purchase is complete. Wait for the confirmation result.
            </p>
          </div>

          <GuideLink href={TICKETS_PATH} tone="dark">Open My Tickets</GuideLink>
        </GuideSection>

        <GuideSection id="ticket" number="03" eyebrow="Your ticket" title="Get your ticket and keep it ready.">
          <p>
            After a successful payment, your event ticket appears in My Tickets. Open it to review the ticket information and download the PDF copy.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FlowRow title="Ticket details">Check the event, date, time, venue, location, and ticket holder information.</FlowRow>
            <FlowRow title="Ticket ID" tone="blue">Keep the ticket ID available in case you need help with the purchase or entry.</FlowRow>
            <FlowRow title="PDF">Download the ticket PDF and keep it somewhere you can access at the event.</FlowRow>
            <FlowRow title="Keep it safe">Do not alter the ticket information, and do not assume the ticket can be transferred unless the event says so.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Your ticket is the document you should have ready when you arrive at the venue.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="enter" number="04" eyebrow="At the event" title="Arrive with your ticket ready for entry.">
          <p>
            When you arrive, present the ticket required by the event team. The ticket is checked before you are admitted.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Have it ready" tone="blue">Keep the ticket PDF or the required ticket representation easy to access.</FlowRow>
            <FlowRow title="Ticket check">The event team checks the ticket before allowing entry.</FlowRow>
            <FlowRow title="Follow event instructions">Use the entry process provided by the organizer and event team.</FlowRow>
            <FlowRow title="Keep the ticket available">Keep the ticket accessible until you have completed entry.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              The exact ticket-checking method can vary by event, so follow the instructions provided for that event.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="problems" number="05" eyebrow="Problems, cancellations & refunds" title="Know what to do when something goes wrong.">
          <p>
            Keep your ticket and payment details available when you need help. The right next step depends on what happened to the payment, ticket, or event.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Payment problem" tone="red">
              A failed, cancelled, or unconfirmed payment should not be treated as a completed ticket purchase.
            </FlowRow>
            <FlowRow title="Event cancellation" tone="blue">
              BuyMesho can provide cancellation notifications to affected ticket holders when an event is cancelled.
            </FlowRow>
            <FlowRow title="Ticket issue">
              Keep the ticket ID and payment or order reference when contacting support.
            </FlowRow>
            <FlowRow title="Refunds">
              Refunds depend on the circumstances of the payment or event. Contact support with your ticket and payment details.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Use the official BuyMesho ticket and payment routes when checking your purchase or asking for help.
            </p>
          </div>

          <GuideLink href={REPORT_PATH}>Report a problem</GuideLink>
        </GuideSection>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Continue with events</p>
              <div className="mt-3 flex flex-col items-start gap-1">
                <GuideLink href={EVENTS_PATH} tone="dark">Browse events</GuideLink>
                <GuideLink href={EVENT_CREATOR_GUIDE_PATH} tone="dark">Want to create an event?</GuideLink>
                <GuideLink href={TICKETS_PATH} tone="dark">Open My Tickets</GuideLink>
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Other BuyMesho guides</p>
              <div className="mt-3 flex flex-col items-start gap-1">
                <GuideLink href={BUY_ONLINE_MALAWI_PATH} tone="dark">Buying marketplace products</GuideLink>
                <GuideLink href={SELL_ONLINE_MALAWI_PATH} tone="dark">Selling marketplace products</GuideLink>
                <GuideLink href={EXPLORE_PATH} tone="dark">Open the marketplace</GuideLink>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Ready for more events?</p>
              <h2 className="guide-display mt-2 text-3xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-4xl">
                Explore BuyMesho events.
              </h2>
            </div>
            <GuideLink href={EVENTS_PATH} tone="dark">Browse Events</GuideLink>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
