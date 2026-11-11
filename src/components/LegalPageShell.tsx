import type { ReactNode } from "react";
import { House, ShoppingBag, ChevronLeft } from "lucide-react";
import { HOME_PATH, EXPLORE_PATH, navigateToPath } from "../lib/appNavigation";
import BrandMark from "./BrandMark";

type LegalPageShellProps = {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  flushContent?: boolean;
};

export default function LegalPageShell({
  title,
  subtitle = "Secure Marketplace",
  onBack,
  children,
  flushContent = false,
}: LegalPageShellProps) {
  return (
    <div className="min-h-screen bg-bm-surface-muted dark:bg-bm-surface-muted text-bm-text dark:text-bm-text">
      <header className="sticky top-0 z-40 border-b border-bm-border bg-bm-surface/90 dark:bg-bm-surface/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <BrandMark />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToPath(HOME_PATH)}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted items-center gap-2"
            >
              <House className="w-4 h-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => navigateToPath(EXPLORE_PATH)}
              className="inline-flex items-center gap-2 rounded-2xl bg-bm-brand px-4 py-2.5 text-sm font-bold text-bm-on-brand hover:bg-bm-brand-hover"
            >
              <ShoppingBag className="w-4 h-4" />
              Market
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface p-6 sm:p-8 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-bm-text-subtle dark:text-bm-text-subtle">
                {subtitle}
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight text-bm-text dark:text-bm-text">
                {title}
              </h1>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-bm-border dark:border-bm-border bg-bm-surface text-sm font-bold hover:bg-bm-surface-muted dark:hover:bg-bm-surface-muted self-start"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </section>
        {flushContent ? (
          children
        ) : (
          <section className="rounded-[2rem] border border-bm-border dark:border-bm-border bg-bm-surface shadow-sm overflow-hidden">
            {children}
          </section>
        )}
      </main>
    </div>
  );
}
