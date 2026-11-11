import type { ReactNode } from "react";
import { Globe, Sparkles, ShieldCheck, Target, Users, ShoppingBag, BadgeCheck, ArrowRight } from "lucide-react";
import { EXPLORE_PATH, HOME_PATH, SIGNUP_PATH, navigateToPath } from "../lib/appNavigation";
import logoImage from "../../photos/LOGO.svg";

type SectionProps = {
  title: string;
  icon: ReactNode;
  children: ReactNode;
};

function Section({ title, icon, children }: SectionProps) {
  return (
    <section className="border-t border-bm-border dark:border-bm-border py-8 sm:py-10">
      <div className="mb-4 flex items-center gap-3">
        {icon}
        <h2 className="text-lg font-extrabold text-bm-text dark:text-bm-text sm:text-xl">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-7 text-bm-text-muted dark:text-bm-text-muted sm:text-[15px]">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="border-b border-bm-border dark:border-bm-border bg-bm-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigateToPath(HOME_PATH)}
            className="text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 overflow-hidden rounded-xl bg-bm-surface ring-1 ring-zinc-200 shadow-sm">
                <img src={logoImage} alt="BuyMesho logo" className="h-full w-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-black text-bm-text dark:text-bm-text">BuyMesho</p>
                <p className="text-xs font-medium text-bm-text-subtle dark:text-bm-text-subtle">Public Marketplace</p>
              </div>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface px-4 py-2.5 text-sm font-bold text-bm-text dark:text-bm-text hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted"
            >
              Explore
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(SIGNUP_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
            >
              Sign Up
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="pb-8 sm:pb-10">
          <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-bm-text-subtle dark:text-bm-text-subtle">
            About BuyMesho
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-bm-text dark:text-bm-text sm:text-5xl lg:text-6xl">
            A public marketplace built to make student entrepreneurship visible.
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-8 text-bm-text-muted dark:text-bm-text-muted sm:text-lg">
            BuyMesho exists to solve a real problem: too many student-led businesses stay hidden for too long.
            They may have real value, but they are hard to discover, hard to trust, and hard to grow when they live only on WhatsApp statuses, personal contacts, and scattered social media posts.
          </p>
        </section>

        <Section title="Our Story" icon={<Sparkles className="h-5 w-5 text-bm-text-muted dark:text-bm-text-muted" />}>
          <p>
            We built BuyMesho as a public marketplace that gives these businesses a permanent place to be seen.
          </p>
          <p>
            The platform is designed to help student entrepreneurs grow into serious business owners by giving them a structured space to display what they offer, attract attention, and build credibility over time. But BuyMesho is not limited to students. It is open to the public, because the marketplace itself is meant to serve real buyers, real sellers, and real commerce.
          </p>
        </Section>

        <Section title="Our Mission" icon={<BadgeCheck className="h-5 w-5 text-bm-text-muted dark:text-bm-text-muted" />}>
          <p>
            Our mission is to help student entrepreneurs develop into sustainable businesses while creating a marketplace that is open, practical, and useful to everyone.
          </p>
          <p className="font-semibold text-bm-text dark:text-bm-text">BuyMesho exists to:</p>
          <ul className="space-y-3 pl-5 list-disc">
            <li>give sellers a stronger and more discoverable online presence,</li>
            <li>help customers find useful products, services, and deals in one place,</li>
            <li>support student entrepreneurs as they grow beyond campus life,</li>
            <li>and provide a public platform where businesses can be found, trusted, and remembered.</li>
          </ul>
        </Section>

        <Section title="Why BuyMesho" icon={<ShoppingBag className="h-5 w-5 text-bm-text-muted dark:text-bm-text-muted" />}>
          <p>
            BuyMesho is a platform meant to enhance the exposure of student entrepreneurship while also serving as a marketplace for sellers offering student-friendly products and services.
          </p>
          <p className="font-semibold text-bm-text dark:text-bm-text">Everyone can buy on BuyMesho.</p>
          <p>
            Seller guidelines apply only because the platform’s primary goal is to help student entrepreneurs develop and grow. That means the platform welcomes sellers from the public too, as long as what they offer fits the marketplace and serves student needs, public needs, or both.
          </p>
          <p>
            That includes things like events, accommodation, food, fashion, beauty, school-related services, and other products and deals that people can use in everyday life.
          </p>
          <p>
            BuyMesho is not built to keep people out. It is built to help the right businesses get discovered faster, build trust through a structured marketplace, and grow beyond short-term selling habits.
          </p>
          <p>
            For sellers, that means a permanent place to showcase a business. For buyers, that means easier access to useful offers. For student entrepreneurs, that means a real path toward a business they can still rely on after school.
          </p>
        </Section>

        <Section title="How It Works" icon={<Globe className="h-5 w-5 text-bm-text-muted dark:text-bm-text-muted" />}>
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">For Buyers</h3>
              <ol className="mt-4 space-y-3 pl-5 list-decimal">
                <li>Browse the marketplace.</li>
                <li>Search for products, services, events, accommodation, or deals.</li>
                <li>Open a listing to see the details.</li>
                <li>Contact the seller or follow the next step provided on the platform.</li>
                <li>Buy with confidence through a structured public marketplace.</li>
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">For Sellers</h3>
              <ol className="mt-4 space-y-3 pl-5 list-decimal">
                <li>Create a seller account.</li>
                <li>Set up your profile.</li>
                <li>Add your listing with clear details, pricing, and contact information.</li>
                <li>Publish your offer and make it discoverable.</li>
                <li>Reach buyers through a platform designed for visibility and trust.</li>
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-bm-text-subtle dark:text-bm-text-subtle">For Student Entrepreneurs</h3>
              <ol className="mt-4 space-y-3 pl-5 list-decimal">
                <li>Open a permanent storefront for your business.</li>
                <li>Build your brand in a public space.</li>
                <li>Reach beyond friends, classmates, and temporary promotion channels.</li>
                <li>Grow into a business that can continue after campus life.</li>
                <li>Turn student hustle into long-term value.</li>
              </ol>
            </div>
          </div>
        </Section>

        <Section title="Our Vision" icon={<Target className="h-5 w-5 text-bm-text-muted dark:text-bm-text-muted" />}>
          <p>
            To become a trusted public marketplace that helps student entrepreneurs grow into lasting businesses while giving everyone access to useful products, services, and opportunities.
          </p>
        </Section>

        <Section title="Our Promise" icon={<ShieldCheck className="h-5 w-5 text-bm-text-muted dark:text-bm-text-muted" />}>
          <p>BuyMesho is built for visibility, growth, and trust.</p>
          <p>It is public. It is practical. It is made to help businesses be seen.</p>
        </Section>
      </main>
    </div>
  );
}
