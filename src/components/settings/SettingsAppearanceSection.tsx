import { useEffect } from "react";
import { Monitor, Moon, Palette, Sun, X } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemePreference } from "../../theme/theme";

const optionBase =
  "flex min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bm-focus";

type SettingsAppearanceSectionProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsAppearanceSection({
  open,
  onClose,
}: SettingsAppearanceSectionProps) {
  const { preference, resolvedTheme, setPreference } = useTheme();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const selectedClass = "border-bm-brand bg-bm-brand/5 text-bm-brand shadow-sm";
  const idleClass =
    "border-bm-border bg-bm-surface text-bm-text-muted hover:border-bm-brand/40 hover:bg-bm-surface-muted";

  const choose = (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-bm-overlay/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-appearance-title"
        className="w-full max-w-sm overflow-hidden rounded-3xl border border-bm-border bg-bm-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-bm-border-subtle px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-bm-surface-muted">
              <Palette className="h-5 w-5 text-bm-text-muted" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="settings-appearance-title"
                className="text-sm font-extrabold uppercase tracking-[0.14em] text-bm-text"
              >
                Appearance
              </h2>
              <p className="mt-0.5 text-xs text-bm-text-subtle">
                Choose how BuyMesho looks on this device.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close theme settings"
            className="shrink-0 rounded-full p-2 text-bm-text-subtle transition-colors hover:bg-bm-surface-muted hover:text-bm-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div role="group" aria-label="Theme preference" className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-pressed={preference === "light"}
              onClick={() => choose("light")}
              className={`${optionBase} ${preference === "light" ? selectedClass : idleClass}`}
            >
              <Sun className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-extrabold">Light</span>
            </button>

            <button
              type="button"
              aria-pressed={preference === "dark"}
              onClick={() => choose("dark")}
              className={`${optionBase} ${preference === "dark" ? selectedClass : idleClass}`}
            >
              <Moon className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-extrabold">Dark</span>
            </button>

            <button
              type="button"
              aria-pressed={preference === "system"}
              onClick={() => choose("system")}
              className={`${optionBase} ${preference === "system" ? selectedClass : idleClass}`}
            >
              <Monitor className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-extrabold">System</span>
            </button>
          </div>

          <p className="text-xs leading-5 text-bm-text-subtle" aria-live="polite">
            {preference === "system"
              ? `System preference is active. BuyMesho is currently using the ${resolvedTheme} appearance and will follow your device setting.`
              : `Your ${preference} appearance is selected and will be remembered on this device.`}
          </p>
        </div>
      </section>
    </div>
  );
}
