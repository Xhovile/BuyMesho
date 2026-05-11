import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import { navigateToCart, navigateToLogin } from "../lib/appNavigation";

type FloatingCartButtonProps = {
  isLoggedIn: boolean;
  className?: string;
};

export default function FloatingCartButton({ isLoggedIn, className = "" }: FloatingCartButtonProps) {
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const openCart = () => {
    if (!isLoggedIn) {
      setLoginPromptOpen(true);
      return;
    }

    navigateToCart();
  };

  return (
    <>
      <button
        type="button"
        onClick={openCart}
        className={`fixed right-4 top-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 text-white shadow-xl shadow-yellow-500/30 ring-1 ring-yellow-300 transition hover:-translate-y-0.5 hover:bg-yellow-400 focus:outline-none focus:ring-4 focus:ring-yellow-200 sm:right-6 ${className}`}
        aria-label="Open cart"
        title="Open cart"
      >
        <viconic-icon icon="p4:shopping-cart-add" className="text-2xl text-white" />
      </button>

      <ConfirmModal
        open={loginPromptOpen}
        title="Login required"
        message="Please log in before opening your cart."
        confirmText="Login"
        cancelText="Cancel"
        onCancel={() => setLoginPromptOpen(false)}
        onConfirm={() => {
          setLoginPromptOpen(false);
          navigateToLogin();
        }}
      />
    </>
  );
}
