import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ShowToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  duration?: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  showToast: (options: ShowToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => string;
    error: (message: string, title?: string, duration?: number) => string;
    info: (message: string, title?: string, duration?: number) => string;
    warning: (message: string, title?: string, duration?: number) => string;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalShowToast: ((options: ShowToastOptions) => string) | null = null;

/**
 * Global helper for invoking toasts outside of React components.
 */
export const notify = {
  show: (options: ShowToastOptions) => globalShowToast?.(options) ?? "",
  success: (message: string, title?: string, duration?: number) =>
    globalShowToast?.({ message, title, type: "success", duration }) ?? "",
  error: (message: string, title?: string, duration?: number) =>
    globalShowToast?.({ message, title, type: "error", duration }) ?? "",
  info: (message: string, title?: string, duration?: number) =>
    globalShowToast?.({ message, title, type: "info", duration }) ?? "",
  warning: (message: string, title?: string, duration?: number) =>
    globalShowToast?.({ message, title, type: "warning", duration }) ?? "",
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({ message, title, type = "info", duration = 4000 }: ShowToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: Toast = { id, message, title, type, duration };

      setToasts((prev) => {
        // Keep max 5 toasts on screen
        const updated = [...prev, newToast];
        if (updated.length > 5) {
          return updated.slice(updated.length - 5);
        }
        return updated;
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  // Register global fallback emitter
  React.useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  const toastHelpers = useMemo(
    () => ({
      success: (message: string, title?: string, duration?: number) =>
        showToast({ message, title, type: "success", duration }),
      error: (message: string, title?: string, duration?: number) =>
        showToast({ message, title, type: "error", duration }),
      info: (message: string, title?: string, duration?: number) =>
        showToast({ message, title, type: "info", duration }),
      warning: (message: string, title?: string, duration?: number) =>
        showToast({ message, title, type: "warning", duration }),
    }),
    [showToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      clearToasts,
      toast: toastHelpers,
    }),
    [toasts, showToast, removeToast, clearToasts, toastHelpers]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 top-3 z-[9999] flex flex-col items-center gap-2 px-4 sm:top-5 sm:items-end sm:px-6"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const getStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-emerald-900/95 text-white border-emerald-700/80 shadow-emerald-950/20",
          iconBg: "bg-emerald-800 text-emerald-200",
          icon: CheckCircle2,
          defaultTitle: "Success",
        };
      case "error":
        return {
          bg: "bg-rose-900/95 text-white border-rose-700/80 shadow-rose-950/20",
          iconBg: "bg-rose-800 text-rose-200",
          icon: AlertCircle,
          defaultTitle: "Error",
        };
      case "warning":
        return {
          bg: "bg-amber-900/95 text-white border-amber-700/80 shadow-amber-950/20",
          iconBg: "bg-amber-800 text-amber-200",
          icon: AlertTriangle,
          defaultTitle: "Warning",
        };
      case "info":
      default:
        return {
          bg: "bg-zinc-900/95 text-white border-zinc-700/80 shadow-zinc-950/20",
          iconBg: "bg-zinc-800 text-zinc-300",
          icon: Info,
          defaultTitle: "Notice",
        };
    }
  };

  const style = getStyle(toast.type);
  const IconComponent = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border p-3.5 shadow-xl backdrop-blur-md ${style.bg}`}
    >
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}
      >
        <IconComponent className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        {toast.title ? (
          <h4 className="text-xs font-black uppercase tracking-wider text-white/90">
            {toast.title}
          </h4>
        ) : null}
        <p className="text-xs font-medium leading-relaxed text-white/95 break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
