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
        "relative inline-flex h-11 w-[72px] shrink-0 cursor-pointer items-center rounded-full border p-1 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B]",
        isDark
          ? "border-slate-700 bg-gradient-to-r from-[#1E293B] to-[#0F172A] shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]"
          : "border-slate-200 bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] shadow-[inset_0_1px_3px_rgba(217,119,6,0.15)]",
        className
      )}
    >
      {/* Static icons behind the knob, so the fading ones hint the two states */}
      <Sun
        className={cn(
          "absolute left-2.5 size-4 transition-opacity duration-300",
          isDark ? "text-amber-500/40 opacity-60" : "opacity-0"
        )}
      />
      <Moon
        className={cn(
          "absolute right-2.5 size-4 transition-opacity duration-300",
          isDark ? "opacity-0" : "text-slate-400/50 opacity-60"
        )}
      />

      {/* Sliding knob */}
      <span
        className={cn(
          "relative z-10 flex size-9 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "translate-x-[28px] bg-gradient-to-br from-[#334155] to-[#0F172A]"
            : "translate-x-0 bg-gradient-to-br from-white to-[#FEF9E7]"
        )}
      >
        {isDark ? (
          <Moon className="size-4 text-amber-200" />
        ) : (
          <Sun className="size-4 text-[#D97706]" />
        )}
      </span>
    </button>
  );
}
