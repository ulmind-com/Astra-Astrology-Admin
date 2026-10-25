"use client";

import * as React from "react";

/**
 * Light / dark theme for the whole admin panel.
 *
 * The visual system is a warm, bright light surface by default. Dark mode is a
 * full inversion driven by a single `dark` class on <html>: the semantic CSS
 * variables flip in globals.css, and the hardcoded slate / white utilities the
 * app uses everywhere are remapped there under `html.dark`.
 *
 * The chosen theme is remembered in localStorage so it survives reloads, and a
 * tiny inline script in the root layout applies it before first paint to avoid
 * a flash of the wrong theme.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "astra_theme";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start from whatever the no-flash script already put on <html>; fall back to
  // light on the server / first render so markup is stable.
  const [theme, setThemeState] = React.useState<Theme>("light");

  React.useEffect(() => {
    let initial: Theme = "light";
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "dark" || saved === "light") {
        initial = saved;
      } else if (document.documentElement.classList.contains("dark")) {
        initial = "dark";
      }
    } catch {
      // ignore — storage can be blocked
    }
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = React.useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
