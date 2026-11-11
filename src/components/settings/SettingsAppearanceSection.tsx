import { Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";
import type { ThemePreference } from "../../theme/theme";

const optionBase =
  "flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl border px-3 py-4 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bm-focus";

export default function SettingsAppearanceSection() {
  const { preference, resolvedTheme, setPreference } = useTheme();

  const selectedClass = "border-bm-brand bg-bm-brand/5 text-bm-brand shadow-sm";
  const idleClass =
    "border-bm-border bg-bm-surface text-bm-text-muted hover:border-bm-brand/40 hover:bg-bm-surface-muted";

  const choose = (nextPreference: ThemePreference) => {
    setPreference(nextPreference);
  };

  return (
    <section
      className="overflow-hidden rounded-3xl border border-bm-border bg-bm-surface shadow-sm"
      aria-labelledby="settings-appearance-title"
    >
      <div className="flex items-center gap-3 border-b border-bm-border-subtle px-5 py-4">
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

      <div className="space-y-4 px-5 py-5">
        <div role="radiogroup" aria-label="Theme preference" className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            role="radio"
            aria-checked={preference === "light"}
            aria-pressed={preference === "light"}
            onClick={() => choose("light")}
            className={`${optionBase} ${preference === "light" ? selectedClass : idleClass}`}
          >
            <Sun className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-extrabold">Light</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={preference === "dark"}
            aria-pressed={preference === "dark"}
            onClick={() => choose("dark")}
            className={`${optionBase} ${preference === "dark" ? selectedClass : idleClass}`}
          >
            <Moon className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-extrabold">Dark</span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={preference === "system"}
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
  );
}
