"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, themeStore } from "./browser-store";

export function ThemeToggle() {
  const stored = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
  // "system" renders the light icon on the server; the inline bootstrap script has
  // already set the real theme on <html> before this ever paints.
  const isDark = stored === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        themeStore.write(next);
        applyTheme(next);
      }}
      aria-label="切换深浅色主题"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
