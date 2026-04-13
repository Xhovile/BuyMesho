import React from "react";
import { ShieldCheck, X, AlertTriangle, UserCheck, Lock, Flag } from "lucide-react";

type Props = {
  onBack: () => void;
  onClose: () => void;
  showBackButton?: boolean;
};

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-900">
          {title}
        </h3>
      </div>
      <div className="space-y-3 text-sm leading-7 text-zinc-700">{children}</div>
    </section>
  );
}

function TipList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li
          key={index}
          className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm leading-7 text-zinc-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function SafetyTipsPage({
  onBack,
  onClose,
  showBackButton = true,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="sticky top-0 z-20 border-b border-zinc-100 bg-white/95 backdrop-blur">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-400">
              BuyMesho
            </p>
            <h2 className="text-2xl font-extrabold text-zinc-900">
              Safe Shopping &amp; Security Tips
            </h2>
          </div>

          <button
            onClick={onClose}
            className="h-11 w-11 rounded-2xl border border-zinc-200 bg-white shadow-sm hover:bg-zinc-50 hover:shadow-md transition-all flex items-center justify-center"
            aria-label="Close page"
          >
            <X className="w-5 h-5 text-zinc-700" />
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
              <p className="text-sm font-semibold text-emerald-900">
                Your safety matters on BuyMesho.
              </p>
              <p className="text-sm leading-7 text-emerald-800">
                BuyMesho is designed to support safer campus marketplace
                activity through seller review, reporting tools, account
                controls, and platform moderation. Even so, no marketplace can
                remove all risk. Safe use of the platform depends on both
                platform safeguards and user judgment.
              </p>
              <p className="text-sm leading-7 text-emerald-800">
                Use the guidance below before you buy, sell, meet, pay, or move
                a conversation outside the platform.
              </p>
            </div>
          </div>

          <Section
            icon={<UserCheck className="w-5 h-5 text-zinc-700" />}
            title="1. Buyer Safety Tips"
          >
            <TipList
              items={[
                <>
                  <span className="font-bold text-zinc-900">Verify the seller before you commit.</span>{" "}
                  Check the seller profile, listing quality, photos, description
                  clarity, and any visible trust signals. Be extra careful when
                  a listing looks rushed, incomplete, or inconsistent.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Be cautious with prices that are unusually low.</span>{" "}
                  If the price looks far below normal market value, treat it as
                  a warning sign. Very low prices can be used to rush buyers
                  into poor decisions, fake payments, or unsafe meetups.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Inspect the item properly before paying.</span>{" "}
                  Do not rely only on photos. Confirm the condition, working
                  state, completeness, and any claimed features in person where
                  possible before handing over money.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Ask direct questions.</span>{" "}
                  Confirm whether the item is still available, whether it has
                  defects, whether accessories are included, and whether the
                  seller has the right to sell it.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Prefer daytime meetings in familiar, public places.</span>{" "}
                  Where possible, meet in busy and known campus or public
                  environments rather than isolated places. If the transaction
                  feels uncomfortable, postpone or cancel it.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Do not rush because of pressure tactics.</span>{" "}
                  Statements like “many people want it,” “pay now,” or “send a
                  deposit immediately” should make you slow down, not speed up.
                </>,
              ]}
            />
          </Section>

          <Section
            icon={<ShieldCheck className="w-5 h-5 text-zinc-700" />}
            title="2. Seller Safety Tips"
          >
            <TipList
              items={[
                <>
                  <span className="font-bold text-zinc-900">Be careful with urgent or unusual buyers.</span>{" "}
                  Treat requests involving strange meeting conditions, rushed
                  decisions, suspicious payment promises, or inconsistent
                  identity details with caution.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Describe your item honestly.</span>{" "}
                  Clear descriptions and truthful condition details reduce
                  disputes, wasted time, and accusations of deception.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Do not hand over an item until payment is genuinely confirmed.</span>{" "}
                  Screenshots alone are not always proof. Take time to confirm
                  that money has actually been received where relevant.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Watch for overpayment or refund tricks.</span>{" "}
                  If someone claims to have sent too much and asks you to return
                  the extra amount quickly, treat that as suspicious.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Protect your personal safety during meetups.</span>{" "}
                  If you feel unsafe, do not continue. Bring someone you trust
                  if necessary, and avoid isolated handovers.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Keep useful records.</span>{" "}
                  Retain chats, agreed prices, pickup arrangements, and proof of
                  what was handed over in case a dispute is later reported.
                </>,
              ]}
            />
          </Section>

          <Section
            icon={<Lock className="w-5 h-5 text-zinc-700" />}
            title="3. Protecting Your Account and Personal Information"
          >
            <TipList
              items={[
                <>
                  <span className="font-bold text-zinc-900">Use a strong password.</span>{" "}
                  Choose a password that is hard to guess and not reused across
                  multiple platforms.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Do not share your login credentials.</span>{" "}
                  No one else should be using your BuyMesho account. Shared
                  accounts weaken trust and increase the risk of misuse.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Be careful with personal data.</span>{" "}
                  Avoid sharing unnecessary information such as passwords,
                  banking credentials, private ID details, or other sensitive
                  personal records during ordinary marketplace contact.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Watch for phishing and impersonation.</span>{" "}
                  Be suspicious of messages pretending to be official support
                  that ask for your password, verification codes, or sensitive
                  financial details.
                </>,
                <>
                  <span className="font-bold text-zinc-900">Log out or secure your device when needed.</span>{" "}
                  If you use a shared device or public access point, do not
                  leave your account open.
                </>,
              ]}
            />
          </Section>

          <Section
            icon={<AlertTriangle className="w-5 h-5 text-zinc-700" />}
            title="4. Scams and Warning Signs"
          >
            <p>Be extra careful if you notice any of the following:</p>
            <TipList
              items={[
                <>a seller or buyer refusing normal verification questions;</>,
                <>pressure to move unusually fast without inspection or confirmation;</>,
                <>requests for payment before basic details are clarified;</>,
                <>contradictory stories, fake urgency, or inconsistent identity details;</>,
                <>low-effort listings with suspicious photos or vague descriptions;</>,
                <>requests to continue sensitive parts of the transaction in ways that avoid accountability;</>,
                <>claims that sound designed to confuse, intimidate, or emotionally pressure you.</>,
              ]}
            />
            <p>
              A single warning sign does not always prove fraud, but several at
              once should make you pause immediately.
            </p>
          </Section>

          <Section
            icon={<Flag className="w-5 h-5 text-zinc-700" />}
            title="5. Reporting Suspicious Activity"
          >
            <p>
              Report content or conduct that appears fraudulent, abusive,
              misleading, unsafe, illegal, or otherwise inappropriate for the
              platform.
            </p>
            <p>You should report things such as:</p>
            <TipList
              items={[
                <>fake or misleading listings;</>,
                <>suspected stolen or prohibited goods;</>,
                <>abusive behavior or harassment;</>,
                <>impersonation;</>,
                <>attempted scams or payment deception;</>,
                <>seller or buyer behavior that creates a safety concern.</>,
              ]}
            />
            <p>
              When making a report, include clear details. Useful information
              can include the listing involved, what happened, dates, message
              screenshots, and any specific safety concern.
            </p>
          </Section>

          <Section
            icon={<ShieldCheck className="w-5 h-5 text-zinc-700" />}
            title="6. Platform Safety Limits"
          >
            <p>
              BuyMesho can support safer marketplace behavior through review,
              moderation, and reporting tools, but it cannot monitor every
              conversation, verify every statement instantly, or fully control
              what happens in person or in external channels.
            </p>
            <p>
              That means users should not treat the existence of a listing,
              account, or profile as a complete guarantee of honesty, safety, or
              product quality. Good judgment remains essential.
            </p>
          </Section>

          <Section
            icon={<Lock className="w-5 h-5 text-zinc-700" />}
            title="7. Good Practice Before Any Transaction"
          >
            <TipList
              items={[
                <>read the listing carefully;</>,
                <>ask questions before agreeing;</>,
                <>verify the person you are dealing with;</>,
                <>inspect before payment where possible;</>,
                <>meet safely and preferably during the day;</>,
                <>avoid pressure-based decisions;</>,
                <>keep a clear record of what was agreed.</>,
              ]}
            />
          </Section>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
            <p className="text-sm font-bold text-zinc-900">Related platform resources</p>
            <p className="text-sm leading-7 text-zinc-700">
              For more information, users should also review BuyMesho’s Privacy
              Policy, Terms &amp; Conditions, and reporting tools available
              through the platform.
            </p>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-zinc-100 bg-white/95 backdrop-blur px-6 py-4 flex items-center justify-start">
        {showBackButton ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-zinc-800 transition-colors"
          >
            ← Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
