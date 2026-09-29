import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, FileText, QrCode, Ticket, WalletCards } from "lucide-react";
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
  { id: "find", number: "01", label: "Find an event" },
  { id: "ticket", number: "02", label: "Choose a ticket" },
  { id: "checkout", number: "03", label: "Checkout & payment" },
  { id: "confirm", number: "04", label: "Payment confirmation" },
  { id: "receive", number: "05", label: "Get your ticket" },
  { id: "validate", number: "06", label: "Arrive & validate" },
  { id: "problems", number: "07", label: "Problems & cancellations" },
  { id: "safe", number: "08", label: "Keep your ticket safe" },
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

function GuideLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2 py-2 text-base font-extrabold text-[#74152f] hover:text-[#560d22] sm:text-lg"
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
              This guide explains what happens from finding an event to choosing a ticket, paying, receiving the ticket,
              and getting through event validation.
            </p>
          </div>

          <nav aria-label="Event buyer guide sections" className="mt-9 border-y border-zinc-200">
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
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-950" />
              <div>
                <h2 className="guide-display text-xl font-semibold text-zinc-950 sm:text-2xl">The complete ticket path</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Find an event → choose a ticket → enter ticket-holder information → start payment → payment verification →
                  ticket creation → ticket library → event validation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <GuideSection id="find" number="01" eyebrow="Event discovery" title="Start from the public events directory and inspect the event details.">
          <p>
            BuyMesho publishes public events through the Events directory. Open an event before buying so you can review the information supplied by the organizer.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowRow title="Event type">See the event category or type shown on the public event listing.</FlowRow>
            <FlowRow title="Date & time">Check the event date, start time, and any available end time.</FlowRow>
            <FlowRow title="Venue & location">Review where the event is taking place before committing to a ticket.</FlowRow>
            <FlowRow title="Organizer">Check the organizer name and the event information they have published.</FlowRow>
            <FlowRow title="Ticket price" tone="blue">See whether the event is free or has a ticket price.</FlowRow>
            <FlowRow title="Event description">Read the published description for the event-specific information.</FlowRow>
          </div>

          <GuideLink href={EVENTS_PATH}>Browse BuyMesho events</GuideLink>
        </GuideSection>

        <GuideSection id="ticket" number="02" eyebrow="Ticket selection" title="Choose the ticket you are actually purchasing and identify the holder.">
          <p>
            Event checkout can carry a ticket quantity and ticket-holder details. The current ticket-holder form uses a full name, email address, and phone number.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Ticket type" tone="blue">
              Review the ticket type attached to the event before continuing.
            </FlowRow>
            <FlowRow title="Quantity">
              Choose how many tickets you need where the event allows more than one.
            </FlowRow>
            <FlowRow title="Ticket holder">
              Enter the full name, email, and phone number for the person who will use the ticket.
            </FlowRow>
            <FlowRow title="Order scope">
              Event ticket checkout is intentionally separated from marketplace listing checkout; a single event-ticket checkout is not a Listings escrow purchase.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              The holder information becomes part of the ticket record used later for ticket delivery and event operations.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="checkout" number="03" eyebrow="Checkout & payment" title="Complete the event checkout, then continue to the payment provider.">
          <p>
            The event checkout flow sends the selected event ticket, quantity, ticket-holder information, payment method, and return URL into BuyMesho's payment process.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Payment method" tone="blue">
              The current event flow uses mobile-money payment through the BuyMesho payment integration.
            </FlowRow>
            <FlowRow title="Direct settlement route">
              Event-only checkout uses the direct settlement route rather than the Listings escrow route.
            </FlowRow>
            <FlowRow title="Payment page">
              BuyMesho redirects you to the payment gateway to authorize the transaction.
            </FlowRow>
            <FlowRow title="Keep your reference">
              Keep the payment or transaction reference until the ticket has been confirmed and appears in your Tickets area.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Event ticket checkout is not the same as buying a marketplace listing: do not expect an event ticket to enter the Listings delivery-and-escrow lifecycle.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="confirm" number="04" eyebrow="Payment confirmation" title="A payment must be verified before BuyMesho treats the event purchase as complete.">
          <p>
            After the payment provider returns you to BuyMesho, the payment-return flow reads the transaction reference and checks payment status server-side.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Successful payment" tone="blue">
              A verified or captured payment is marked as completed in the buyer payment state and the event ticket quantity is removed from the buyer's event cart.
            </FlowRow>
            <FlowRow title="Pending or unclear">
              BuyMesho polls for confirmation for a limited number of attempts. A transaction is not treated as paid merely because the browser returned from the payment page.
            </FlowRow>
            <FlowRow title="Failed or cancelled" tone="red">
              A failed, cancelled, expired, or unsuccessful payment does not follow the successful-ticket path.
            </FlowRow>
            <FlowRow title="Order flow">
              Once the order reference is resolved, BuyMesho identifies the event flow and routes the buyer to the appropriate tracking/ticket destination.
            </FlowRow>
          </div>

          <GuideLink href={TICKETS_PATH}>Open My Tickets</GuideLink>
        </GuideSection>

        <GuideSection id="receive" number="05" eyebrow="Ticket delivery" title="The ticket becomes a usable digital record, not just a payment receipt.">
          <p>
            After successful payment, BuyMesho projects the event ticket into the buyer-facing ticket system. Each ticket can be opened from the Tickets area and downloaded as a PDF.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowRow title="Ticket ID">The ticket has a distinct ticket identifier used by the ticket system and validator.</FlowRow>
            <FlowRow title="Holder">The ticket stores the holder name, email, and phone information supplied at checkout.</FlowRow>
            <FlowRow title="Event details">The ticket carries the event title, date, time, venue, and location.</FlowRow>
            <FlowRow title="Status" tone="blue">The buyer-facing ticket state can be Paid, Pending, Rejected, or Error while the purchase is being represented.</FlowRow>
            <FlowRow title="PDF">A purchased ticket can be downloaded as a PDF from the ticket library.</FlowRow>
            <FlowRow title="Support">A ticket can be opened from its ticket ID for tracking and support actions.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Save the ticket PDF and keep the ticket ID accessible. The ticket is the record you will use for event entry.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="validate" number="06" eyebrow="Arrival & validation" title="At the event, the ticket moves from purchase record to entry record.">
          <p>
            BuyMesho's event ticket projection supports operational validation states. A ticket can begin as Waiting Entry and then move through entry states as the holder is checked.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Waiting Entry" tone="blue">The ticket exists and is waiting to be validated at the event.</FlowRow>
            <FlowRow title="Inside">The ticket has been accepted for entry.</FlowRow>
            <FlowRow title="Outside">The validator records that the holder is no longer inside or the ticket has otherwise left the active entry state.</FlowRow>
            <FlowRow title="Cancelled / Refunded / Blocked" tone="red">These states should not be treated as a normal entry pass.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              The exact validation method is operated by the event's validator workflow. Present the ticket ID or ticket representation required by the event team and keep the ticket available until entry is complete.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="problems" number="07" eyebrow="Problems, cancellations & refunds" title="Use the correct support path when something goes wrong.">
          <p>
            Event tickets have their own operational states, but payment and event-order problems still need to be handled through BuyMesho's support and dispute workflow.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Payment problem" tone="red">
              A payment that failed, was cancelled, or could not be verified should not be treated as a paid ticket purchase.
            </FlowRow>
            <FlowRow title="Event cancellation" tone="blue">
              BuyMesho's event administration supports cancellation notifications to affected ticket holders.
            </FlowRow>
            <FlowRow title="Ticket issue">
              Keep the ticket ID and order/payment reference when contacting support so the transaction can be located.
            </FlowRow>
            <FlowRow title="Refund request">
              The applicable refund/dispute workflow depends on the transaction state and the controls available for the event order. Do not assume that every problem produces an automatic refund.
            </FlowRow>
          </div>

          <GuideLink href={REPORT_PATH}>Report a problem</GuideLink>
        </GuideSection>

        <GuideSection id="safe" number="08" eyebrow="Ticket safety" title="Keep the ticket and its identifying information under your control.">
          <p>
            Treat your event ticket like a digital entry credential. Keep the PDF, ticket ID, and payment reference available and avoid altering the ticket information.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Keep the ticket">Store the PDF somewhere you can access when you reach the venue.</FlowRow>
            <FlowRow title="Keep the reference">Retain the payment/order reference in case support needs to locate the transaction.</FlowRow>
            <FlowRow title="Use the correct holder">Make sure the ticket-holder information is accurate before the payment is completed.</FlowRow>
            <FlowRow title="Do not assume transferability">
              The current ticket records are built around a named holder. Check the event's own instructions before assuming a ticket can be transferred to another person.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Keep your account secure and use the official BuyMesho ticket/payment routes when checking your event purchase.
            </p>
          </div>
        </GuideSection>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Continue with events</p>
              <div className="mt-3 flex flex-col items-start gap-1">
                <GuideLink href={EVENTS_PATH}>Browse events</GuideLink>
                <GuideLink href={EVENT_CREATOR_GUIDE_PATH}>Want to create an event?</GuideLink>
                <GuideLink href={TICKETS_PATH}>Open My Tickets</GuideLink>
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Other BuyMesho guides</p>
              <div className="mt-3 flex flex-col items-start gap-1">
                <GuideLink href={BUY_ONLINE_MALAWI_PATH}>Buying marketplace products</GuideLink>
                <GuideLink href={SELL_ONLINE_MALAWI_PATH}>Selling marketplace products</GuideLink>
                <GuideLink href={EXPLORE_PATH}>Open the marketplace</GuideLink>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Need the marketplace?</p>
              <h2 className="guide-display mt-2 text-3xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-4xl">
                Go back to BuyMesho events.
              </h2>
            </div>
            <GuideLink href={EVENTS_PATH}>Open Events</GuideLink>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
