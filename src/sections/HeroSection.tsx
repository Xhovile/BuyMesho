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
    <>
      <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border-b border-zinc-200 bg-gradient-to-br from-zinc-900/10 to-zinc-100 px-4 pt-6 pb-5 sm:pt-8 sm:pb-7">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute left-1/4 top-0 h-40 w-40 rounded-full bg-zinc-900/8 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 h-44 w-44 rounded-full bg-zinc-300/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-zinc-400/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:relative sm:block">
            <div className="w-full text-center">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-zinc-500"
              >
                Market
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mx-auto mt-2 max-w-4xl text-center text-3xl font-black leading-[0.95] tracking-[-0.06em] text-zinc-900 sm:text-4xl lg:text-5xl"
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
              className="flex justify-center sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2"
            >
              <button
                type="button"
                onClick={handleHeroAction}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-extrabold text-white shadow-[0_16px_32px_-14px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_20px_40px_-14px_rgba(0,0,0,0.5)]"
              >
                <Plus className="w-4 h-4" />
                {actionLabel}
              </button>
            </motion.div>
          </div>
        </div>
      </section>

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
    </>
  );
}
