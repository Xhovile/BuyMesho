import React from "react";
import { X } from "lucide-react";

type Props = {
  onBack: () => void;
  onClose: () => void;
  showBackButton?: boolean;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-extrabold uppercase tracking-widest text-zinc-900">
        {title}
      </h3>
      <div className="space-y-3 text-sm leading-7 text-zinc-700">{children}</div>
    </section>
  );
}

export default function TermsPage({
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
              Terms &amp; Conditions
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
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
              <p className="text-sm font-semibold text-zinc-800">
                Effective Date: 25 March 2026
              </p>
              <p className="text-sm leading-7 text-zinc-700">
                BuyMesho is independently owned and operated by Isaac Mtsiriza.
                These Terms &amp; Conditions govern access to and use of the
                BuyMesho platform, including user accounts, seller applications,
                listings, reports, and related marketplace features.
              </p>
              <p className="text-sm leading-7 text-zinc-700">
                By accessing or using BuyMesho, you agree to be bound by these
                Terms. If you do not agree, you should not use the platform.
              </p>
            </div>
          </div>

          <Section title="1. About BuyMesho">
            <p>
              BuyMesho is a digital marketplace platform designed to help users
              discover, post, manage, and communicate about listings. The
              platform may support buyer and seller interaction, profile
              creation, listing visibility, reporting, and moderation features.
            </p>
            <p>
              BuyMesho is not automatically the seller, reseller, owner,
              warehouse operator, delivery company, or payment intermediary for
              goods or services listed by users unless BuyMesho expressly states
              otherwise in a specific feature or transaction flow.
            </p>
          </Section>

          <Section title="2. Acceptance of Terms">
            <p>
              By creating an account, applying to become a seller, posting a
              listing, contacting another user through the platform, or
              otherwise using BuyMesho, you confirm that you have read,
              understood, and accepted these Terms.
            </p>
            <p>
              Continued use of the platform after changes are published will be
              treated as acceptance of the updated Terms.
            </p>
          </Section>

          <Section title="3. Eligibility and User Responsibility">
            <p>
              BuyMesho is intended for users who are legally capable of entering
              into binding arrangements under applicable law. If you are under
              18, you should only use the platform with the knowledge and
              involvement of a parent or legal guardian.
            </p>
            <p>
              You are responsible for ensuring that your use of BuyMesho is
              lawful, accurate, and consistent with these Terms and any
              applicable platform rules or guidance.
            </p>
          </Section>

          <Section title="4. Accounts and Account Security">
            <p>
              Some features of BuyMesho require account registration. You are
              responsible for providing accurate information during registration
              and for keeping your login credentials confidential.
            </p>
            <p>
              You are responsible for activity that occurs under your account,
              including listings, reports, profile information, messages, and
              any actions taken using your login. BuyMesho may suspend or
              restrict access where account misuse, suspicious activity, false
              information, or security concerns are detected.
            </p>
          </Section>

          <Section title="5. Seller Access and Seller Approval">
            <p>
              Not every user is automatically entitled to sell on BuyMesho.
              Seller access may be subject to application, identity or
              institution checks, document review, profile review, and approval
              by the platform.
            </p>
            <p>
              BuyMesho reserves the right to approve, reject, delay, suspend, or
              revoke seller access at its discretion where necessary for safety,
              trust, quality control, platform integrity, legal compliance, or
              policy enforcement.
            </p>
          </Section>

          <Section title="6. Listings and User Content">
            <p>
              Users are responsible for all content they upload, publish, or
              submit through BuyMesho, including listing titles, descriptions,
              pricing, photos, videos, profile details, support submissions,
              reports, and other materials.
            </p>
            <p>
              By posting content on BuyMesho, you confirm that:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>you own the item or have the lawful right to list it;</li>
              <li>the content is accurate and not misleading;</li>
              <li>the item, service, or content is lawful to offer or publish;</li>
              <li>
                your content does not violate the rights, privacy, safety, or
                intellectual property of others.
              </li>
            </ul>
            <p>
              BuyMesho may review, limit, unpublish, edit for moderation
              purposes, or remove content where necessary to maintain platform
              quality, trust, safety, or compliance.
            </p>
          </Section>

          <Section title="7. Prohibited Items and Prohibited Conduct">
            <p>
              You may not use BuyMesho to post, promote, request, distribute, or
              facilitate any item, service, or conduct that is unlawful,
              deceptive, unsafe, abusive, or harmful.
            </p>
            <p>Prohibited conduct includes, without limitation:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>selling stolen, counterfeit, illegal, or restricted goods;</li>
              <li>posting false, misleading, or fraudulent listings;</li>
              <li>impersonating another person, institution, or business;</li>
              <li>using abusive, threatening, discriminatory, or obscene language;</li>
              <li>spamming, mass messaging, or manipulating marketplace visibility;</li>
              <li>
                attempting to bypass seller approval, reporting systems, or
                security controls;
              </li>
              <li>
                uploading malware, harmful files, or content intended to damage
                the platform or its users;
              </li>
              <li>misusing the reporting system or submitting false complaints;</li>
              <li>
                using BuyMesho in connection with fraud, harassment, or unsafe
                transactions.
              </li>
            </ul>
          </Section>

          <Section title="8. Marketplace Role and Transaction Responsibility">
            <p>
              BuyMesho provides a marketplace environment, not a blanket
              guarantee of every listing, seller, buyer, payment arrangement,
              delivery promise, or item condition.
            </p>
            <p>
              Unless expressly stated otherwise, transactions arranged through
              BuyMesho are the responsibility of the buyer and seller involved.
              Users are responsible for verifying item details, condition,
              ownership, pricing, payment method, delivery terms, and personal
              safety before completing any transaction.
            </p>
            <p>
              BuyMesho does not guarantee that every listing is genuine,
              available, safe, accurately described, or free from dispute. The
              platform may take moderation steps, but users remain responsible
              for exercising judgment and caution.
            </p>
          </Section>

          <Section title="9. Pricing, Availability, and Accuracy">
            <p>
              Sellers are responsible for ensuring that listing prices, stock
              quantities, descriptions, availability, and condition details are
              accurate and kept reasonably up to date.
            </p>
            <p>
              BuyMesho does not guarantee that all posted prices are correct or
              that listed items remain available at all times. Listings may be
              changed, edited, marked sold, removed, or become outdated.
            </p>
          </Section>

          <Section title="10. Communication Through WhatsApp or Other External Channels">
            <p>
              BuyMesho may enable or encourage contact through WhatsApp or other
              external communication tools. Once users move part or all of a
              transaction outside the platform, BuyMesho may have limited
              visibility, control, or evidence of what occurs.
            </p>
            <p>
              Off-platform communication does not remove your obligation to act
              lawfully and responsibly. Conduct tied to BuyMesho activity may
              still be investigated and may affect account status even if part
              of the interaction happened outside the platform.
            </p>
          </Section>

          <Section title="11. Reports, Moderation, and Enforcement">
            <p>
              BuyMesho may investigate reports, suspicious conduct, seller
              applications, listing disputes, fraud indicators, content abuse,
              and other matters affecting trust and safety on the platform.
            </p>
            <p>
              BuyMesho reserves the right to take reasonable enforcement action,
              including warning a user, limiting account features, removing
              content, rejecting applications, suspending seller status,
              suspending accounts, or permanently restricting access.
            </p>
            <p>
              BuyMesho may also preserve or disclose information where required
              for legal compliance, platform protection, safety review, or the
              investigation of misuse.
            </p>
          </Section>

          <Section title="12. Intellectual Property">
            <p>
              The BuyMesho platform, including its brand elements, layout,
              interface, text, graphics, and platform-specific materials, is
              protected by applicable intellectual property and related laws.
            </p>
            <p>
              Users may not copy, reproduce, republish, commercially exploit,
              reverse engineer, or misuse platform content or branding in a way
              that infringes rights or misrepresents association with BuyMesho.
            </p>
            <p>
              Users retain responsibility for the content they submit, but by
              posting listings or other marketplace content, you grant BuyMesho
              a limited right to display, format, store, review, and use that
              content as reasonably necessary to operate, promote, moderate, and
              improve the platform.
            </p>
          </Section>

          <Section title="13. Privacy">
            <p>
              Your use of BuyMesho is also governed by the BuyMesho Privacy
              Policy. Where these Terms refer to data handling, reports,
              moderation, or account use, they should be read together with the
              platform’s Privacy Policy.
            </p>
          </Section>

          <Section title="14. Disclaimer of Warranties">
            <p>
              BuyMesho is provided on an “as is” and “as available” basis. To
              the fullest extent permitted by law, BuyMesho makes no guarantee
              that the platform will always be uninterrupted, error-free,
              secure, fully accurate, or suitable for every purpose.
            </p>
            <p>
              BuyMesho does not guarantee the conduct of all users, the quality
              of all listings, the success of transactions, or the accuracy of
              every item description, seller claim, profile detail, or external
              communication.
            </p>
          </Section>

          <Section title="15. Limitation of Liability">
            <p>
              To the fullest extent permitted by applicable law, BuyMesho and
              its operator will not be liable for indirect, incidental, special,
              punitive, or consequential loss arising from or connected to your
              use of the platform, including user disputes, misrepresentation by
              another user, failed transactions, delayed communication, safety
              incidents, off-platform dealings, or content submitted by users.
            </p>
            <p>
              Nothing in these Terms is intended to exclude liability where such
              exclusion is not permitted by law.
            </p>
          </Section>

          <Section title="16. Suspension, Restriction, and Termination">
            <p>
              BuyMesho may suspend, limit, or terminate access to the platform
              or to specific features at any time where necessary for
              maintenance, legal compliance, trust and safety, fraud prevention,
              content moderation, policy enforcement, or platform integrity.
            </p>
            <p>
              Users may also stop using the platform at any time. Removal of an
              account or listing does not automatically remove obligations or
              consequences arising from prior misuse, disputes, or violations.
            </p>
          </Section>

          <Section title="17. Changes to These Terms">
            <p>
              BuyMesho may update these Terms from time to time. When changes
              are made, the revised version may be posted with a new effective
              date. Continued use of the platform after the updated Terms are
              made available will normally be treated as acceptance of the new
              version.
            </p>
          </Section>

          <Section title="18. Governing Law and Disputes">
            <p>
              These Terms are governed by the laws of Malawi. Any dispute,
              complaint, or claim arising out of or connected with BuyMesho
              should first be raised through the platform’s support or reporting
              channels so that it can be reviewed in good faith before further
              action is taken.
            </p>
            <p>
              Where a dispute cannot be resolved informally, it may be handled
              in accordance with the applicable laws and competent forums of
              Malawi.
            </p>
          </Section>

          <Section title="19. Contact">
            <p>
              For questions about these Terms, platform rules, account action,
              or marketplace concerns, users may contact BuyMesho through the
              platform’s available reporting or support channels, or through any
              official contact address published by BuyMesho.
            </p>
          </Section>
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
