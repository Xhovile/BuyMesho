import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  GRAPHIC_SERVICES,
  formatMoney,
} from "./config";

export function PayChanguLogo() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label="PayChangu">
      <img
        src="/paychangu-logo.png"
        alt=""
        className="h-5 w-5 shrink-0 rounded-[5px] object-contain"
        width={20}
        height={20}
        aria-hidden="true"
      />
      <span className="text-sm font-black tracking-tight text-[#159fda]">PayChangu</span>
    </span>
  );
}

export function StudioBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 280);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      title="Back to top"
      className="group fixed bottom-5 right-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#168cff] via-[#8f1528] to-[#ff1d25] p-[1px] shadow-[0_10px_30px_rgba(15,15,15,0.22)] transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
    >
      <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#8f1528] transition group-hover:bg-[#fffaf5]">
        <ArrowUp className="h-5 w-5" />
      </span>
    </button>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f6f1ea] px-3 py-5 text-zinc-900 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-2xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="w-full">{children}</div>
      </div>
      <StudioBackToTop />
    </main>
  );
}

export function ServiceChoice({
  active,
  color,
  icon,
  title,
  mobileTitle,
  onClick,
}: {
  active: boolean;
  color: "blue" | "red" | "split";
  icon: ReactNode;
  title: string;
  mobileTitle: string;
  onClick: () => void;
}) {
  const activeClass =
    color === "blue"
      ? "border-[#168cff] bg-[#eef8ff] shadow-[0_0_0_1px_rgba(22,140,255,0.10),0_8px_22px_rgba(22,140,255,0.10)]"
      : color === "red"
        ? "border-[#ff1d25] bg-[#fff1f1] shadow-[0_0_0_1px_rgba(255,29,37,0.10),0_8px_22px_rgba(255,29,37,0.10)]"
        : "border-[#8f1528] bg-gradient-to-r from-[#eef8ff] to-[#fff1f1] shadow-[0_0_0_1px_rgba(143,21,40,0.10),0_8px_22px_rgba(143,21,40,0.08)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[66px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-2 text-center transition sm:min-h-[72px] sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:text-left ${
        active
          ? activeClass
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <span
        className={`rounded-xl p-2.5 sm:p-2 ${
          active
            ? color === "blue"
              ? "bg-[#168cff]/10 text-[#168cff]"
              : color === "red"
                ? "bg-[#ff1d25]/10 text-[#ff1d25]"
                : "bg-[#8f1528]/10 text-[#8f1528]"
            : "bg-zinc-100 text-zinc-500"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 max-w-full">
        <span className="block truncate text-[11px] font-black leading-4 text-zinc-900 sm:hidden">{mobileTitle}</span>
        <span className="hidden truncate text-sm font-black leading-5 text-zinc-900 sm:block">{title}</span>
        <span className="hidden text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:block">
          {active ? "Selected" : "Choose"}
        </span>
      </span>
      <span className="hidden h-4 w-4 shrink-0 rounded-full border border-zinc-300 p-0.5 sm:block">
        <span className={`block h-full w-full rounded-full ${active ? "bg-[#8f1528]" : "bg-transparent"}`} />
      </span>
    </button>
  );
}

export function ChoiceButton({
  active,
  title,
  subtitle,
  onClick,
  accent = "neutral",
}: {
  active: boolean;
  title: string;
  subtitle?: string;
  onClick: () => void;
  accent?: "neutral" | "blue" | "red";
}) {
  const activeClass =
    accent === "blue"
      ? "border-[#168cff] bg-[#eef8ff] text-zinc-950"
      : accent === "red"
        ? "border-[#ff1d25] bg-[#fff1f1] text-zinc-950"
        : "border-[#8f1528]/30 bg-[#f8f3ef] text-zinc-950";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? activeClass
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <span className="block text-xs font-black text-zinc-900">{title}</span>
      {subtitle ? <span className="mt-0.5 block text-[10px] text-zinc-500">{subtitle}</span> : null}
    </button>
  );
}

export function GraphicServicePicker({
  value,
  onChange,
  accent = "blue",
}: {
  value: string;
  onChange: (value: string) => void;
  accent?: "blue" | "red";
}) {
  const [open, setOpen] = useState(false);
  const selected = GRAPHIC_SERVICES.find((item) => item.id === value);
  const label = value === "custom" ? "Custom / multiple" : selected?.label ?? "Choose a service";
  const price = value === "custom" ? "Agreed price" : selected ? formatMoney(selected.price) : "";

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const borderClass = accent === "blue" ? "focus-within:border-[#168cff]" : "focus-within:border-[#ff1d25]";
  const highlightClass = accent === "blue" ? "bg-[#eef8ff] text-zinc-950" : "bg-[#fff1f1] text-zinc-950";

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left outline-none transition ${borderClass}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-zinc-900">{label}</span>
          <span className="mt-0.5 block text-[10px] text-zinc-500">{price}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close graphic service menu"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-64 overflow-auto rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(30,25,20,0.18)]"
          >
            {GRAPHIC_SERVICES.map((item) => {
              const active = item.id === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    active ? highlightClass : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
                  }`}
                >
                  <span className="truncate text-sm">{item.label}</span>
                  <span className="shrink-0 text-[11px] font-bold text-zinc-500">{formatMoney(item.price)}</span>
                </button>
              );
            })}
            <button
              type="button"
              role="option"
              aria-selected={value === "custom"}
              onClick={() => {
                onChange("custom");
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                value === "custom" ? highlightClass : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
              }`}
            >
              <span className="truncate text-sm">Custom / multiple</span>
              <span className="shrink-0 text-[11px] font-bold text-zinc-500">Agreed price</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function StudioCheckoutButton({
  disabled,
  submitting,
  amount,
  accentClass,
  onClick,
}: {
  disabled: boolean;
  submitting: boolean;
  amount: number;
  accentClass: string;
  onClick: () => void;
}) {
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    const updatePosition = () => {
      const documentHeight = document.documentElement.scrollHeight;
      const distanceToBottom = documentHeight - (window.scrollY + window.innerHeight);
      const hasScrollableContent = documentHeight > window.innerHeight + 80;
      setFloating(hasScrollableContent && distanceToBottom > 96);
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-black text-white shadow-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-35 ${accentClass}`}
    >
      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      {submitting ? "Opening PayChangu…" : `Continue to Pay ${formatMoney(amount)}`}
      {!submitting ? <ChevronRight className="h-5 w-5 shrink-0" /> : null}
    </button>
  );

  return (
    <div className="relative h-12">
      {floating ? (
        <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[100] mx-auto w-auto max-w-2xl sm:bottom-5 sm:w-[calc(100%-3rem)]">
          <div className="pointer-events-auto rounded-[15px] border border-black bg-white/95 p-1.5 shadow-[0_12px_35px_rgba(30,25,20,0.18)] backdrop-blur-md">
            {button}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0">{button}</div>
      )}
    </div>
  );
}

