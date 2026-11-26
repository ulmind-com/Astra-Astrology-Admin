"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { playNavFeedback } from "@/lib/sound";
import { useTheme } from "@/providers/theme-provider";

/**
 * Sliding day / night switch for the top-right of the panel header.
 *
 * A pill-shaped track whose knob slides between a sun (light) and a moon
 * (dark), with the whole surface and glow changing to match. Flipping it
 * toggles the panel-wide theme.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => {
        playNavFeedback();
        toggleTheme();
      }}
      className={cn(
        "relative inline-flex h-11 w-[72px] shrink-0 cursor-pointer items-center rounded-full border p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f39419]",
        isDark
          ? "border-amber-500/30 bg-gradient-to-r from-[#2a1d24] to-[#141113] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
          : "border-amber-200/80 bg-gradient-to-r from-[#feecdf] to-[#fcd9bf] shadow-[inset_0_1px_3px_rgba(217,119,6,0.15)]",
        className
      )}
    >
      {/* Static icons behind the knob, so the fading ones hint the two states */}
      <Sun
        className={cn(
          "absolute left-2.5 size-4 transition-opacity duration-300",
          isDark ? "text-amber-400/50 opacity-60" : "opacity-0"
        )}
      />
      <Moon
        className={cn(
          "absolute right-2.5 size-4 transition-opacity duration-300",
          isDark ? "opacity-0" : "text-amber-700/50 opacity-60"
        )}
      />

      {/* Sliding knob */}
      <span
        className={cn(
          "relative z-10 flex size-9 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "translate-x-[28px] bg-gradient-to-br from-[#3d2f36] to-[#1d1a1c] border border-amber-500/20"
            : "translate-x-0 bg-gradient-to-br from-white to-[#fff8f3] shadow-md border border-amber-900/5"
        )}
      >
        {isDark ? (
          <Moon className="size-4 text-amber-300" />
        ) : (
          <Sun className="size-4 text-[#d97b0b]" />
        )}
      </span>
    </button>
  );
}
