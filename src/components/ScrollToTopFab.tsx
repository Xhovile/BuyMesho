import React from "react";
import { ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import "./floatingControls.css";

type ScrollToTopFabProps = {
  show: boolean;
  onClick: () => void;
};

export default function ScrollToTopFab({ show, onClick }: ScrollToTopFabProps) {
  const hideOnMobileSettings =
    typeof window !== "undefined" &&
    window.location.pathname === "/settings" &&
    window.matchMedia("(max-width: 767px)").matches;

  if (hideOnMobileSettings) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.92 }}
          onClick={onClick}
          className="fixed bottom-[80px] right-5 sm:bottom-[80px] sm:right-6 z-[110] h-12 w-12 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-xl shadow-zinc-400/30 flex items-center justify-center"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
