"use client";

import * as React from "react";

/**
 * Astra has one theme — the night sky. There is no light mode to switch to,
 * so this only guarantees the `dark` class is on <html> for the component
 * styles that key off it, including after a client-side navigation or a
 * browser extension that rewrites the attribute.
 *
 * The class is already rendered server-side in the root layout, so the first
 * paint is dark too and the page never flashes white.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }, []);

  return <>{children}</>;
}
