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

export default function FeedbackModal({
  open,
  type,
  title,
  message,
  onClose,
  actions,
}: FeedbackModalProps) {
  const config = {
    success: {
      icon: CheckCircle2,
      iconWrap: "bg-emerald-50",
      iconColor: "text-emerald-600",
      button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    error: {
      icon: AlertTriangle,
      iconWrap: "bg-red-50",
      iconColor: "text-red-600",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
    info: {
      icon: Info,
      iconWrap: "bg-zinc-100",
      iconColor: "text-zinc-700",
      button: "bg-zinc-900 hover:bg-zinc-800 text-white",
    },
  }[type];

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${config.iconWrap}`}
                >
                  <Icon className={`w-6 h-6 ${config.iconColor}`} />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              <p className="text-sm text-zinc-600 leading-6">{message}</p>
            </div>

            <div className="px-6 pb-6">
              {actions && actions.length > 0 ? (
                <div className="flex gap-3">
                  {actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className={`flex-1 py-3 rounded-2xl font-bold transition-colors ${
                        action.variant === "secondary"
                          ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          : config.button
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
                  className={`w-full py-3 rounded-2xl font-bold transition-colors ${config.button}`}
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
