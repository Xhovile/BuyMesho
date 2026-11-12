import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../theme/ThemeProvider";

type HeaderThemeToggleProps = {
  menuItem?: boolean;
};

export default function HeaderThemeToggle({ menuItem = false }: HeaderThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const Icon = resolvedTheme === "dark" ? Moon : Sun;

  return (
    <button
      type="button"
      role={menuItem ? "menuitem" : undefined}
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-bm-border bg-bm-surface text-bm-text-muted shadow-sm transition-colors hover:bg-bm-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bm-focus"
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  );
}
