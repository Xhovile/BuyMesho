import React from "react";
import { AlertTriangle, ShieldCheck, MapPin, MessageSquareWarning, Wallet, Eye } from "lucide-react";

const tips = [
  {
    icon: ShieldCheck,
    title: "Verify before you trust",
    body: "Review the seller profile, listing quality, campus relevance, and any visible trust signals before making contact or committing to a deal.",
  },
  {
    icon: MapPin,
    title: "Meet in safer public places",
    body: "For physical handovers, choose visible and familiar locations such as busy campus areas during daytime rather than isolated places.",
  },
  {
    icon: Wallet,
    title: "Avoid risky advance payments",
    body: "Do not send money first unless the seller has been properly verified and you are comfortable with the risk. Extra caution is necessary where the deal moves quickly off-platform.",
  },
  {
    icon: Eye,
    title: "Inspect the item properly",
    body: "Confirm condition, quantity, quality, and functionality before paying. Photos and descriptions alone should not be treated as final proof.",
  },
  {
    icon: MessageSquareWarning,
    title: "Watch for red flags",
    body: "Be cautious with urgency pressure, inconsistent identity details, unrealistic prices, copied images, refusal to meet safely, or requests to move into suspicious channels.",
  },
];

const sections = [
  {
    title: "Why safety matters on BuyMesho",
    body: `BuyMesho is built to improve trust and organization in student marketplace activity, but no platform can remove all risk from buyer-seller interaction. Because communication may continue through WhatsApp and some exchanges happen in person, users must combine platform tools with personal judgment and practical caution.`,
  },
  {
    title: "Before contacting a seller",
    body: `Read the listing carefully. Check whether the description is specific, whether the pricing is realistic, whether the photos appear authentic, and whether the seller profile gives enough confidence. Poorly described listings, copied-looking images, or suspicious urgency are warning signs.`,
  },
  {
    title: "Before meeting in person",
    body: `Tell someone where you are going if the exchange involves meeting someone you do not know. Prefer visible campus environments or other well-frequented public places. Avoid late-night meetings, isolated locations, or situations where you feel pressured or unsafe.`,
  },
  {
    title: "Before paying",
    body: `Do not rush. Confirm what exactly is being sold, whether the item works as described, and whether the seller’s identity and behavior are consistent. For services, ask clear questions about scope, timing, and expected outcome before agreeing to payment.`,
  },
  {
    title: "For sellers",
    body: `Protect yourself too. Meet buyers in safer locations, avoid disclosing unnecessary personal information, document important details of the deal, and be cautious with payment confirmations that cannot be independently verified. Do not hand over an item without being satisfied that payment is genuine.`,
  },
  {
    title: "For digital goods, deposits, and reservations",
    body: `Extra caution is required where a listing involves digital delivery, booking, deposits, transport arrangements, accommodation leads, or partial payment requests. These are often higher-risk categories because verification is weaker and disputes are harder to resolve.`,
  },
  {
    title: "Reporting unsafe behavior",
    body: `If a listing appears fraudulent, misleading, abusive, illegal, or unsafe, use the reporting function. Reporting helps remove harmful content, protect other users, and strengthen trust across campus communities.`,
  },
  {
    title: "Emergency and immediate danger",
    body: `BuyMesho is not an emergency-response service. If you face immediate danger, threats, coercion, theft, or another urgent safety issue, contact local authorities, campus security, or trusted people around you immediately before relying on in-app reporting.`,
  },
];

export default function SafetyTipsPage() {
  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-6 w-6 text-amber-700" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
              Safety Tips
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">
              Practical guidance for safer campus trading
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-amber-900/80">
              BuyMesho improves discovery and reporting, but safe behavior still
              depends on careful decisions by both buyers and sellers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tips.map((tip) => (
          <div key={tip.title} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <tip.icon className="h-5 w-5 text-zinc-900" />
            <h2 className="mt-3 text-sm font-semibold text-zinc-900">{tip.title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{tip.body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-900">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
