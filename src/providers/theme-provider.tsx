"use client";

import * as React from "react";

/**
 * Astra has one theme — warm, bright and light. There is no dark mode to
 * switch to, so this only clears any `dark` class an older build of the app
 * may have left on the document, and tells the browser which scheme the page
 * actually is so form controls and scrollbars match.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  }, []);

  return <>{children}</>;
}
