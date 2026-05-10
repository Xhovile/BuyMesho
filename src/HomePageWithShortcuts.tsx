import { CreditCard, ShoppingCart } from "lucide-react";
import HomePage from "./HomePage";
import { navigateToPath } from "./lib/appNavigation";

const BUYER_PAYMENTS_PATH = "/buyer-payments";
const CART_PATH = "/cart";

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
      className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 shadow-lg shadow-zinc-200/40 hover:bg-zinc-50 hover:shadow-xl transition-all"
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
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[2rem] border border-zinc-200/80 bg-white/95 p-2 shadow-2xl shadow-zinc-400/15 backdrop-blur-sm">
            <ShortcutButton
              icon={CreditCard}
              label="Buyer Payments"
              onClick={() => navigateToPath(BUYER_PAYMENTS_PATH)}
            />
            <ShortcutButton
              icon={ShoppingCart}
              label="Cart"
              onClick={() => navigateToPath(CART_PATH)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
