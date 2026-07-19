import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { useAccountProfile } from "../hooks/useAccountProfile";
import { useAuthUser } from "../hooks/useAuthUser";
import {
  BECOME_SELLER_PATH,
  CREATE_PATH,
  navigateToLoginWithReturnPath,
  navigateToPath,
} from "../lib/appNavigation";

type HeroSectionProps = {
  onListItem: () => void;
};

type SellPromptState = "guest" | "seller_application" | null;

export default function HeroSection({ onListItem }: HeroSectionProps) {
  const { user: firebaseUser } = useAuthUser();
  const { profile: userProfile } = useAccountProfile();
  const [sellPrompt, setSellPrompt] = useState<SellPromptState>(null);

  const isSeller = !!firebaseUser && !!userProfile?.is_seller;
  const actionLabel = isSeller ? "List Item" : "Sell";

  const handleHeroAction = () => {
    if (isSeller) {
      onListItem();
      return;
    }

    setSellPrompt(firebaseUser ? "seller_application" : "guest");
  };

  const closePrompt = () => setSellPrompt(null);

  const confirmPrompt = () => {
    const promptType = sellPrompt;
    closePrompt();

    if (promptType === "guest") {
      navigateToLoginWithReturnPath(CREATE_PATH);
      return;
    }

    if (promptType === "seller_application") {
      navigateToPath(BECOME_SELLER_PATH);
    }
  };

  return (
    <section className="relative px-4 pt-6 pb-4 sm:pt-8 sm:pb-5">
      <div className="absolute inset-x-4 top-0 -z-10 h-24 rounded-[2rem] bg-gradient-to-r from-red-900/5 via-white to-amber-300/10 blur-2xl" />

      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-400"
            >
              Market
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.06em] leading-[0.95] text-zinc-900"
            >
              Everyone Can Buy On {" "}
              <span className="text-red-900">Buy</span>
              <span className="text-zinc-700">Mesho</span>.
            </motion.h1>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="shrink-0"
          >
            <button
              type="button"
              onClick={handleHeroAction}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-zinc-800"
            >
              <Plus className="w-4 h-4" />
              {actionLabel}
            </button>
          </motion.div>
        </div>
      </div>

      <ConfirmModal
        open={sellPrompt !== null}
        title={sellPrompt === "guest" ? "Sign in first" : "Seller application"}
        message={
          sellPrompt === "guest"
            ? "You are not logged in yet. Continue to sign in or sign up, or cancel to stay here."
            : "You are about to be directed to the seller application page."
        }
        confirmText="Continue"
        cancelText="Cancel"
        onCancel={closePrompt}
        onConfirm={confirmPrompt}
      />
    </section>
  );
}
