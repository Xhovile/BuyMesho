import { CreditCard } from "lucide-react";
import HomePage from "./HomePage";
import { navigateToPath } from "./lib/appNavigation";

const PAYMENTS_HUB_PATH = "/payments";

function ShortcutButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof CreditCard;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-2xl border border-bm-border bg-bm-surface px-4 py-3 text-sm font-bold text-bm-text shadow-lg shadow-zinc-200/40 hover:bg-bm-surface-subtle hover:shadow-xl transition-all"
    >
      <Icon className="h-4 w-4 text-red-900" />
      {label}
    </button>
  );
}

export default function HomePageWithShortcuts() {
  return (
    <div className="relative">
      <HomePage />

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] px-4 sm:bottom-6">
        <div className="mx-auto flex max-w-7xl justify-center sm:justify-end">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[2rem] border border-bm-border/80 bg-bm-surface/95 p-2 shadow-2xl shadow-zinc-400/15 backdrop-blur-sm">
            <ShortcutButton
              icon={CreditCard}
              label="Payments"
              onClick={() => navigateToPath(PAYMENTS_HUB_PATH)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
