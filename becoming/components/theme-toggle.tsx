"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Theme is unknowable until hydration; render a stable placeholder first.
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? (isDark ? "Switch to light" : "Switch to dark") : "Switch theme"}
      className="grid size-9 place-items-center rounded-control border border-haze text-ink-soft transition-colors hover:text-ink"
    >
      {mounted && isDark ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
