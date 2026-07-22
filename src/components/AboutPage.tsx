import type { ReactNode } from "react";
import { Globe, Sparkles, ShieldCheck, Target, Users, ShoppingBag, BadgeCheck } from "lucide-react";
import LegalPageShell from "./LegalPageShell";
import { HOME_PATH, navigateToPath } from "../lib/appNavigation";

type Card = {
  title: string;
  body: string;
  icon: ReactNode;
};

const storyCards: Card[] = [
  {
    title: "Visibility",
    body:
      "Student-led businesses often stay hidden too long when they only live on WhatsApp statuses, personal contacts, and scattered social media posts.",
    icon: <Globe className="h-5 w-5 text-zinc-700" />,
  },
  {
    title: "Trust",
    body:
      "BuyMesho gives sellers a structured public space where their offers can be seen, remembered, and evaluated more clearly.",
    icon: <ShieldCheck className="h-5 w-5 text-zinc-700" />,
  },
  {
    title: "Growth",
    body:
      "The platform is designed to help student entrepreneurs grow into serious business owners with a place that can keep working beyond campus life.",
    icon: <Target className="h-5 w-5 text-zinc-700" />,
  },
  {
    title: "Openness",
    body:
      "BuyMesho is open to the public because real marketplaces should serve real buyers, real sellers, and real commerce.",
    icon: <Users className="h-5 w-5 text-zinc-700" />,
  },
];

const points = [
  "give sellers a stronger and more discoverable online presence",
  "help customers find useful products, services, and deals in one place",
  "support student entrepreneurs as they grow beyond campus life",
  "provide a public platform where businesses can be found, trusted, and remembered",
];

const buyerSteps = [
  "Browse the marketplace.",
  "Search for products, services, events, accommodation, or deals.",
  "Open a listing to see the details.",
  "Contact the seller or follow the next step provided on the platform.",
  "Buy with confidence through a structured public marketplace.",
];

const sellerSteps = [
  "Create a seller account.",
  "Set up your profile.",
  "Add your listing with clear details, pricing, and contact information.",
  "Publish your offer and make it discoverable.",
  "Reach buyers through a platform designed for visibility and trust.",
];

const studentSteps = [
  "Open a permanent storefront for your business.",
  "Build your brand in a public space.",
  "Reach beyond friends, classmates, and temporary promotion channels.",
  "Grow into a business that can continue after campus life.",
  "Turn student hustle into long-term value.",
];

export default function AboutPage() {
  return (
    <LegalPageShell title="About BuyMesho" subtitle="Public Marketplace" onBack={() => navigateToPath(HOME_PATH)}>
      <div className="p-6 sm:p-8 space-y-10">
        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-extrabold text-zinc-900">Our Story</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-zinc-700">
            <p>
              BuyMesho was created to solve a real problem: student entrepreneurship often stays invisible for too long. Many student-led businesses have value, but they are hard to discover, hard to trust, and hard to grow when they live only on WhatsApp statuses, personal contacts, and scattered social media posts.
            </p>
            <p>
              We built BuyMesho as a public marketplace that gives these businesses a permanent place to be seen.
            </p>
            <p>
              The platform is designed to help student entrepreneurs grow into serious business owners by giving them a structured space to display what they offer, attract attention, and build credibility over time. But BuyMesho is not limited to students. It is open to the public, because the marketplace itself is meant to serve real buyers, real sellers, and real commerce.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {storyCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
                {card.icon}
              </div>
              <h3 className="text-sm font-extrabold text-zinc-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-zinc-700">{card.body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-extrabold text-zinc-900">Our Mission</h2>
          </div>
          <p className="text-sm leading-7 text-zinc-700">
            Our mission is to help student entrepreneurs develop into sustainable businesses while creating a marketplace that is open, practical, and useful to everyone.
          </p>
          <div className="space-y-3">
            <p className="text-sm font-bold text-zinc-900">BuyMesho exists to:</p>
            <ul className="space-y-3 pl-5 text-sm leading-7 text-zinc-700 list-disc">
              {points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-extrabold text-zinc-900">Why BuyMesho</h2>
          </div>
          <div className="space-y-4 text-sm leading-7 text-zinc-700">
            <p>
              BuyMesho is a platform meant to enhance the exposure of student entrepreneurship while also serving as a marketplace for sellers offering student-friendly products and services.
            </p>
            <p className="font-semibold text-zinc-900">Everyone can buy on BuyMesho.</p>
            <p>
              Seller guidelines apply only because the platform’s primary goal is to help student entrepreneurs develop and grow. That means the platform welcomes sellers from the public too, as long as what they offer fits the marketplace and serves student needs, public needs, or both.
            </p>
            <p>That includes things like events, accommodation, food, fashion, beauty, school-related services, and other products and deals that people can use in everyday life.</p>
            <p>
              BuyMesho is not built to keep people out. It is built to help the right businesses get discovered faster, build trust through a structured marketplace, and grow beyond short-term selling habits.
            </p>
            <p>
              For sellers, that means a permanent place to showcase a business. For buyers, that means easier access to useful offers. For student entrepreneurs, that means a real path toward a business they can still rely on after school.
            </p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-zinc-900">For Buyers</h3>
            <ol className="mt-4 space-y-3 pl-5 text-sm leading-7 text-zinc-700 list-decimal">
              {buyerSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-zinc-900">For Sellers</h3>
            <ol className="mt-4 space-y-3 pl-5 text-sm leading-7 text-zinc-700 list-decimal">
              {sellerSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>

          <article className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-zinc-900">For Student Entrepreneurs</h3>
            <ol className="mt-4 space-y-3 pl-5 text-sm leading-7 text-zinc-700 list-decimal">
              {studentSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-extrabold text-zinc-900">Our Vision</h2>
          </div>
          <p className="text-sm leading-7 text-zinc-700">
            To become a trusted public marketplace that helps student entrepreneurs grow into lasting businesses while giving everyone access to useful products, services, and opportunities.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-zinc-700" />
            <h2 className="text-lg font-extrabold text-zinc-900">Our Promise</h2>
          </div>
          <div className="space-y-3 text-sm leading-7 text-zinc-700">
            <p>BuyMesho is built for visibility, growth, and trust.</p>
            <p>It is public. It is practical. It is made to help businesses be seen.</p>
          </div>
        </section>
      </div>
    </LegalPageShell>
  );
}
