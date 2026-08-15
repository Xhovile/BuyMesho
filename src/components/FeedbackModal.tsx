import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type FeedbackType = "success" | "error" | "info";

type FeedbackAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
};

type FeedbackModalProps = {
  open: boolean;
  type: FeedbackType;
  title: string;
  message: string;
  onClose: () => void;
  actions?: FeedbackAction[];
};

export default function FeedbackModal({ open, type, title, message, onClose, actions }: FeedbackModalProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      iconWrap: "bg-emerald-50 border border-emerald-100",
      iconColor: "text-emerald-600",
      accent: "bg-emerald-600 hover:bg-emerald-700",
    },
    error: {
      icon: AlertTriangle,
      iconWrap: "bg-red-50 border border-red-100",
      iconColor: "text-red-600",
      accent: "bg-zinc-900 hover:bg-zinc-800",
    },
    info: {
      icon: Info,
      iconWrap: "bg-zinc-100 border border-zinc-200",
      iconColor: "text-zinc-700",
      accent: "bg-zinc-900 hover:bg-zinc-800",
    },
  }[type];

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-5 sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 cursor-default bg-zinc-950/45 backdrop-blur-[3px]"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 14 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
              <div className="flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${config.iconWrap}`}>
                  <Icon className={`h-5 w-5 ${config.iconColor}`} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-zinc-400">BuyMesho</p>
                  <h3 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 pb-5 pt-3">
              <p className="text-[15px] leading-6 text-zinc-600">{message}</p>
            </div>

            <div className="border-t border-zinc-100 bg-zinc-50/70 px-6 py-5">
              {actions && actions.length > 0 ? (
                <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className={`flex-1 rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors ${
                        action.variant === "secondary"
                          ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                          : `${config.accent} text-white`
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold text-white transition-colors ${config.accent}`}
                >
                  Okay
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
