import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardList, QrCode, ShieldCheck, WalletCards } from "lucide-react";
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
} from "./lib/appNavigation.paths";

const guideSections = [
  { id: "access", number: "01", label: "Event creator access" },
  { id: "create", number: "02", label: "Create your event" },
  { id: "tickets", number: "03", label: "Set up tickets" },
  { id: "payout", number: "04", label: "Set up payout" },
  { id: "publish", number: "05", label: "Publish & manage" },
  { id: "track", number: "06", label: "Track the event" },
  { id: "money", number: "07", label: "Payments & payouts" },
  { id: "tickets-validation", number: "08", label: "Tickets & validation" },
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
              This guide explains how event creators move from access and event setup to ticket sales,
              payment records, event validation, and creator payouts.
            </p>
          </div>

          <nav aria-label="Event creator guide sections" className="mt-9 border-y border-zinc-200">
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
                <h2 className="guide-display text-xl font-semibold text-zinc-950 sm:text-2xl">The complete creator path</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Get event creator access → create the event → configure tickets → verify a payout destination for paid events →
                  publish → manage sales and activity → validate tickets → receive the event payout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <GuideSection id="access" number="01" eyebrow="Event creator access" title="Start with a BuyMesho account and event creator access.">
          <p>
            Event creation is an authenticated workflow. BuyMesho checks whether the signed-in account has active event creator access before allowing event management actions.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Already approved" tone="blue">
              Open the event creation or management route and continue into the creator workspace.
            </FlowRow>
            <FlowRow title="No active creator access">
              The event creation flow loads the creator onboarding form so the account can submit the required creator information before creating events.
            </FlowRow>
          </div>

          <p>
            The onboarding form currently asks for a display name, organization name and type, WhatsApp contact, the event types you plan to run, and a reason for requesting event-creator access. The creator record then carries the account's status and active-until date. Event creator access is distinct from marketplace seller access.
          </p>

          <GuideLink href={EVENTS_CREATE_PATH}>Open event creation</GuideLink>
        </GuideSection>

        <GuideSection id="create" number="02" eyebrow="Event setup" title="Create the public event record before you publish it.">
          <p>
            The event form is built around the information a buyer needs to understand what is happening, where it is happening, and what ticket they are buying.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowRow title="Event basics">Choose the event type and provide the event title and organizer name.</FlowRow>
            <FlowRow title="Date & time">Set the event date, start time, and optional end time.</FlowRow>
            <FlowRow title="Location">Provide the venue and location shown to the public.</FlowRow>
            <FlowRow title="Tickets">Set the ticket mode and, for paid events, the ticket price.</FlowRow>
            <FlowRow title="Description">Give buyers the information they need to understand the event.</FlowRow>
            <FlowRow title="Poster">Add the event poster information used for the public event page.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              You can also configure the publication mode. BuyMesho supports immediate publication and scheduled publication for events.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="tickets" number="03" eyebrow="Ticket setup" title="Define what buyers are actually purchasing.">
          <p>
            An event ticket is a distinct transaction type in BuyMesho. The event checkout flow records the event ID, ticket information, quantity, and ticket-holder details so the resulting ticket can be projected into the buyer's ticket library.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Free event" tone="blue">
              A zero or absent ticket price does not require an event payout destination.
            </FlowRow>
            <FlowRow title="Paid event">
              A paid event requires a verified payout destination before it can be published or managed as a paid event.
            </FlowRow>
          </div>

          <p>
            Ticket-holder information currently includes a full name, email address, and phone number. This information is associated with the purchased ticket and is used in ticket records and event-ticket communications.
          </p>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              Keep the public ticket wording clear. The buyer's ticket should be identifiable by its event, ticket type, holder, and ticket ID.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="payout" number="04" eyebrow="Payout destination" title="Paid events need a verified destination before ticket sales can settle.">
          <p>
            Event creators use the shared BuyMesho payout-destination infrastructure. A payout destination is created under the event creator's identity, verified, and then bound to the specific event.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Owned by the creator" tone="blue">
              The payout destination must belong to the authenticated event creator.
            </FlowRow>
            <FlowRow title="Active & verified">
              Only an active, verified destination can be selected for a paid event.
            </FlowRow>
            <FlowRow title="Bound to the event">
              The event stores the selected destination reference, so later event settlement uses that event-bound destination.
            </FlowRow>
            <FlowRow title="Protected after payment setup">
              The payout architecture protects the event's financial identity and destination relationship instead of silently switching to another account.
            </FlowRow>
          </div>

          <p>
            Supported payout destinations use the existing normalized bank or mobile-money destination system. The underlying account details are protected and the creator-facing views use masked destination information.
          </p>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <WalletCards className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              A payout destination problem should be corrected through the creator's payout-destination flow rather than by attaching an unrelated destination to the event.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="publish" number="05" eyebrow="Publishing & management" title="Publish the event, then manage its public state from the creator workspace.">
          <p>
            BuyMesho keeps event publication state separate from the creator workspace itself. The current event lifecycle supports draft, published, paused, and cancelled publication states, plus immediate or scheduled publication.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Draft">Keep an event unpublished while you finish its details.</FlowRow>
            <FlowRow title="Published" tone="blue">Make the event available in the public events directory when its publication conditions are satisfied.</FlowRow>
            <FlowRow title="Paused">Temporarily remove the event from normal public availability without deleting the creator's event record.</FlowRow>
            <FlowRow title="Cancelled" tone="red">Cancel an event when it should no longer operate as planned. Existing ticket holders can receive cancellation notifications through the event administration flow.</FlowRow>
          </div>

          <p>
            The creator manager lets you search your events, filter by status, open one event at a time, edit it, change publication/runtime state, view the public event, or cancel it.
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <GuideLink href={EVENTS_MANAGE_PATH}>Open Manage Events</GuideLink>
            <GuideLink href={EVENTS_DASHBOARD_PATH}>Open creator dashboard</GuideLink>
          </div>
        </GuideSection>

        <GuideSection id="track" number="06" eyebrow="Event performance" title="Use the creator workspace to see what is happening with each event.">
          <p>
            The event creator workspace combines event-level activity with ticket and financial summaries so you can inspect more than just the publication status.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowRow title="Tickets sold">See the number of tickets sold from paid orders.</FlowRow>
            <FlowRow title="Gross revenue">See the gross value generated by the event's ticket sales.</FlowRow>
            <FlowRow title="Net revenue">See the creator-facing net revenue summary after the configured financial calculation.</FlowRow>
            <FlowRow title="Purchase activity">Review purchase count and the most recent sale information.</FlowRow>
            <FlowRow title="Pending issues">See whether event activity has outstanding issues requiring attention.</FlowRow>
            <FlowRow title="Event activity">Use the creator workspace to follow activity around the event and its public presence.</FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-zinc-700" />
            <p className="text-sm leading-6 text-zinc-600">
              The current dashboard also keeps event financial identity tied to the event itself, which makes historical reporting attributable to the correct creator and event.
            </p>
          </div>
        </GuideSection>

        <GuideSection id="money" number="07" eyebrow="Payments, fees & payouts" title="Event ticket sales settle through the event payout flow, not Listings escrow.">
          <p>
            Event payments are intentionally separate from marketplace Listings settlement. After a successful ticket payment is verified, BuyMesho identifies the event, validates the event creator and bound payout destination, calculates the event payout, and creates the event payout candidate.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Payment verification" tone="blue">
              The payment must be successfully verified before event settlement begins.
            </FlowRow>
            <FlowRow title="Event financial identity">
              The payout records the event ID, event creator, payout destination account, and financial formula snapshot.
            </FlowRow>
            <FlowRow title="Fees">
              The event payout calculation keeps BuyMesho commission, processing fees, payout-destination fees, reserves, and adjustments as distinct financial components.
            </FlowRow>
            <FlowRow title="Provider submission">
              The resulting event payout is submitted through the shared PayChangu payout execution infrastructure. Provider response and retry behavior remain authoritative.
            </FlowRow>
          </div>

          <div className="border-l-2 border-blue-600 pl-4 text-sm text-zinc-600">
            <strong className="text-zinc-900">Important:</strong> an event payout is not an escrow release. The current event architecture uses direct ticket-payment-to-payout settlement after payment verification.
          </div>
        </GuideSection>

        <GuideSection id="tickets-validation" number="08" eyebrow="Tickets & validation" title="A paid ticket is not finished when the money moves. It also has to work at the door.">
          <p>
            Successful event payments are projected into the event-ticket system. The resulting ticket carries the event, holder, ticket type, ticket ID, purchase date, venue, location, and validation state.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <FlowRow title="Buyer ticket library" tone="blue">
              Buyers can open their Tickets area, inspect a ticket, and download a PDF copy.
            </FlowRow>
            <FlowRow title="Validator states">
              Ticket records support states such as Waiting Entry, Inside, Outside, Cancelled, Refunded, and Blocked.
            </FlowRow>
            <FlowRow title="Ticket validation">
              The validator projection is updated from the authoritative order/ticket state while preserving active entry states when appropriate.
            </FlowRow>
            <FlowRow title="Problems">
              A cancelled, refunded, or blocked ticket should not be treated as a normal entry ticket.
            </FlowRow>
          </div>

          <div className="flex items-start gap-3 border-t border-zinc-200 pt-5">
            <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <p className="text-sm leading-6 text-zinc-600">
              Ticket Validator access is tied to approved event-creator access, and the current authentication flow can require a fresh authenticator-app 2FA verification before Validator access is granted.
            </p>
          </div>

          <div className="border-l-2 border-blue-600 pl-4 text-sm text-zinc-600">
            <strong className="text-zinc-900">Operational rule:</strong> the ticket sold by the event should be the same ticket the validator can recognize when the holder arrives.
          </div>
        </GuideSection>

        <section className="border-t border-zinc-200 py-12 sm:py-16">
          <div className="max-w-5xl">
            <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f] sm:text-base">Creator responsibilities</p>
            <h2 className="guide-display mt-2 text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-zinc-950 sm:text-5xl">
              Keep the event information, payout destination, and ticket experience aligned.
            </h2>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <FlowRow title="Event information">
                Keep the public event date, time, venue, location, ticket details, and description accurate.
              </FlowRow>
              <FlowRow title="Payout destination">
                Keep the event's bound payout destination active and verified, and use the supported destination controls when it needs attention.
              </FlowRow>
              <FlowRow title="Buyer communication">
                Respond to event-related questions and keep operational information consistent with the published event.
              </FlowRow>
              <FlowRow title="Ticket operations">
                Make sure the person validating tickets has the event's operational ticket information and understands the expected validator states.
              </FlowRow>
            </div>
          </div>
        </section>

        <section className="border-t border-zinc-200 py-10 sm:py-12">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-[#74152f]">Continue with events</p>
              <div className="mt-3 flex flex-col items-start gap-1">
                <GuideLink href={EVENTS_CREATE_PATH}>Create or continue an event</GuideLink>
                <GuideLink href={EVENTS_MANAGE_PATH}>Manage your events</GuideLink>
                <GuideLink href={EVENT_BUYER_GUIDE_PATH}>Buying event tickets?</GuideLink>
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
