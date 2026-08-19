"use client";

import { Moon, Sun } from "lucide-react";
import { applyTheme } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";

/** Switches between the dark default and the frosted-glass light theme.
 * Shows the icon of the mode it will switch *to*, which is the convention
 * users read fastest on a single-button toggle. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface text-ink transition hover:bg-surface-2 ${className}`}
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
