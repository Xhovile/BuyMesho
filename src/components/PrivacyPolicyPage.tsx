import React from "react";
import { ShieldCheck, Eye, Database, Lock } from "lucide-react";
import LegalPageShell from "./LegalPageShell";

type Props = {
  onBack: () => void;
};

type Highlight = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

type PolicySection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const highlights: Highlight[] = [
  {
    title: "What we collect",
    body:
      "BuyMesho collects account information, profile details, listing content, seller application data, reports, and limited technical usage information needed to operate the marketplace.",
    icon: <Database className="w-5 h-5 text-zinc-700" />,
  },
  {
    title: "How we use it",
    body:
      "We use information to run the platform, support users, review seller applications, moderate marketplace activity, improve safety, and maintain platform performance.",
    icon: <ShieldCheck className="w-5 h-5 text-zinc-700" />,
  },
  {
    title: "What becomes public",
    body:
      "Listings, seller profile details, and contact information that you choose to publish may be visible to other users of the marketplace.",
    icon: <Eye className="w-5 h-5 text-zinc-700" />,
  },
  {
    title: "How we protect it",
    body:
      "We use reasonable technical, administrative, and operational safeguards, but no online system can guarantee absolute security.",
    icon: <Lock className="w-5 h-5 text-zinc-700" />,
  },
];

const sections: PolicySection[] = [
  {
    title: "1. Our Commitment to Privacy",
    paragraphs: [
      "BuyMesho is an independently operated marketplace platform managed by its founder. Privacy matters because trust is central to how a marketplace works. Users should be able to understand what information is collected, why it is collected, how it may be used, and what may become visible when they use the platform.",
      "This Privacy Policy explains BuyMesho’s approach to account information, seller information, public listings, support requests, reports, and marketplace activity. We aim to collect and use information in a way that is relevant to platform operation, safety, administration, and improvement rather than for unnecessary or excessive purposes.",
      "By using BuyMesho, creating an account, applying to sell, publishing listings, contacting other users, saving listings, rating sellers, or submitting reports through the platform, you acknowledge that your information may be collected and processed in accordance with this Privacy Policy.",
    ],
  },
  {
    title: "2. Scope of This Policy",
    paragraphs: [
      "This Privacy Policy applies to BuyMesho’s marketplace environment, including user registration, account access, seller applications, seller profiles, listings, saved items, reports, support channels, moderation activity, and other marketplace-related features made available through the platform.",
      "This policy applies to information collected directly from users, information generated through use of the platform, information submitted through seller review and reporting processes, and information that becomes visible because a user chooses to publish it through marketplace activity.",
    ],
  },
  {
    title: "3. Information We Collect",
    paragraphs: [
      "BuyMesho may collect information that you provide directly, information created through your marketplace activity, and limited technical information generated when you use the platform.",
    ],
    bullets: [
      "Account and registration information, such as your email address, university selection, profile image or avatar, and other account details submitted during sign-up or profile management.",
      "Seller profile information, such as business name, business logo, short bio, WhatsApp number, university affiliation, join date, verification status, and seller status information.",
      "Listing information, such as item names, categories, subcategories, item types, specifications, condition, price, quantity, description, uploaded photos or videos, availability status, and other content you choose to publish.",
      "Seller application and review information, such as full legal name, institution, applicant type, institution ID or registration details, business description, proof documents, reason for applying, review notes, and approval or rejection outcomes.",
      "Reports and support information, such as complaint subjects, reasons, details submitted through report forms, moderation notes, and issue-handling records.",
      "Marketplace interaction information, such as saved listings, listing views, seller profile views, seller ratings, report activity, and other activity connected to marketplace use.",
      "Technical and usage information, such as browser or device type, IP address, session-related activity, access timestamps, performance data, logs, and error information needed to operate, secure, and improve the platform.",
    ],
  },
  {
    title: "4. Information You Choose to Make Public",
    paragraphs: [
      "BuyMesho is a marketplace platform, which means some information is intended to be visible to other users when you decide to publish it. This is different from purely private account data.",
      "When you create a seller profile or publish a listing, some information may become visible to other users. This may include your business name, business logo, bio, university, listing content, item details, listing images or videos, status information, and contact information that you attach to a listing or seller profile.",
      "You are responsible for understanding that information submitted for public display may be seen, saved, shared, discussed, or acted on by other users. BuyMesho may moderate the platform, but it cannot fully control how other users behave after information becomes visible to them.",
    ],
  },
  {
    title: "5. How We Use Information",
    paragraphs: [
      "BuyMesho may use collected information to operate, manage, secure, support, and improve the marketplace. The exact use depends on the feature involved and the type of information submitted.",
    ],
    bullets: [
      "To create and manage user accounts, seller records, and platform access.",
      "To review seller applications, verify submitted information, and determine whether a seller should be approved, rejected, restricted, or reviewed further.",
      "To publish, display, organise, update, and manage listings and marketplace content.",
      "To allow buyers and sellers to discover listings and connect through the platform and any contact methods the user chooses to provide.",
      "To respond to support requests, issue reports, safety concerns, moderation matters, and account-related enquiries.",
      "To detect, prevent, investigate, and respond to fraud, suspicious activity, abuse, misinformation, unauthorised access, safety risks, or violations of platform policies.",
      "To monitor platform activity, improve features, fix technical problems, review marketplace performance, and support the continued development of BuyMesho.",
      "To comply with legal obligations, protect platform rights and interests, and help maintain a safer marketplace environment.",
    ],
  },
  {
    title: "6. When Information May Be Shared",
    paragraphs: [
      "BuyMesho does not treat user information as something to distribute casually. However, some information may be shared or disclosed in limited situations where it is necessary for platform operation, safety, administration, or legal compliance.",
    ],
    bullets: [
      "With trusted service or infrastructure providers where reasonably necessary to operate, host, maintain, secure, store, or support the platform.",
      "With moderators, administrators, or authorised reviewers involved in seller approval, report handling, dispute review, fraud checks, or policy enforcement.",
      "Where a user intentionally makes information public through listings, seller profiles, contact details, or other marketplace activity intended for visibility.",
      "Where disclosure is required by law, legal process, lawful request, or where reasonably necessary to protect users, the platform, or the public from harm, fraud, abuse, or serious misconduct.",
      "In connection with future ownership transfer, restructuring, merger, sale, or platform reorganisation, if BuyMesho later changes operational or legal control.",
    ],
  },
  {
    title: "7. Data Storage and Security",
    paragraphs: [
      "BuyMesho uses reasonable administrative, technical, and operational safeguards to protect information under its control. These measures may include access controls, authentication systems, restricted review processes, internal handling procedures, and other steps appropriate to a digital marketplace environment.",
      "Even with such measures, no website, app, server environment, storage system, or transmission method is completely immune from risk. For that reason, users should avoid posting unnecessary sensitive personal information in public listings, public profile sections, or marketplace conversations.",
      "Users also play an important role in privacy and security. You are responsible for protecting your own login credentials, avoiding careless sharing of sensitive information, and using the platform responsibly when contacting buyers or sellers.",
    ],
  },
  {
    title: "8. Data Retention",
    paragraphs: [
      "BuyMesho may retain information for as long as reasonably necessary to operate the platform, maintain records, resolve disputes, investigate reports, review seller history, enforce platform rules, and comply with legal or operational obligations.",
      "Retention periods may vary depending on the nature of the information. Public marketplace content, seller application records, reports, moderation records, and account-related data may be retained for legitimate operational, safety, or administrative reasons even if a listing is removed or a user becomes inactive.",
      "Where retention is no longer reasonably necessary, BuyMesho may delete, anonymise, or otherwise stop using the relevant data, subject to technical, administrative, legal, and safety considerations.",
    ],
  },
  {
    title: "9. Your Rights and Choices",
    paragraphs: [
      "Subject to the way the platform operates and any applicable legal or safety limitations, users may request access to their account information, request correction of inaccurate information, request account closure, or ask that certain information be reviewed for deletion or update.",
      "Users also have practical control over some information through their own activity. For example, you may edit listings, update profile details, remove content, or choose not to publish certain contact information publicly. However, some records may still be retained where necessary for moderation, safety, administration, fraud prevention, or legal compliance.",
      "A deletion or closure request does not automatically mean that every related record will disappear immediately from all systems, especially where retention remains reasonably necessary for platform integrity, dispute handling, report review, or legal reasons.",
    ],
  },
  {
    title: "10. Children and Eligibility",
    paragraphs: [
      "BuyMesho is intended for eligible users of the marketplace environment it serves. Users should only create accounts, publish listings, or submit seller applications if they are legally able to do so and capable of taking responsibility for their marketplace activity.",
      "If BuyMesho becomes aware that information has been submitted in a manner that raises eligibility, misuse, impersonation, or safety concerns, the platform may review, restrict, suspend, or remove the relevant account, content, or application.",
    ],
  },
  {
    title: "11. Third-Party Services and Technical Tools",
    paragraphs: [
      "BuyMesho may rely on external technical or infrastructure support in order to operate its marketplace environment. As a result, some information may be processed through third-party systems used to support hosting, authentication, media handling, storage, platform delivery, or related operational functions.",
      "This Privacy Policy does not automatically govern separate services, websites, or apps that are not controlled by BuyMesho, even if they are linked to or used in connection with the marketplace. Users should understand that external services may have their own policies and terms.",
      "BuyMesho may also use cookies, session data, logs, or similar technical methods where applicable to support platform access, performance, security, or user experience.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    paragraphs: [
      "BuyMesho may update this Privacy Policy from time to time to reflect platform development, operational changes, safety practices, legal requirements, or changes in how information is handled.",
      "When this policy is updated, the revised version may be posted through the platform with an updated effective date. Continued use of BuyMesho after such updates may be treated as acceptance of the revised Privacy Policy, subject to applicable law and reasonable notice practices.",
    ],
  },
  {
    title: "13. Contact and Privacy Requests",
    paragraphs: [
      "For privacy-related questions, account concerns, correction requests, deletion enquiries, or other issues connected to personal information, users may contact BuyMesho through the platform’s reporting or support channels, or through any official contact address later published by BuyMesho.",
      "When contacting BuyMesho about privacy, users should provide enough detail to identify the account, listing, profile, report, or issue involved so that the matter can be reviewed properly.",
    ],
  },
];

export default function PrivacyPolicyPage({
  onBack,
}: Props) {
  return (
    <LegalPageShell title="Privacy Policy" onBack={onBack}>
      <div className="p-6 overflow-y-auto flex-1">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-3">
              <p className="text-sm font-semibold text-zinc-800">
                Effective Date: 25 March 2026
              </p>
              <p className="text-sm text-zinc-700 leading-7">
                This Privacy Policy explains how BuyMesho collects, uses, stores, protects, and handles information connected to account access, marketplace participation, seller activity, listings, support, moderation, and related platform operations.
              </p>
            </div>
          </div>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-zinc-700" />
              <h3 className="text-lg font-bold text-zinc-900">Privacy Highlights</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <h4 className="text-sm font-extrabold text-zinc-900">{item.title}</h4>
                  </div>
                  <p className="text-sm text-zinc-700 leading-7">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-extrabold text-zinc-900">{section.title}</h3>

                <div className="space-y-4 text-sm text-zinc-700 leading-7">
                  {section.paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>

                {section.bullets && section.bullets.length > 0 ? (
                  <ul className="space-y-3 list-disc pl-5 text-sm text-zinc-700 leading-7">
                    {section.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </div>
    </LegalPageShell>
  );
}
