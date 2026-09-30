import { ArrowRight, BookOpen, CalendarDays, QrCode, WalletCards } from "lucide-react";
import type { ReactNode } from "react";

import AppFooter from "./components/AppFooter";
import BrandMark from "./components/BrandMark";
import {
  EVENT_BUYER_GUIDE_PATH,
  EVENTS_CREATE_PATH,
  EVENTS_DASHBOARD_PATH,
  EVENTS_MANAGE_PATH,
  EVENTS_PATH,
  EXPLORE_PATH,
  BUY_ONLINE_MALAWI_PATH,
  SELL_ONLINE_MALAWI_PATH,
  TICKET_VALIDATOR_URL,
} from "./lib/appNavigation.paths";

const guideSections = [
  { id: "access", number: "01", label: "Get creator access" },
  { id: "setup", number: "02", label: "Create & set up" },
  { id: "payout", number: "03", label: "Set up your payout" },
  { id: "manage", number: "04", label: "Publish & manage" },
  { id: "sales", number: "05", label: "Sales & payouts" },
  { id: "tickets", number: "06", label: "Tickets & entry" },
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

export default function EventCreatorGuidePage() {
  return (
    <div className="guide-page min-h-screen bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href={EXPLORE_PATH} aria-label="Open BuyMesho marketplace">
            <BrandMark subtitle="Event creator guide" />
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
              BuyMesho Event Creator Guide
            </div>
            <h1 className="guide-display mx-auto mt-4 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-zinc-950 sm:text-6xl lg:text-7xl">
              Creating events on BuyMesho, step by step.
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-zinc-700 sm:text-lg">
              Everything you need to go from creator access and event setup to ticket sales, payouts, and entry.
            </p>
          </div>

          <nav aria-label="Event creator guide sections" className="mt-9 border-y border-zinc-200">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3">
              {guideSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex min-h-16 items-center gap-4 border-b border-zinc-200 px-1 py-4 text-base font-bold text-zinc-800 transition-colors hover:text-blue-700 sm:min-h-20 sm:border-r sm:px-4 sm:text-lg sm:[&:nth-child(even)]:border-r-0 lg:border-b-0 lg:[&:nth-child(3n)]:border-r-0"
                >
                  <span className="guide-chapter-number text-2xl sm:text-3xl">{section.number}</span>
                  <span>{section.label}</span>
                  <ArrowRight className="ml-auto h-4 w-4 text-blue-600 transition-transform group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </nav>
        </section>

        <GuideSection id="access" number="01" eyebrow="Getting started" title="Get access to event creation.">
          <p>
            Sign in to BuyMesho and request event creator access before you create your first event.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Request access" tone="blue">
              Provide your display name, organization details, WhatsApp contact, the kinds of events you plan to run, and why you want to publish events.
            </FlowRow>
            <FlowRow title="Once access is available">
              Open the event creation tools and start setting up your event.
            </FlowRow>
          </div>

          <p>
            Event creator access is separate from marketplace seller access.
          </p>

          <GuideLink href={EVENTS_CREATE_PATH}>Open event creation</GuideLink>
        </GuideSection>

        <GuideSection id="setup" number="02" eyebrow="Event setup" title="Create the event and set up what buyers will see.">
          <p>
            Add the information buyers need to understand your event and decide whether they want to attend.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowRow title="Event details">Add the event type, title, organizer, date, time, venue, and location.</FlowRow>
            <FlowRow title="Description">Explain the event clearly so buyers know what to expect.</FlowRow>
            <FlowRow title="Poster">Add the event poster for the public event page.</FlowRow>
            <FlowRow title="Tickets" tone="blue">Choose the ticket mode and set the ticket price for a paid event.</FlowRow>
            <FlowRow title="Free or paid">Free events do not need a payout destination. Paid events do.</FlowRow>
            <FlowRow title="Publication">Choose to publish immediately or schedule publication for later.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              Before publishing, review the event information the way a buyer would see it.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="payout" number="03" eyebrow="Payout" title="Set up where you will receive money from paid tickets.">
          <p>
            Paid events need a verified payout destination before ticket sales can be published.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Choose a destination" tone="blue">
              Use a supported bank or mobile-money payout destination registered to you.
            </FlowRow>
            <FlowRow title="Verify it">
              The destination must be active and verified before it can be used for a paid event.
            </FlowRow>
            <FlowRow title="Use it for the event">
              Select the payout destination for the event so ticket-sale earnings can be sent through the event payout process.
            </FlowRow>
            <FlowRow title="Keep it active">
              Check the payout destination if you make changes to your payment details or notice a payout problem.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Keep your payout destination details up to date before you start selling tickets.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="manage" number="04" eyebrow="Publish & manage" title="Publish the event, then keep it up to date.">
          <p>
            You can keep an event as a draft, publish it, schedule it for later, pause it, or cancel it as circumstances change.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Draft">Keep working on the event before making it public.</FlowRow>
            <FlowRow title="Published" tone="blue">Make the event available to buyers when you are ready.</FlowRow>
            <FlowRow title="Pause or cancel">Temporarily stop the event or cancel it when necessary.</FlowRow>
            <FlowRow title="Keep it accurate">Update dates, times, venue, ticket details, and descriptions when something changes.</FlowRow>
          </div>

          <p>
            The creator workspace also lets you review your events, open an event, edit it, change its public state, view it as a buyer, and see ticket sales and revenue information.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <GuideLink href={EVENTS_MANAGE_PATH}>Manage your events</GuideLink>
            <GuideLink href={EVENTS_DASHBOARD_PATH}>Open creator dashboard</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="sales" number="05" eyebrow="Sales & payouts" title="Understand what happens after buyers pay.">
          <p>
            Event ticket sales use the event payout process, separate from the marketplace product escrow process. Once a ticket payment is successfully confirmed, the sale becomes eligible for payout processing.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Payment confirmation" tone="blue">
              A ticket payment must be successfully confirmed before it moves into payout processing.
            </FlowRow>
            <FlowRow title="Your sales">
              Use the creator workspace to follow tickets sold, gross revenue, net revenue, and recent purchase activity.
            </FlowRow>
            <FlowRow title="Fees">
              Applicable fees and other adjustments are accounted for before your final payout amount is calculated.
            </FlowRow>
            <FlowRow title="Payout status">
              Payout timing can vary, and the status is updated as the payout is processed.
            </FlowRow>
          </div>

          <div className="border-l-2 border-blue-600 pl-4 text-sm text-zinc-600">
            Event ticket money follows the event payout process; it is not released as a marketplace Listings escrow payment.
          </div>
        </GuideSection>

        <GuideSection id="tickets" number="06" eyebrow="Tickets & entry" title="Make sure the tickets you sell can be used at the door.">
          <p>
            Once a ticket purchase is completed, the buyer receives a ticket that can be opened, downloaded, and checked at the event.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Buyer tickets" tone="blue">
              Buyers can open My Tickets and download a PDF copy of their ticket.
            </FlowRow>
            <FlowRow title="Ticket checking">
              Your event team checks the ticket before admitting the holder.
            </FlowRow>
            <FlowRow title="Cancelled or refunded">
              A cancelled, refunded, or blocked ticket should not be treated as a normal entry ticket.
            </FlowRow>
            <FlowRow title="Event entry">
              Make sure the people handling entry have the access and ticket information they need.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              Use the event's ticket validation tools to check tickets as people arrive.
            </p>
          </div>
        </GuideSection>

        <section className="py-10 sm:py-12">
          <div className="border border-zinc-200 bg-white/45 p-5 sm:p-7">
            <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Continue with events</p>
                <div className="mt-3 flex flex-col items-start gap-1">
                  <GuideLink href={EVENTS_CREATE_PATH} tone="dark">Create or continue an event</GuideLink>
                  <GuideLink href={EVENTS_MANAGE_PATH} tone="dark">Manage your events</GuideLink>
                  <GuideLink href={EVENT_BUYER_GUIDE_PATH} tone="dark">Buying event tickets?</GuideLink>
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
          </div>
        </section>

        <section className="pb-10 sm:pb-12">
          <div className="flex flex-col gap-5 rounded-[2rem] border border-green-200 bg-green-50/70 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-white shadow-sm">
                <QrCode className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-green-700">Ticket entry</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">Need to validate tickets?</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-700">Use Ticket Validator to check event tickets at entry.</p>
              </div>
            </div>
            <a
              href={TICKET_VALIDATOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-green-700"
            >
              Open Ticket Validator
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

      </main>

      <AppFooter />
    </div>
  );
}
